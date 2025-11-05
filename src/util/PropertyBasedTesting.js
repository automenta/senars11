export class PropertyBasedTester {
    constructor(options = {}) {
        this.maxTests = options.maxTests || 100;
        this.seed = options.seed || Date.now();
        this.random = this._createRandomGenerator(this.seed);
        this.failures = [];
    }

    _createRandomGenerator(seed) {
        let state = seed;
        return () => {
            state = (state * 1664525 + 1013904223) % Math.pow(2, 32);
            return state / Math.pow(2, 32);
        };
    }

    generateTerm(depth = 0, maxDepth = 3) {
        const {Term} = require('../src/term/Term.js');
        const operators = ['-->', '<->', '==>', '<=>', '&', '|', '--'];

        if (depth >= maxDepth || (depth > 0 && this.random() < 0.3)) {
            const name = `term_${Math.floor(this.random() * 1000)}`;
            return new Term('atom', name);
        } else {
            const operator = operators[Math.floor(this.random() * operators.length)];
            const componentCount = operator === '--' ? 1 : 2;
            const components = [];

            for (let i = 0; i < componentCount; i++) {
                components.push(this.generateTerm(depth + 1, maxDepth));
            }

            const name = `(${components.map(c => c.name).join(` ${operator} `)})`;
            return new Term('compound', name, components, operator);
        }
    }

    generateTruth() {
        return {
            f: this.random(),
            c: this.random()
        };
    }

    check(property, generator, options = {}) {
        const maxTests = options.maxTests || this.maxTests;
        let successes = 0;
        
        for (let i = 0; i < maxTests; i++) {
            try {
                const input = generator(this.random);
                const result = property(input);
                
                if (!result) {
                    this.failures.push({
                        testNumber: i,
                        input,
                        property: property.name || 'anonymous'
                    });
                    return false;
                }
                successes++;
            } catch (error) {
                this.failures.push({
                    testNumber: i,
                    input,
                    error,
                    property: property.name || 'anonymous'
                });
                return false;
            }
        }
        
        return {
            passed: true,
            successes,
            total: maxTests,
            passRate: successes / maxTests
        };
    }

    checkImmutability(term) {
        const originalString = term.toString();
        const originalHash = term.hash;
        const originalComponents = term.components ? [...term.components] : null;

        try {
            term._name && (term._name = 'modified');
            if (term.name !== originalString) return false;
            if (term.hash !== originalHash) return false;

            if (originalComponents) {
                for (let i = 0; i < originalComponents.length; i++) {
                    if (term.components[i] !== originalComponents[i]) return false;
                }
            }

            return true;
        } catch (e) {
            return true;
        }
    }

    checkEqualityConsistency(terms) {
        const [t1, t2] = terms;
        if (!t1 || !t2) return false;

        const eq1 = t1.equals(t2);
        const eq2 = t2.equals(t1);

        if (eq1 !== eq2) return false;

        if (eq1 && t1.hash !== t2.hash) return false;

        return true;
    }

    checkTruthOperations(truthPair) {
        const [t1, t2] = truthPair;
        const {TruthFunctions} = require('../src/reasoning/nal/TruthFunctions.js');

        try {
            const deductionResult = TruthFunctions.deduction(t1, t2);
            const inductionResult = TruthFunctions.induction(t1, t2);
            const revisionResult = TruthFunctions.revision(t1, t2);

            const isValidTruth = (t) => t && typeof t === 'object' &&
                typeof t.frequency === 'number' &&
                typeof t.confidence === 'number' &&
                t.frequency >= 0 && t.frequency <= 1 &&
                t.confidence >= 0 && t.confidence <= 1;

            return isValidTruth(deductionResult) &&
                isValidTruth(inductionResult) &&
                isValidTruth(revisionResult);
        } catch (e) {
            return false;
        }
    }

    runTermPropertyTests() {
        const results = {
            immutability: null,
            equality: null,
            truthOperations: null
        };

        results.immutability = this.check(
            this.checkImmutability.bind(this),
            () => this.generateTerm(),
            {maxTests: 50}
        );

        results.equality = this.check(
            this.checkEqualityConsistency.bind(this),
            () => [this.generateTerm(), this.generateTerm()],
            {maxTests: 50}
        );

        results.truthOperations = this.check(
            this.checkTruthOperations.bind(this),
            () => [this.generateTruth(), this.generateTruth()],
            {maxTests: 50}
        );

        return results;
    }

    getFailureReport() {
        return {
            totalFailures: this.failures.length,
            failures: this.failures,
            hasFailures: this.failures.length > 0
        };
    }
}