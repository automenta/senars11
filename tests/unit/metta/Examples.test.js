
import { MeTTaInterpreter } from '../../../core/src/metta/MeTTaInterpreter.js';
import { TermFactory } from '../../../core/src/term/TermFactory.js';
import { Term } from '../../../core/src/metta/kernel/Term.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stdlibDir = path.resolve(__dirname, '../../../core/src/metta/stdlib');

describe('Examples to Unit Tests Promotion', () => {
    let interpreter;

    beforeEach(() => {
        Term.clearSymbolTable();
        interpreter = new MeTTaInterpreter(null, {
            termFactory: new TermFactory(),
            typeChecking: false,
            maxReductionSteps: 50000,
            loadStdlib: true, // Auto-load stdlib which should include basic ops
            stdlibDir: stdlibDir,
            modules: ['core', 'list', 'match', 'types', 'truth', 'nal'] // Specifically load these
        });
    });

    describe('functions.metta (Functional Programming)', () => {
        it('should handle basic lambda', () => {
            const program = `!((λ $x (* $x 2)) 5)`;
            const result = interpreter.run(program);
            expect(result[0].toString()).toBe('10');
        });

        it('should handle nested let bindings', () => {
            const program = `!(let $x 10 (let $y 20 (+ $x $y)))`;
            const result = interpreter.run(program);
            expect(result[0].toString()).toBe('30');
        });

        it('should handle let*', () => {
            const program = `!(let* (( $x 10 ) ( $y 30 )) (+ $x $y))`;
            const result = interpreter.run(program);
            expect(result[0].toString()).toBe('40');
        });

        it('should handle recursion (Factorial with if)', () => {
            const program = `
                (= (fact $n) (if (== $n 0) 1 (* $n (fact (- $n 1)))))
                !(fact 5)
            `;
            const result = interpreter.run(program);
            expect(result.length).toBeGreaterThan(0);
            expect(result[result.length - 1].toString()).toBe('120');
        });

        it('should handle closures (simulated)', () => {
            const program = `
                (= (add-n $n) (λ $x (+ $x $n)))
                !((add-n 5) 10)
            `;
            const result = interpreter.run(program);
            expect(result.length).toBeGreaterThan(0);
            expect(result[result.length - 1].toString()).toBe('15');
        });

        it('should handle higher-order functions (apply-twice)', () => {
            const program = `
                (= (apply-twice $f $x) ($f ($f $x)))
                !(apply-twice (λ $y (* $y 2)) 3)
            `;
            const result = interpreter.run(program);
            expect(result.length).toBeGreaterThan(0);
            expect(result[result.length - 1].toString()).toBe('12');
        });
    });

    describe('logic/socrates.metta (NAL Deduction)', () => {
        beforeEach(() => {
            // Ensure truth/nal modules are loaded if not by default
            // The interpreter config above requests them, assuming StdlibLoader handles it.
            // We can manually verify connectivity.
        });

        it('should perform basic truth value arithmetic', () => {
            // Direct test of grounded aliases
            const code = `!(&+ 1 2)`;
            const res = interpreter.run(code);
            expect(res[0].toString()).toBe('3');

            const code2 = `!(&* 2 3)`;
            const res2 = interpreter.run(code2);
            expect(res2[0].toString()).toBe('6');

            const code3 = `!(&* 0.5 0.5)`;
            const res3 = interpreter.run(code3);
            expect(res3[0].toString()).toBe('0.25');
        });

        it('should derive Socrates mortality with truth value', () => {
            const program = `
                (Inh Socrates Human (1.0 0.9))
                (Inh Human Mortal (1.0 0.9))
                ! (query-derive (Inh Socrates Mortal))
             `;
            const result = interpreter.run(program);
            // Expected: (Inh Socrates Mortal (1.0 0.81))

            // Check if ANY result matches the derivation
            const resStrings = result.map(r => r.toString());
            console.log('Socrates Results:', resStrings);

            const derived = resStrings.find(s => s.includes('0.81') && s.includes('Inh') && s.includes('Mortal'));
            expect(derived).toBeDefined();
        });
    });
});
