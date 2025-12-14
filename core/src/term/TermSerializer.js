export class TermSerializer {
    constructor(config = {}) {
        this.config = config;
    }

    stringify(term, options = {}) {
        if (!term) return '';
        if (term.isAtomic) return term.name;

        const op = term.operator;

        // Handle Sets
        if (op === '[]' || op === 'SETi') return this.printSet(term, '[', ']');
        if (op === '{}' || op === 'SETe') return this.printSet(term, '{', '}');

        // Handle specialized operators
        if (op === '--' || op === 'NEG') return this.printNegation(term);
        if (op === 'Δ' || op === 'DELTA') return this.printDelta(term);

        // Handle statements
        if (this.isStatement(term)) {
             return this.printStatement(term);
        }

        // Handle general compounds
        return this.printCompound(term);
    }

    isStatement(term) {
        // Simple check if operator is typically infix statement
        const op = term.operator;
        return ['-->', '<->', '==>', '<=>', '<~>', '=/>', '=|', '=/=', '='].includes(op);
    }

    printStatement(term) {
        return `<${this.stringify(term.components[0])} ${term.operator} ${this.stringify(term.components[1])}>`;
    }

    printSet(term, open, close) {
        return `${open}${term.components.map(c => this.stringify(c)).join(', ')}${close}`;
    }

    printNegation(term) {
        const inner = term.components[0];
        // Standard Narsese --A
        return `--${this.stringify(inner)}`;
    }

    printDelta(term) {
        return `Δ${this.stringify(term.components[0])}`;
    }

    printCompound(term) {
        if (!term.operator) return this.printTuple(term);

        // Special case for product (*) which is sometimes infix? No, usually (*, A, B)
        // What about & and |?
        // (&, A, B) or (A & B)?
        // Narsese typically uses (&, ...) prefix form for compounds, except statements.
        // But (A & B) is also valid? Parser accepts `(A & B)`.
        // Let's stick to prefix for standard CompoundTerm unless it's a statement.

        return `(${term.operator}, ${term.components.map(c => this.stringify(c)).join(', ')})`;
    }

    printTuple(term) {
        return `(${term.components.map(c => this.stringify(c)).join(', ')})`;
    }
}
