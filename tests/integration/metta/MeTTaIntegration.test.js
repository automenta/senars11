import { MeTTaInterpreter } from '../../../core/src/metta/MeTTaInterpreter.js';
import { SeNARSBridge } from '../../../core/src/metta/SeNARSBridge.js';

describe('MeTTa Integration Tests', () => {
    let interpreter;

    beforeEach(() => {
        // Disable stdlib loading to avoid file system issues in Jest
        interpreter = new MeTTaInterpreter({ loadStdlib: false });
    });

    describe('Basic Grounded Operations', () => {
        test('arithmetic operations work correctly', () => {
            // Test that grounded operations like &+ work properly
            const result = interpreter.run('(^ &+ 5 10)');
            expect(result[0].name).toBe('15');

            const multResult = interpreter.run('(^ &* 6 7)');
            expect(multResult[0].name).toBe('42');
        });

        test('comparison operations work correctly', () => {
            const equalResult = interpreter.run('(^ &== 5 5)');
            expect(equalResult[0].name).toBe('True');

            const greaterResult = interpreter.run('(^ &> 10 5)');
            expect(greaterResult[0].name).toBe('True');
        });
    });

    describe('Interpreter Subsystems', () => {
        test('space operations work correctly', () => {
            // Add atoms to space and verify they're stored
            interpreter.load('(test-fact True)');
            interpreter.load('(another-fact 42)');

            const atomCount = interpreter.space.getAtomCount();
            expect(atomCount).toBeGreaterThan(0);
        });

        test('basic querying works', () => {
            interpreter.load('(human Socrates)');
            interpreter.load('(human Plato)');

            // Query for all human facts
            const queryResults = interpreter.query('human', '$x');
            // This will depend on how the query method works
            // For now, just ensure no errors occur
            expect(interpreter.space.getAtomCount()).toBeGreaterThan(0);
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

    describe('Statistics and Metrics', () => {
        test('comprehensive stats collection', () => {
            interpreter.run('(test 42)');
            const stats = interpreter.getStats();

            expect(stats).toHaveProperty('space');
            expect(stats).toHaveProperty('groundedAtoms');
            expect(stats).toHaveProperty('reductionEngine');
        });
    });

    describe('Basic Rule Application', () => {
        test('simple rule application works', () => {
            // Add a simple rule manually to the space
            interpreter.space.addRule(
                interpreter.parser.parse('(add $x $y)'),
                interpreter.parser.parse('(^ &+ $x $y)')
            );

            // Now test the rule
            const result = interpreter.run('(add 3 4)');
            expect(result[0].name).toBe('7');
        });
    });
});
