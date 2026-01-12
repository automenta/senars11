/**
 * Parser.js - String to Atom parser
 * Converts MeTTa source code strings to atom structures
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import {sym, var_, exp} from './kernel/Term.js';

export class Parser {
    constructor() {
        this.tokenizer = new Tokenizer();
    }

    parse(str) {
        const tokens = this.tokenizer.tokenize(str);
        return tokens.length ? new InternalParser(tokens).parse() : null;
    }

    parseProgram(str) {
        const tokens = this.tokenizer.tokenize(str);
        return new InternalParser(tokens).parseProgram();
    }

    // Legacy support
    parseExpression(str) {
        return this.parse(str);
    }
}

class Tokenizer {
    tokenize(str) {
        const tokens = [];
        let current = '';
        let inString = false;
        let quoteChar = null;
        let inComment = false;

        const push = () => {
            if (current.trim()) tokens.push(current.trim());
            current = '';
        };

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            if (inComment) {
                if (char === '\n' || char === '\r') inComment = false;
                continue;
            }

            if (inString) {
                current += char;
                if (char === quoteChar) {
                    inString = false;
                    tokens.push(current);
                    current = '';
                    quoteChar = null;
                }
                continue;
            }

            if (char === '"' || char === "'") {
                push();
                inString = true;
                quoteChar = char;
                current += char;
                continue;
            }

            if (char === ';') {
                push();
                inComment = true;
                continue;
            }

            if (char === '(' || char === ')') {
                push();
                tokens.push(char);
                continue;
            }

            if (/\s/.test(char)) {
                push();
                continue;
            }

            current += char;
        }

        push();
        return tokens;
    }
}

class InternalParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    get finished() {
        return this.pos >= this.tokens.length;
    }

    peek() {
        return this.tokens[this.pos];
    }

    consume() {
        return this.tokens[this.pos++];
    }

    parse() {
        if (this.finished) return null;
        const token = this.peek();

        if (token === '(') return this.parseExpression();

        this.consume();
        // Support both $ and ? variables
        if (token.startsWith('$') || token.startsWith('?')) return var_(token);
        return sym(token);
    }

    parseExpression() {
        if (this.consume() !== '(') throw new Error("Expected '('");

        if (!this.finished && this.peek() === ')') {
            this.consume();
            return sym('()');
        }

        const components = [];
        while (!this.finished && this.peek() !== ')') {
            components.push(this.parse());
        }

        if (this.finished) throw new Error("Unexpected end of input, expected ')'");
        this.consume(); // Skip ')'

        return components.length > 0 ? exp(components[0], components.slice(1)) : sym('()');
    }

    parseProgram() {
        const expressions = [];
        while (!this.finished) {
            const token = this.peek();
            // Basic validity check
            if (token === '(' || /^[?$].+/.test(token) || token.length > 0) {
                expressions.push(this.parse());
            } else {
                this.consume();
            }
        }
        return expressions;
    }
}
