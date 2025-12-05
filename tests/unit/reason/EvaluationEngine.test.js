import {EvaluationEngine} from '../../../core/src/reason/EvaluationEngine.js';
import {TermFactory} from '../../../core/src/term/TermFactory.js';

describe('EvaluationEngine', () => {
    let engine;
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
        engine = new EvaluationEngine(null, termFactory);
    });

    test('should evaluate basic arithmetic operations', () => {
        const term = {
            operator: '+',
            components: [{value: 2}, {value: 3}]
        };
        const result = engine.evaluate(term);
        expect(result).toBe(5);
    });

    test('should solve simple assignment', async () => {
        // Variable term will have name "?x"
        const left = termFactory.variable('x');
        const right = termFactory.atomic('5');
        // We must pass "?x" as the variable name to solve for
        const result = await engine.solveEquation(left, right, '?x');

        expect(result.success).toBe(true);
        expect(result.result).toBe(right);
    });

    test('should solve linear equation (mocked)', async () => {
        // (?x + 2) = 5
        const left = termFactory.create('+', [termFactory.variable('x'), termFactory.atomic('2')]);
        const right = termFactory.atomic('5');

        const result = await engine.solveEquation(left, right, '?x');
        expect(result.success).toBe(true);
        expect(result.result.type).toBe('symbolic_solution');
    });

    test('should perform comparisons', () => {
        expect(engine._performGreaterThan(5, 3)).toBe(true);
        expect(engine._performLessThan(5, 3)).toBe(false);
    });
});
