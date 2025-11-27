/**
 * PrologParser.js - Parser that translates Prolog syntax into SeNARS beliefs/goals
 */

import {TermFactory} from '../term/TermFactory.js';
import {Task} from '../task/Task.js';
import {Truth} from '../Truth.js';

export class PrologParser {
    constructor(termFactory = null) {
        this.termFactory = termFactory || new TermFactory();
    }

    /**
     * Parse Prolog syntax and convert to SeNARS tasks (beliefs/goals)
     */
    parseProlog(prologInput) {
        return prologInput
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('%'))
            .flatMap(line => this._parseLine(line));
    }

    _parseLine(line) {
        const parsers = [
            { predicate: this._isRule, parser: this._parseRule.bind(this) },
            { predicate: this._isFact, parser: (l) => [this._parseFact(l)] },
            { predicate: this._isQuery, parser: (l) => [this._parseQuery(l)] }
        ];

        const matchingParser = parsers.find(({ predicate }) => predicate(line));
        return matchingParser ? matchingParser.parser(line) : [];
    }

    _isFact = (line) => line.endsWith('.') && !line.includes(':-');
    _isRule = (line) => line.includes(':-');
    _isQuery = (line) => line.endsWith('?');

    /**
     * Parse a Prolog fact: predicate(args).
     * Translates to: <predicate(args) --> True>. %1.0;0.9%
     */
    _parseFact(factLine) {
        const fact = factLine.replace(/\.$/, '').trim();
        const relationTerm = this._parsePredicate(fact);

        return new Task({
            term: relationTerm,
            punctuation: '.',
            truth: new Truth(1.0, 0.9),
            budget: {priority: 0.8, durability: 0.7, quality: 0.8}
        });
    }

    /**
     * Parse a Prolog rule: head :- body.
     * Translates to conditional statements in NARS format
     */
    _parseRule(ruleLine) {
        const rule = ruleLine.replace(/\.$/, '').trim();
        const parts = rule.split(':-');

        if (parts.length !== 2) throw new Error(`Invalid rule format: ${ruleLine}`);

        const [headStr, bodyStr] = parts;

        const headTerm = this._parsePredicate(headStr.trim());
        const bodyParts = this._splitByCommaRespectingParens(bodyStr.trim());
        const bodyTerms = bodyParts.map(part => this._parsePredicate(part));

        const bodyTerm = bodyTerms.length === 1 ? bodyTerms[0] : this.termFactory.create({
            operator: '&/',
            components: bodyTerms,
        });

        const implicationTerm = this.termFactory.create({
            operator: '==>',
            components: [bodyTerm, headTerm],
        });

        return [new Task({
            term: implicationTerm,
            punctuation: '.',
            truth: new Truth(1.0, 0.9),
        })];
    }

    /**
     * Parse a Prolog query: predicate(args) ?
     * Translates to a question in SeNARS
     */
    _parseQuery(queryLine) {
        const query = queryLine.replace(/\s*\?$/, '').trim();
        const queryTerm = this._parsePredicate(query);

        return new Task({
            term: queryTerm,
            punctuation: '?'
        });
    }

    /**
     * Parses a predicate string like `predicate(arg1, arg2)` into a SeNARS term.
     */
    _parsePredicate(predicateStr) {
        const predicate = predicateStr.trim();

        const match = predicate.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*(.*)\s*\)$/);
        if (!match) throw new Error(`Invalid predicate format: ${predicateStr}`);

        const [_, pred, argsStr] = match;
        const args = this._splitByCommaRespectingParens(argsStr);

        return this._createPredicateTerm(pred, args);
    }

    /**
     * Helper method to create predicate term structure from arguments
     */
    _createPredicateTerm(predicate, args) {
        const argTerms = args.map(arg => {
            const isVariable = arg.startsWith('_') || /^[A-Z]/.test(arg);
            return this.termFactory.create({
                name: isVariable ? `?${arg.toLowerCase()}` : arg.toLowerCase(),
                type: isVariable ? 'variable' : 'atomic'
            });
        });

        const argsTerm = this.termFactory.create({
            operator: ',',
            components: argTerms
        });

        const predicateTerm = this.termFactory.create({name: predicate, type: 'atomic'});

        return this.termFactory.create({
            operator: '^',
            components: [predicateTerm, argsTerm]
        });
    }

    /**
     * Split string by commas, respecting nested parentheses and quotes.
     */
    _splitByCommaRespectingParens(str) {
        if (!str) return [];
        const parts = [];
        let current = '';
        let depth = 0;
        let inQuote = false;
        let quoteChar = null;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            if (inQuote) {
                current += char;
                if (char === quoteChar && str[i - 1] !== '\\') {
                    inQuote = false;
                    quoteChar = null;
                }
                continue;
            }

            if (char === '"' || char === "'") {
                inQuote = true;
                quoteChar = char;
            }

            if (char === '(') depth++;
            else if (char === ')') depth--;

            if (char === ',' && depth === 0) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        if (current.trim()) parts.push(current.trim());
        return parts;
    }
}

/**
 * Convenience function to parse Prolog and return SeNARS tasks
 */
export function parsePrologToNars(prologString, termFactory = null) {
    const parser = new PrologParser(termFactory);
    return parser.parseProlog(prologString);
}
