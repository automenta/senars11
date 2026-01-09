import { MeTTaTestUtils } from '../../helpers/MeTTaTestUtils.js';
import { SeNARSBridge } from '../../../core/src/metta/SeNARSBridge.js';

describe('MeTTa Integration Tests', () => {
    let interpreter, termFactory;

    beforeEach(() => {
        termFactory = MeTTaTestUtils.createTermFactory();
        interpreter = MeTTaTestUtils.createInterpreter({ termFactory });
    });

    describe('End-to-End Execution', () => {
        test('loads and evaluates complete programs', () => {
            const program = `
                (= (add $x $y) (+ $x $y))
                (= (double $x) (* $x 2))
                !(double (add 5 3))
            `;

            const results = interpreter.run(program);
            expect(results).toHaveLength(1);
        });

        test('pattern matching with multiple rules', () => {
            const program = `
                (= (human Socrates) True)
                (= (human Plato) True)
                (= (mortal $x) (human $x))
            `;

            // Query for humans to match original test logic
            const query = interpreter.loadAndQuery(program, '(= (human $x) True)', '$x');

            expect(query.length).toBeGreaterThan(0);
            const names = query.map(t => {
                if (!t) return 'undefined';
                return t.name;
            });
            expect(names).toContain('Socrates');
            expect(names).toContain('Plato');
        });

        test('macro expansion in real programs', () => {
            // ... setup ...
            // (keeping existing setup code)
            interpreter.macroExpander.defineMacro(
                'when',
                termFactory.predicate(
                    termFactory.atomic('when'),
                    termFactory.product(
                        termFactory.atomic('$cond'),
                        termFactory.atomic('$body')
                    )
                ),
                termFactory.predicate(
                    termFactory.atomic('if'),
                    termFactory.product(
                        termFactory.atomic('$cond'),
                        termFactory.atomic('$body'),
                        termFactory.atomic('Empty')
                    )
                )
            );

            const macroTerm = termFactory.predicate(
                termFactory.atomic('when'),
                termFactory.product(
                    termFactory.createTrue(),
                    termFactory.atomic('action')
                )
            );

            const expanded = interpreter.macroExpander.expand(macroTerm);

            // Expansion should change the term
            expect(expanded).toBeDefined();
            // Expanded term should be an 'if' predicate (functor)
            expect(expanded.operator).toBe('^');
            // Check the head is 'if'
            expect(expanded.components[0].name).toBe('if');
        });
    });

    describe('Interpreter Subsystems', () => {
        test('reduction with grounded atoms', () => {
            const sum = interpreter.groundedAtoms.execute('&+',
                termFactory.atomic('5'),
                termFactory.atomic('10')
            );

            expect(sum.name).toBe('15');
        });

        test('non-deterministic evaluation', () => {
            const superpos = interpreter.nonDeterminism.superpose(1, 2, 3, 4, 5);
            expect(interpreter.nonDeterminism.isSuperposition(superpos)).toBe(true);
            expect(superpos.values).toHaveLength(5);

            const collapsed = interpreter.nonDeterminism.collapse(superpos);
            expect([1, 2, 3, 4, 5]).toContain(collapsed);
        });

        test('state management across evaluations', () => {
            const stateId = interpreter.stateManager.newState(termFactory.atomic('initial'));
            expect(interpreter.stateManager.hasState(stateId)).toBe(true);

            interpreter.stateManager.changeState(stateId, termFactory.atomic('modified'));
            const value = interpreter.stateManager.getState(stateId);
            expect(value.name).toBe('modified');
        });

        test('type inference', () => {
            const numTerm = termFactory.atomic('42');
            const type = interpreter.typeSystem.inferType(numTerm);
            expect(type).toBe('Number');

            const varTerm = termFactory.atomic('$x');
            const varType = interpreter.typeSystem.inferType(varTerm);
            expect(varType).toBe('Variable');
        });
    });

    describe('SeNARS Bridge', () => {
        test('bidirectional conversion exists', () => {
            const bridge = new SeNARSBridge(null, interpreter, {}, null);
            expect(bridge).toBeDefined();
            expect(bridge.mettaToNars).toBeDefined();
            expect(bridge.narsToMetta).toBeDefined();
        });
    });

    describe('Complex Programs', () => {
        test('recursive definitions', () => {
            interpreter.load(`
                (= (factorial 0) 1)
                (= (factorial $n) (* $n (factorial (- $n 1))))
            `);

            // Check that rules are loaded
            expect(interpreter.space.getAtomCount()).toBeGreaterThan(0);
        });

        test('multiple pattern matches', () => {
            interpreter.load(`
                (= (fib 0) 0)
                (= (fib 1) 1)
                (= (fib $n) (+ (fib (- $n 1)) (fib (- $n 2))))
            `);

            expect(interpreter.space.getAtomCount()).toBe(3);
        });
    });

    describe('Statistics and Metrics', () => {
        test('comprehensive stats collection', () => {
            interpreter.load('(= (test) 42)');
            const stats = interpreter.getStats();

            expect(stats).toHaveProperty('space');
            expect(stats).toHaveProperty('macroExpander');
            expect(stats).toHaveProperty('reductionEngine');
            expect(stats).toHaveProperty('typeSystem');
            expect(stats).toHaveProperty('groundedAtoms');
            expect(stats).toHaveProperty('stateManager');
        });
    });
});
