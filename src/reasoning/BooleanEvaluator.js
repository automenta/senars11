import {SYSTEM_ATOMS, isTrue, isFalse, isNull} from './SystemAtoms.js';

/**
 * BooleanEvaluator - Handles all boolean evaluation logic separately from the main EvaluationEngine
 */
export class BooleanEvaluator {
    /**
     * Evaluate AND operation on boolean values
     * @param {Array} components - Array of terms to evaluate
     * @returns {Object} - Result with boolean value and message
     */
    static evaluateAnd(components) {
        if (!components?.length) return { result: SYSTEM_ATOMS.True, message: 'Boolean AND evaluation: no components, return True' };
        
        const values = components.map(comp => BooleanEvaluator._valueFromTerm(comp));
        const hasFalse = values.some(val => val === false);
        const allTrue = values.every(val => val === true);
        const result = hasFalse ? SYSTEM_ATOMS.False : allTrue ? SYSTEM_ATOMS.True : SYSTEM_ATOMS.Null;
        const message = hasFalse ? 'Boolean AND evaluation: contains False' : allTrue ? 'Boolean AND evaluation: all True' : 'Boolean AND evaluation: cannot determine';
        
        return { result, message };
    }

    /**
     * Evaluate OR operation on boolean values
     * @param {Array} components - Array of terms to evaluate
     * @returns {Object} - Result with boolean value and message
     */
    static evaluateOr(components) {
        if (!components?.length) return { result: SYSTEM_ATOMS.False, message: 'Boolean OR evaluation: no components, return False' };
        
        const values = components.map(comp => BooleanEvaluator._valueFromTerm(comp));
        const hasTrue = values.some(val => val === true);
        const allFalse = values.every(val => val === false);
        const result = hasTrue ? SYSTEM_ATOMS.True : allFalse ? SYSTEM_ATOMS.False : SYSTEM_ATOMS.Null;
        const message = hasTrue ? 'Boolean OR evaluation: contains True' : allFalse ? 'Boolean OR evaluation: all False' : 'Boolean OR evaluation: cannot determine';
        
        return { result, message };
    }

    /**
     * Evaluate IMPLICATION operation on boolean values
     * @param {Array} components - Array of terms to evaluate (should have exactly 2)
     * @returns {Object} - Result with boolean value and message
     */
    static evaluateImplication(components) {
        if (components?.length !== 2) {
            return { result: SYSTEM_ATOMS.Null, message: 'Implication requires exactly 2 arguments' };
        }
        
        const [ant, cons] = components.map(comp => BooleanEvaluator._valueFromTerm(comp));
        const isFalse = ant === true && cons === false;
        const isTrue = ant === false || cons === true;
        const result = isFalse ? SYSTEM_ATOMS.False : isTrue ? SYSTEM_ATOMS.True : SYSTEM_ATOMS.Null;
        const message = isFalse ? 'Boolean implication: true => false = false' 
            : isTrue ? 'Boolean implication: false => X or X => true = true' 
            : 'Boolean implication: cannot determine with non-boolean values';
        
        return { result, message };
    }

    /**
     * Evaluate EQUIVALENCE operation on boolean values
     * @param {Array} components - Array of terms to evaluate (should have exactly 2)
     * @returns {Object} - Result with boolean value and message
     */
    static evaluateEquivalence(components) {
        if (components?.length !== 2) {
            return { result: SYSTEM_ATOMS.Null, message: 'Equivalence requires exactly 2 arguments' };
        }
        
        const [left, right] = components.map(comp => BooleanEvaluator._valueFromTerm(comp));
        const result = left === right ? SYSTEM_ATOMS.True : SYSTEM_ATOMS.False;
        const message = left === right ? 'Boolean equivalence: values are equal' : 'Boolean equivalence: values are different';
        
        return { result, message };
    }

    /**
     * Generic n-ary boolean operation with priority order
     * @param {Array} components - Array of terms to evaluate
     * @param {Function} firstCheck - First condition check
     * @param {any} firstResult - Result if first condition met
     * @param {Function} secondCheck - Second condition check
     * @param {any} secondResult - Result if second condition met
     * @param {Function} thirdCheck - Third condition check
     * @param {any} thirdResult - Result if third condition met
     * @param {Function} defaultFn - Function to return default result
     * @returns {Object} - Result with value and message
     */
    static naryBooleanOperation(components, firstCheck, firstResult, secondCheck, secondResult, thirdCheck, thirdResult, defaultFn) {
        if (components.some(firstCheck)) return { result: firstResult, message: 'First condition met' };
        if (components.some(secondCheck)) return { result: secondResult, message: 'Second condition met' };
        if (components.every(thirdCheck)) return { result: thirdResult, message: 'Third condition met' };
        return { result: defaultFn(), message: 'Default condition' };
    }

    /**
     * Convert a term to its boolean value representation
     * @param {Object} term - The term to convert
     * @returns {boolean|null} - Boolean value or null
     */
    static _valueFromTerm(term) {
        return isTrue(term) ? true : isFalse(term) ? false : isNull(term) ? null : undefined;
    }

    /**
     * Apply functional reduction rules for boolean operations
     * @param {string} operator - The operation to perform
     * @param {Array} components - Array of terms to evaluate
     * @returns {Object} - Result of the operation
     */
    static functionalReduction(operator, components) {
        switch (operator) {
            case '&':
                return BooleanEvaluator.evaluateAnd(components);
            case '|':
                return BooleanEvaluator.evaluateOr(components);
            case '==>':
                return BooleanEvaluator.evaluateImplication(components);
            case '<=>':
                return BooleanEvaluator.evaluateEquivalence(components);
            case '--':
                return BooleanEvaluator._negationReduction(components);
            default:
                return { result: SYSTEM_ATOMS.Null, message: `Unknown operator for functional reduction: ${operator}` };
        }
    }

    /**
     * Apply negation to a boolean value
     * @param {Array} components - Array of terms (should have exactly 1)
     * @returns {Object} - Result with negated boolean value and message
     */
    static _negationReduction(components) {
        if (!components?.length) return { result: SYSTEM_ATOMS.Null, message: 'Negation requires at least one component' };
        
        const operand = components[0];
        const value = BooleanEvaluator._valueFromTerm(operand);
        
        if (value === null) return { result: SYSTEM_ATOMS.Null, message: 'Negation of null' };
        
        const result = value ? SYSTEM_ATOMS.False : SYSTEM_ATOMS.True;
        const message = value ? 'Negation of true' : 'Negation of false';
        
        return { result, message };
    }
}