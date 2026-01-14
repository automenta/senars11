/**
 * Formatter.js
 * Handles pretty-printing of MeTTa atoms to match Hyperon REPL output.
 */

import { isList, flattenList, isExpression } from './Term.js';

export class Formatter {
    static toHyperonString(atom) {
        if (!atom) return 'null';

        // 1. Handle Lists: (: ... ... ()) -> ( ... )
        // We only format *proper* lists as S-expressions because improper lists like (: A B)
        // are ambiguously printed as (A B) vs (A . B) if we aren't careful.
        // For now, if it terminates in (), we format as list.
        if (isListDeep(atom)) {
            const { elements, tail } = flattenList(atom);
            if (tail.name === '()') {
                return `(${elements.map(Formatter.toHyperonString).join(' ')})`;
            }
            // Improper list? Fallback to standard expression print or implementing dot notation later
            // For now, let's fall back to expression printing to be safe/explicit: (: A B)
        }

        // 2. Handle Expressions: (op arg1 ...)
        if (isExpression(atom)) {
            const op = Formatter.toHyperonString(atom.operator);
            const comps = atom.components.map(Formatter.toHyperonString).join(' ');
            return `(${op}${comps ? ' ' + comps : ''})`;
        }

        // 3. Handle Atoms/Variables
        return atom.toString();
    }

    static formatResult(results) {
        // Results from superpose/nd-reduce are arrays of atoms
        return Array.isArray(results)
            ? `[${results.map(Formatter.toHyperonString).join(', ')}]`
            : Formatter.toHyperonString(results);
    }
}

// Helper to check if it's a list structure we want to pretty print
// We want to pretty print (: ...) but only if it eventually ends in ()
const isListDeep = (atom) => isList(atom);
