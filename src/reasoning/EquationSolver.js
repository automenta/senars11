/**
 * Equation Solver for SeNARS
 * Separates the equation solving logic from the main EvaluationEngine
 */
import {SYSTEM_ATOMS} from './SystemAtoms.js';
import {VariableBindingUtils} from './VariableBindingUtils.js';

export class EquationSolver {
    constructor(termFactory) {
        this.termFactory = termFactory;
    }

    /**
     * Solve equations of the form (X + 3) = 7 to find X
     */
    async solveEquation(leftTerm, rightTerm, variableName, context, variableBindings = new Map()) {
        // Handle equality operator (=) for back-solving
        if (leftTerm.isCompound && leftTerm.operator === '=') {
            // For equality, we pass the equality term as left, and null as right (since right is already part of the equality)
            return this._solveEqualityEquation(leftTerm, rightTerm, variableName, variableBindings);
        }

        // Handle operation operator (^) for back-solving
        if (leftTerm.isCompound && leftTerm.operator === '^') {
            return this._solveOperationEquation(leftTerm, rightTerm, variableName, variableBindings);
        }

        if (leftTerm.name?.startsWith('?') && leftTerm.name === variableName) {
            return this._createResult(rightTerm, true, 'Direct variable assignment', {solvedVariable: variableName});
        }

        return this._createResult(SYSTEM_ATOMS.Null, false, 'No back-solving pattern matched');
    }

    /**
     * Solve equality equations and return all variable bindings
     */
    async solveEquality(equalityTerm, variableBindings = new Map()) {
        if (!equalityTerm.isCompound || equalityTerm.operator !== '=' || equalityTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid equality format');
        }

        const [leftSide, rightSide] = equalityTerm.components;

        // Get all variable bindings from matching the two sides
        const bindings = VariableBindingUtils.matchAndBindVariables(leftSide, rightSide, variableBindings);
        if (bindings) {
            return this._createResult(null, true, 'Equality solved', {bindings});
        }

        return this._createResult(SYSTEM_ATOMS.Null, false, 'Could not solve equality');
    }

    _solveEqualityEquation(equalityTerm, targetTerm, variableName, variableBindings) {
        if (!equalityTerm.isCompound || equalityTerm.operator !== '=' || equalityTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid equality format for equation solving');
        }

        const [leftSide, rightSide] = equalityTerm.components;

        // Check for direct variable assignment in left side
        if (leftSide.name?.startsWith('?') && leftSide.name === variableName) {
            // If left side is the variable being solved for, return the right side
            return this._createResult(rightSide, true, 'Variable found on left side of equality', {solvedVariable: variableName});
        }

        // Check for direct variable assignment in right side
        if (rightSide.name?.startsWith('?') && rightSide.name === variableName) {
            // If right side is the variable being solved for, return the left side
            return this._createResult(leftSide, true, 'Variable found on right side of equality', {solvedVariable: variableName});
        }

        // Perform bidirectional matching and variable binding
        const bindings = VariableBindingUtils.matchAndBindVariables(leftSide, rightSide, variableBindings);
        if (bindings && bindings.has(variableName)) {
            const boundValue = bindings.get(variableName);
            return this._createResult(boundValue, true, 'Variable found through bidirectional matching', {solvedVariable: variableName});
        }

        // Check if variable is within a compound term on either side and solve recursively
        if (this._containsVariable(leftSide, variableName)) {
            // If left side is an operation with the variable, move right side to the other side of equation
            if (leftSide.operator === '^') {
                return this._solveOperationEquation(leftSide, rightSide, variableName, variableBindings);
            }
        }

        if (this._containsVariable(rightSide, variableName)) {
            // If right side is an operation with the variable, move left side to the other side of equation
            if (rightSide.operator === '^') {
                return this._solveOperationEquation(rightSide, leftSide, variableName, variableBindings);
            }
        }

        return this._createResult(SYSTEM_ATOMS.Null, false, 'Target variable not found in equality expression');
    }

    _containsVariable(term, variableName) {
        if (!term) return false;

        if (term.name?.startsWith('?') && term.name === variableName) {
            return true;
        }

        if (term.isCompound && term.components) {
            return term.components.some(comp => this._containsVariable(comp, variableName));
        }

        return false;
    }

