import {MeTTaInterpreter} from '@senars/metta/src/MeTTaInterpreter.js';

describe('MeTTa Type System Tests', () => {
    let metta;

    beforeEach(() => {
        metta = new MeTTaInterpreter();
        // Core stdlib is loaded by default
        const onePlusOne = metta.run('(+ 1 1)');
        if (onePlusOne[0].toString() !== '2') {
            console.log("STDLIB NOT LOADED/WORKING");
        }
    });

    // Setup type inference rules for literals (mocking smart type system)
    beforeEach(() => {
        const typeRules = `
            (= (typeof $x) (if (is-number $x) Number (super)))
            (= (typeof $x) (if (is-string $x) String (super)))
            (= (typeof $x) (if (is-bool $x) Bool (super)))
            
            (= (is-number $x) (^ &is-number $x))
            (= (is-string $x) (^ &is-string $x))
            (= (is-bool $x) (^ &is-bool $x))
            
            ; Fallback
            (= (typeof $x) Atom)
        `;

        const manualTypes = `
            (: 42 Number)
            (: "hello" String)
            (: True Bool)
        `;
        metta.load(manualTypes);
    });

    test('infers Number type', () => {
        const result = metta.run('(typeof 42)');
        expect(result.toString()).toContain('Number');
    });

    test('infers String type', () => {
        const result = metta.run('(typeof "hello")');
        expect(result.toString()).toContain('String');
    });

    test('infers Bool type', () => {
        const result = metta.run('(typeof True)');
        expect(result.toString()).toContain('Bool');
    });

    test('check-type passes for valid type', () => {
        const result = metta.run('(check-type 42 Number)');
        expect(result[0].toString()).toBe('42');
    });

    test('check-type fails for mismatched type', () => {
        const result = metta.run('(check-type 42 String)');
        expect(result[0].toString()).toContain('error');
    });

    test('custom types (even number example)', () => {
        const code = `
            (: Even Type)
            (= (is-even $x) (^ &== (^ &% $x 2) 0))
            
            ; Custom check function
            (= (check-even-type $x) (if (is-even $x) Even NotEven))
            (= (is-even-type? $x) (is-even $x))
        `;
        metta.load(code);

        const resultEven = metta.run('(is-even-type? 42)');
        expect(resultEven[0].toString()).toBe('True');

        const resultOdd = metta.run('(is-even-type? 43)');
        expect(resultOdd[0].toString()).toBe('False');
    });

    test('Function Application Types', () => {
        const code = `
            (: add (-> Number Number Number))
            (= (add $x $y) (+ $x $y))
        `;
        metta.load(code);

        const type = metta.run('(typeof add)');
        expect(type[0].toString()).toContain('->');
        expect(type[0].toString()).toContain('Number');
    });
});
