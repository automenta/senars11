
import { MeTTaInterpreter } from '../../../core/src/metta/MeTTaInterpreter.js';
import { Term, sym } from '../../../core/src/metta/kernel/Term.js';
import { Unify } from '../../../core/src/metta/kernel/Unify.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stdlibDir = path.resolve(__dirname, '../../../core/src/metta/stdlib');

describe('Intermediate Tests (Let*, Closures)', () => {
    let interpreter;

    beforeEach(() => {
        Term.clearSymbolTable();
        interpreter = new MeTTaInterpreter(null, {
            termFactory: new TermFactory(),
            typeChecking: false,
            maxReductionSteps: 50000,
            loadStdlib: true,
            stdlibDir: stdlibDir,
            modules: ['core'] // Only core needed for let* and lambda
        });
    });

    it('should handle empty let* bindings', () => {
        // (let* () body) -> body
        const code = `!(let* () 42)`;
        const res = interpreter.run(code);
        expect(res[0].toString()).toBe('42');
    });

    it('should handle single let* binding (equivalent to let)', () => {
        // (let* ((x 1)) x)
        const code = `!(let* (( $x 1 )) $x)`;
        const res = interpreter.run(code);
        expect(res[0].toString()).toBe('1');
    });

    it('should handle let* binding dependent on previous', () => {
        // (let* ((x 1) (y (+ x 1))) y)
        // Note: + must be available or core ops. &+ alias might not be available if only core loaded?
        // We might need to use + if alias works, or &+ if not.
        // core.metta might not load aliases if we didn't ask for them?
        // MeTTaInterpreter loads core ops by default via Ground constructor.
        const code = `!(let* (( $x 1 ) ( $y (+ $x 1) )) $y)`;
        const res = interpreter.run(code);
        expect(res[0].toString()).toBe('2');
    });

    it('should handle closure capture', () => {
        // (= (make-adder $val) (λ $x (+ $x $val)))
        const code = `
            (= (make-adder $val) (λ $x (+ $x $val)))
            !((make-adder 10) 5)
         `;
        const res = interpreter.run(code);
        expect(res[0].toString()).toBe('15');
        expect(res[0].toString()).toBe('15');
    });

    it('should subst correctly', () => {
        const x = Term.var('x');
        const tmpl = Term.exp(sym('+'), [x, sym('1')]);
        const bindings = { '$x': sym('10') };
        const res = Unify.subst(tmpl, bindings);
        console.log('Explicit Subst Result:', res.toString());
        expect(res.toString()).toBe('(+ 10 1)');
    });
});