    _solveOperationEquation(operationTerm, targetTerm, variableName, variableBindings) {
        if (!operationTerm.isCompound || operationTerm.operator !== '^' || operationTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid operation format for equation solving');
        }

        const [functionTerm, argsTerm] = operationTerm.components;
        const functionName = this._resolveFunctionName(functionTerm, variableBindings);
        if (!functionName) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Unbound variable in function position');
        }

        const targetValue = this._termToValue(targetTerm);
        if (targetValue === null) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Target value cannot be determined');
        }

        const args = this._extractArguments(argsTerm, variableBindings);
        const variableIndex = args.findIndex(arg =>
            arg.name?.startsWith('?') && arg.name === variableName
        );

        if (variableIndex === -1) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Target variable not found in operation arguments');
        }

        return this._solveArithmeticEquation(functionName, args, variableIndex, targetValue);
    }

    _resolveFunctionName(functionTerm, variableBindings) {
        const boundTerm = variableBindings.get(functionTerm.name);
        return functionTerm.name?.startsWith('?')
            ? boundTerm?.name || null
            : functionTerm.name || functionTerm.toString();
    }

    _extractArguments(argsTerm, variableBindings) {
        if (!argsTerm.isCompound || argsTerm.operator !== ',') {
            if (['*', '?*'].includes(argsTerm.name)) return [];
            return [this._substituteVariables(argsTerm, variableBindings)];
        }
        return this._extractCompoundArguments(argsTerm, variableBindings);
    }

    _extractCompoundArguments(argsTerm, variableBindings) {
        const startIndex = (argsTerm.components[0]?.name === '*' || argsTerm.components[0]?.name === '?*') ? 1 : 0;
        return argsTerm.components
            .slice(startIndex)
            .map(comp => this._substituteVariables(comp, variableBindings));
    }

    _substituteVariables(term, bindings) {
        if (!term) return term;

        if (term.name?.startsWith('?')) {
            return bindings.get(term.name) ?? term;
        }

        if (term.isCompound) {
            const newComponents = term.components.map(comp => this._substituteVariables(comp, bindings));
            const hasChanges = newComponents.some((comp, idx) => comp !== term.components[idx]);
            return hasChanges ? new Term('compound', term.name, newComponents, term.operator) : term;
        }

        return term;
    }

    _termToValue(term) {
        if (!term) return null;

        const {name} = term;
        if (name === 'True') return true;
        if (name === 'False') return false;
        if (name === 'Null') return null;

        if (term.isAtomic) {
            const numValue = Number(name);
            return isNaN(numValue) ? name : numValue;
        }

        // Handle Product terms as numeric vectors: (*,1,2) and shorthand (1,2)
        if (term.operator === ',') {
            const vectorValues = [];
            for (const comp of term.components) {
                const compValue = this._termToValue(comp);
                if (typeof compValue !== 'number') {
                    // If any component is not a number, return as term
                    return term;
                }
                vectorValues.push(compValue);
            }
            // Return as an array (vector)
            return vectorValues;
        }

        return term;
    }

    _solveArithmeticEquation(functionName, args, variableIndex, targetValue) {
        const argValues = args.map(arg => this._termToValue(arg));

        // Check if target value is valid for equation solving
        if (targetValue === null || typeof targetValue !== 'number') {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Target value must be a number for arithmetic equation solving');
        }

        // Check if the non-variable argument is a number 
        const otherValue = argValues[1 - variableIndex];
        if (typeof otherValue !== 'number') {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Non-variable argument must be a number for arithmetic equation solving');
        }

        // Define solver lookup table for arithmetic operations
        const solvers = {
            'add': () => this._solveAddEquation(otherValue, targetValue),
            'subtract': () => this._solveSubtractEquation(variableIndex, argValues, targetValue),
            'multiply': () => this._solveMultiplyEquation(otherValue, targetValue),
            'divide': () => this._solveDivideEquation(variableIndex, argValues, targetValue)
        };

        // Get the appropriate solver function
        const solver = solvers[functionName];
        if (!solver) {
            return this._createResult(SYSTEM_ATOMS.Null, false, `Back-solving not implemented for functor: ${functionName}`);
        }

        // Execute the solver
        const {solvedValue, success, message} = solver();

        if (success && solvedValue !== null) {
            const resultTerm = this._valueToTerm(solvedValue, this.termFactory);
            return this._createResult(resultTerm, true, null, {
                solvedVariable: args[variableIndex].name,
                solvedValue
            });
        } else {
            return this._createResult(SYSTEM_ATOMS.Null, false, message || 'Could not solve equation');
        }
    }

    _solveAddEquation(otherValue, targetValue) {
        if (typeof otherValue === 'number') {
            return {solvedValue: targetValue - otherValue, success: true, message: null};
        }
        return {solvedValue: null, success: false, message: 'Other argument is not a number, cannot solve'};
    }

    _solveSubtractEquation(variableIndex, argValues, targetValue) {
        const [firstValue, secondValue] = argValues;

        if (variableIndex === 0) {
            // If we have subtract(x, b) = target, then x = target + b
            return typeof secondValue === 'number'
                ? {solvedValue: targetValue + secondValue, success: true, message: null}
                : {solvedValue: null, success: false, message: 'Second argument is not a number, cannot solve'};
        } else {
            // If we have subtract(a, x) = target, then x = a - target
            return typeof firstValue === 'number'
                ? {solvedValue: firstValue - targetValue, success: true, message: null}
                : {solvedValue: null, success: false, message: 'First argument is not a number, cannot solve'};
        }
    }

    _solveMultiplyEquation(otherValue, targetValue) {
        if (typeof otherValue === 'number' && otherValue !== 0) {
            return {solvedValue: targetValue / otherValue, success: true, message: null};
        } else if (otherValue === 0) {
            return {solvedValue: null, success: false, message: 'Cannot divide by zero'};
        }
        return {solvedValue: null, success: false, message: 'Other argument is not a number, cannot solve'};
    }

    _solveDivideEquation(variableIndex, argValues, targetValue) {
        const [firstValue, secondValue] = argValues;

        if (variableIndex === 0) {
            // If we have divide(x, b) = target, then x = target * b
            return typeof secondValue === 'number'
                ? {solvedValue: targetValue * secondValue, success: true, message: null}
                : {solvedValue: null, success: false, message: 'Second argument is not a number, cannot solve'};
        } else {
            // If we have divide(a, x) = target, then x = a / target
            return targetValue !== 0
                ? (typeof firstValue === 'number'
                    ? {solvedValue: firstValue / targetValue, success: true, message: null}
                    : {solvedValue: null, success: false, message: 'First argument is not a number, cannot solve'})
                : {solvedValue: null, success: false, message: 'Cannot divide by target value of zero'};
        }
    }

    _valueToTerm(value, termFactory) {
        if (value === null) return SYSTEM_ATOMS.Null;
        if (typeof value === 'boolean') return value ? SYSTEM_ATOMS.True : SYSTEM_ATOMS.False;

        if (typeof value === 'number') {
            if (isNaN(value)) return SYSTEM_ATOMS.Null;
            return this._createTermWithErrorHandling('atom', value.toString());
        }

        // Handle arrays (vectors) by creating Product terms: [1,2] becomes (1,2)
        if (Array.isArray(value)) {
            // Use the TermFactory to create a compound term with comma operator
            const factory = termFactory || this.termFactory;
            const components = value.map(v => this._valueToTerm(v, factory));
            return factory.create({operator: ',', components});
        }

        if (typeof value === 'string' && ['True', 'False', 'Null'].includes(value)) {
            return SYSTEM_ATOMS[value];
        }

        if (value instanceof Term) return value;
        return this._createTermWithErrorHandling('atom', String(value));
    }

    _createTermWithErrorHandling(type, name) {
        try {
            // Use the TermFactory to create the term properly
            return this.termFactory.create({name, components: [name]});
        } catch (error) {
            console.error(`Error creating term: ${error.message}`);
            return SYSTEM_ATOMS.Null;
        }
    }

    _createResult(result, success, message, additionalData = {}) {
        return {result, success, message, ...additionalData};
    }
}