import {PatternNALRule} from './PatternNALRule.js';
import {Term} from '../../term/Term.js';
import {Truth} from '../../Truth.js';

export class ExtendedNALRule extends PatternNALRule {
    constructor(name, config) {
        super(name, config || {
            name: 'Extended NAL Rule',
            description: 'Implements extended NAL reasoning patterns',
            priority: 0.5,
            category: 'extended'
        });

        this.ruleType = config?.ruleType || 'general';
    }

    _matches(task, context) {
        return false;
    }

    async _apply(task, context) {
        return [];
    }

    _structuralEquivalence(term1, term2) {
        if (!term1 || !term2) return false;
        if (term1.operator !== term2.operator || 
            (term1.components?.length || 0) !== (term2.components?.length || 0) ||
            term1.name !== term2.name) return false;

        return !term1.components || term1.components.every((comp, i) =>
            this._structuralEquivalence(comp, term2.components[i]));
    }

    _calculateNALTruth(truth1, truth2, operation = 'intersection') {
        if (!truth1 && !truth2) return null;//new Truth(0.5, 0.5);
        if (!truth1) return truth2;
        if (!truth2) return truth1;

        // Truth calculation operations with shorthand notation
        const operations = {
            intersection: (t1, t2) => ({f: t1.frequency * t2.frequency, c: t1.confidence * t2.confidence}),
            union: (t1, t2) => ({
                f: t1.frequency + t2.frequency - (t1.frequency * t2.frequency),
                c: t1.confidence * t2.confidence
            }),
            difference: (t1, t2) => ({f: Math.max(0, t1.frequency - t2.frequency), c: t1.confidence * t2.confidence}),
            comparison: (t1, t2) => ({
                f: Math.min(t1.frequency, t2.frequency) / Math.max(t1.frequency, t2.frequency || 0.001),
                c: t1.confidence * t2.confidence
            }),
            default: (t1, t2) => ({f: (t1.frequency + t2.frequency) / 2, c: Math.min(t1.confidence, t2.confidence)})
        };

        const {f, c} = (operations[operation] || operations.default)(truth1, truth2);
        return new Truth(f, c);
    }

    _transformInheritance(term) {
        if (!term.isCompound || term.operator !== '-->') return null;

        const [subject, predicate] = term.components || [];
        if (!subject || !predicate) return null;

        return new Term('compound',
            `(--> ${predicate.name}, ${subject.name})`,
            [predicate, subject],
            '-->');
    }

    _transformImplication(term) {
        if (!term.isCompound || term.operator !== '==>') return null;

        const [antecedent, consequent] = term.components || [];
        if (!antecedent || !consequent) return null;

        return new Term('compound',
            `(==> (not ${consequent.name}), (not ${antecedent.name}))`,
            [new Term('compound', `(not ${consequent.name})`, [consequent], 'not'),
                new Term('compound', `(not ${antecedent.name})`, [antecedent], 'not')],
            '==>');
    }
    
    /**
     * Creates a derived task with adjusted truth and priority
     */
    _createDerivedTaskWithTruthAdjustment(originalTask, term, confidenceMultiplier = 1.0, priorityMultiplier = 1.0) {
        const derivedTruth = new Truth(
            originalTask.truth.frequency,
            originalTask.truth.confidence * confidenceMultiplier
        );
        
        return this._createDerivedTask(originalTask, {
            term,
            truth: derivedTruth,
            type: originalTask.type,
            priority: originalTask.priority * this.priority * priorityMultiplier
        });
    }
}

export class ConversionRule extends ExtendedNALRule {
    constructor() {
        super('conversion', {
            name: 'Conversion Rule',
            description: 'Converts inheritance relationships: <S --> P> ⊣⊢ <P --> S>',
            priority: 0.3,
            category: 'extended'
        });
    }

    _matches(task, context) {
        const {term} = task || {};
        return term?.isCompound && term.operator === '-->' && term.components?.length === 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) return [];

        const [subject, predicate] = task.term.components;
        const convertedTerm = new Term('compound',
            `(--> ${predicate.name}, ${subject.name})`,
            [predicate, subject],
            '-->');

        // Create derived task with reduced confidence
        return [this._createDerivedTaskWithTruthAdjustment(task, convertedTerm, 0.8)];
    }
}

export class EquivalenceRule extends ExtendedNALRule {
    constructor() {
        super('equivalence', {
            name: 'Equivalence Rule',
            description: 'Handles equivalence relationships and their implications',
            priority: 0.7,
            category: 'extended'
        });
    }

    _matches(task, context) {
        const {term} = task || {};
        return term?.isCompound && term.operator === '<=>' && term.components?.length === 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) return [];

        const [left, right] = task.term.components;
        const truth = this._calculateNALTruth(task.truth, new Truth(1.0, 0.9), 'intersection');
        
        return [
            this._createDerivedTask(task, {
                term: new Term('compound', `(==> ${left.name}, ${right.name})`, [left, right], '==>'),
                truth,
                type: task.type,
                priority: task.priority * this.priority * 0.9
            }),
            this._createDerivedTask(task, {
                term: new Term('compound', `(==> ${right.name}, ${left.name})`, [right, left], '==>'),
                truth,
                type: task.type,
                priority: task.priority * this.priority * 0.9
            })
        ];
    }
}

export class NegationRule extends ExtendedNALRule {
    constructor() {
        super('negation', {
            name: 'Negation Rule',
            description: 'Handles negation operations in NAL',
            priority: 0.4,
            category: 'extended'
        });
    }

    _matches(task, context) {
        const {term} = task || {};
        return term?.isCompound && term.operator === '--' && term.components?.length >= 1;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) return [];

        const operand = task.term.components[0];

        // Handle double negation elimination
        if (operand.isCompound && operand.operator === '--' && operand.components?.length >= 1) {
            const doubleNegationTerm = operand.components[0];
            return [this._createDerivedTaskWithTruthAdjustment(task, doubleNegationTerm, 0.9)];
        }

        return [];
    }
}

export class ConjunctionRule extends ExtendedNALRule {
    constructor() {
        super('conjunction', {
            name: 'Conjunction Rule',
            description: 'Handles conjunction operations in NAL',
            priority: 0.6,
            category: 'extended'
        });
    }

    _matches(task, context) {
        const {term} = task || {};
        return term?.isCompound && term.operator === '&' && term.components?.length >= 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) return [];

        // Create derived tasks for each component with reduced confidence
        return task.term.components.map(component =>
            this._createDerivedTaskWithTruthAdjustment(task, component, 0.9, 0.8)
        );
    }
}

export class DisjunctionRule extends ExtendedNALRule {
    constructor() {
        super('disjunction', {
            name: 'Disjunction Rule',
            description: 'Handles disjunction operations in NAL',
            priority: 0.5,
            category: 'extended'
        });
    }

    _matches(task, context) {
        const {term} = task || {};
        return term?.isCompound && term.operator === '|' && term.components?.length >= 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) return [];
        return [];
    }
}

