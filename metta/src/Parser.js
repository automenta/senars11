/**
 * Parser.js - String to Atom parser
 * Converts MeTTa source code strings to atom structures
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 */

import { sym, variable, exp } from './kernel/Term.js';

export class Parser {
    constructor() {
        this.tokenizer = new Tokenizer();
    }

    /**
     * Parse a single expression from a string
     */
    parse(str) {
        const tokens = this.tokenizer.tokenize(str);
        return tokens.length ? new InternalParser(tokens).parse() : null;
    }

    /**
     * Parse a program (sequence of expressions) from a string
     */
    parseProgram(str) {
        const tokens = this.tokenizer.tokenize(str);
        return new InternalParser(tokens).parseProgram();
    }

    /**
     * Legacy support for parsing expressions
     */
    parseExpression(str) {
        return this.parse(str);
    }
}

/**
 * Tokenizes input strings into tokens for parsing
 */
class Tokenizer {
    /**
     * Tokenize an input string
     */
    tokenize(str) {
        const tokens = [];
        let current = '';
        let inString = false;
        let quoteChar = null;
        let inComment = false;

        const push = () => {
            const trimmed = current.trim();
            if (trimmed) tokens.push(trimmed);
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

            switch (char) {
                case '"':
                case "'":
                    push();
                    inString = true;
                    quoteChar = char;
                    current += char;
                    break;

                case ';':
                    push();
                    inComment = true;
                    break;

                case '(':
                case ')':
                    push();
                    tokens.push(char);
                    break;

                default:
                    if (/\s/.test(char)) {
                        push();
                    } else {
                        current += char;
                    }
            }
        }

        push();
        return tokens;
    }
}

/**
 * Internal parser that handles the actual parsing logic
 */
class InternalParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    /**
     * Check if parsing is finished
     */
    get finished() {
        return this.pos >= this.tokens.length;
    }

    /**
     * Peek at the current token without consuming it
     */
    peek() {
        return this.tokens[this.pos];
    }

    /**
     * Consume the current token and advance position
     */
    consume() {
        return this.tokens[this.pos++];
    }

    /**
     * Parse a single atom or expression
     */
    parse() {
        if (this.finished) throw new Error("Unexpected end of input");

        const token = this.peek();
        if (token === '(') return this.parseExpression();

        this.consume();
        // Support both $ and ? variables
        return token.startsWith('$') || token.startsWith('?') ? variable(token) : sym(token);
    }

    /**
     * Parse an expression (list of atoms enclosed in parentheses)
     */
    parseExpression() {
        if (this.consume() !== '(') throw new Error("Expected '(' at start of expression");

        if (!this.finished && this.peek() === ')') {
            this.consume();
            return sym('()');
        }

        const components = [];
        while (!this.finished && this.peek() !== ')') {
            try {
                components.push(this.parse());
            } catch (error) {
                throw new Error(`Error parsing expression component: ${error.message}`);
            }
        }

        if (this.finished) throw new Error("Unexpected end of input, expected ')'");

        this.consume(); // Skip ')'

        return components.length > 0 ? exp(components[0], components.slice(1)) : sym('()');
    }

    /**
     * Parse a program (sequence of expressions)
     */
    parseProgram() {
        const expressions = [];
        while (!this.finished) {
            try {
                const token = this.peek();
                // Basic validity check
                if (token === '(' || /^[?$].+/.test(token) || token.length > 0) {
                    expressions.push(this.parse());
                } else {
                    this.consume();
                }
            } catch (error) {
                // Skip invalid tokens and continue parsing
                console.warn(`Skipping invalid token: ${this.peek()}, Error: ${error.message}`);
                this.consume();
            }
        }
        return expressions;
    }
}
