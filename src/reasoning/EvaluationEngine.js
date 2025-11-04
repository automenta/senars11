import {Term} from '../term/Term.js';
import {TermFactory} from '../term/TermFactory.js';
import {ConcreteFunctor, FunctorRegistry} from './Functor.js';
import {isFalse, isNull, isTrue, SYSTEM_ATOMS} from './SystemAtoms.js';
import {VectorOperations} from './VectorOperations.js';
import {EqualitySolver} from './EqualitySolver.js';
import {VariableBindingUtils} from './VariableBindingUtils.js';
import {HigherOrderReasoningEngine} from './nal/HigherOrderReasoningEngine.js';
import {EquationSolver} from './EquationSolver.js';
import {BooleanEvaluator} from './BooleanEvaluator.js';

export class EvaluationEngine {
    constructor(functorRegistry = null, termFactory = null, config = {}) {
        this.functorRegistry = functorRegistry || new FunctorRegistry();
        this.termFactory = termFactory || new TermFactory();
        this.equalitySolver = new EqualitySolver(this.termFactory);
        this.equationSolver = new EquationSolver(this.termFactory);
        this.higherOrderEngine = new HigherOrderReasoningEngine();

        // Advanced features configuration
        this.config = {
            enableCaching: config.enableCaching !== false,
            enableOptimization: config.enableOptimization !== false,
            enableBacktracking: config.enableBacktracking !== false,
            maxRecursionDepth: config.maxRecursionDepth || 10,
            enableTypeChecking: config.enableTypeChecking !== false,
            ...config
        };

        // Evaluation caches
        if (this.config.enableCaching) {
            this._evaluationCache = new Map();
            this._cacheHits = 0;
            this._cacheMisses = 0;
        }

        // Current recursion depth tracking
        this._recursionDepth = 0;

        // Unified rules for both functional and structural evaluation
        this.operatorRules = {
            '&': {
                functional: this._reduceAndFunctional.bind(this),
                structural: this._reduceAndStructural.bind(this)
            },
            '|': {
                functional: this._reduceOrFunctional.bind(this),
                structural: this._reduceOrStructural.bind(this)
            },
            '--': {
                functional: this._reduceNegationFunctional.bind(this),
                structural: this._reduceNegationStructural.bind(this)
            },
            '==>': {
                functional: this._reduceImplicationFunctional.bind(this),
                structural: this._reduceImplicationStructural.bind(this)
            },
            '<=>': {
                functional: this._reduceEquivalenceFunctional.bind(this),
                structural: this._reduceEquivalenceStructural.bind(this)
            }
        };

        this._initializeDefaultFunctors();
    }

    _initializeDefaultFunctors() {
        ['True', 'False', 'Null'].forEach(name => {
            this.functorRegistry.register(name, () => SYSTEM_ATOMS[name], {arity: 0});
        });

        const ops = [['add', 2, true], ['subtract', 2, false], ['multiply', 2, true], ['divide', 2, false]];
        ops.forEach(([name, arity, isCommutative]) => {
            this.addFunctor(name, VectorOperations[name], {arity, isCommutative});
        });
        this.addFunctor('cmp', VectorOperations.compare, {arity: 2});
    }

    async evaluate(term, context, variableBindings = new Map()) {
        // Check recursion depth to prevent infinite loops
        if (this._recursionDepth > this.config.maxRecursionDepth) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Maximum recursion depth exceeded');
        }
        this._recursionDepth++;

        try {
            // Generate cache key if caching is enabled
            const cacheKey = this.config.enableCaching ? this._generateCacheKey(term, variableBindings) : null;
            if (cacheKey) {
                const cachedResult = this._evaluationCache.get(cacheKey);
                if (cachedResult) {
                    this._cacheHits++;
                    return cachedResult;
                }
            }

            const result = await this._evaluateTerm(term, context, variableBindings);
            this._setCacheResult(cacheKey, result);
            return result;
        } finally {
            this._recursionDepth--;
        }
    }

    async _evaluateTerm(term, context, variableBindings) {
        if (!term.isCompound) {
            return this._evaluateNonOperation(term, context, variableBindings);
        }

        // Check for higher-order reasoning patterns before standard evaluation
        const higherOrderResult = this.higherOrderEngine.processHigherOrderTerm(term, context);
        if (higherOrderResult.success) {
            return this._createResult(higherOrderResult.result, true, `Higher-order reasoning: ${higherOrderResult.message}`,
                higherOrderResult.bindings ? {bindings: higherOrderResult.bindings} : {});
        }

        switch (term.operator) {
            case '&':
            case '|':
            case '==>':
            case '<=>':
                return await this._evaluateUnifiedOperator(term, context, variableBindings);
            case '^':
                return term.components.length !== 2
                    ? this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid operation format')
                    : await this._evaluateOperation(term, variableBindings);
            case '=':
                return await this._evaluateEquality(term, context, variableBindings);
            case '--':
                return this.reduce(term);
            default:
                return this._evaluateNonOperation(term, context, variableBindings);
        }
    }

    async _evaluateUnifiedOperator(term, context, variableBindings) {
        // Check if all arguments are Boolean atoms (True, False, Null) for functional evaluation
        const isFunctional = this._areAllBooleanValues(term.components, variableBindings);
        return isFunctional 
            ? this._evaluateBooleanFunction(term, variableBindings) 
            : this._createResult(this.reduce(term), true, 'Structural compound with boolean reduction');
    }

    _areAllBooleanValues(components, variableBindings) {
        return components.every(comp => {
            const boundComp = this._substituteVariables(comp, variableBindings);
            return boundComp.isBoolean || isTrue(boundComp) || isFalse(boundComp) || isNull(boundComp);
        });
    }

    _evaluateBooleanFunction(term, variableBindings) {
        const { operator, components } = term;
        
        // Ensure we have exactly 2 components for binary operations or at least 1 for others
        if (['==>', '<=>'].includes(operator) && components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, `${operator} requires exactly 2 arguments`);
        }
        
        const boundComponents = components.map(comp => this._substituteVariables(comp, variableBindings));
        
        const evaluators = {
            '&': () => BooleanEvaluator.evaluateAnd(boundComponents),
            '|': () => BooleanEvaluator.evaluateOr(boundComponents),
            '==>': () => BooleanEvaluator.evaluateImplication(boundComponents),
            '<=>': () => BooleanEvaluator.evaluateEquivalence(boundComponents)
        };

        const evaluator = evaluators[operator];
        if (!evaluator) {
            return this._evaluateNonOperation(term, null, variableBindings);
        }
        
        const { result, message } = evaluator();
        return this._createBooleanResult(result, message);
    }

    async _evaluateEquality(term, context, variableBindings) {
        if (term.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Equality requires exactly 2 arguments');
        }

        const [left, right] = term.components;

        // Check for variable bindings in both directions
        const leftBound = this._substituteVariables(left, variableBindings);
        const rightBound = this._substituteVariables(right, variableBindings);

        // Check if this is a computational equation that needs solving
        // e.g., (X + 3) = 7 where we need to solve for X
        const equationResult = await this._attemptEquationSolving(leftBound, rightBound, variableBindings);
        if (equationResult && equationResult.success) {
            return equationResult;
        }

        // Handle atomic value comparison
        if (leftBound.isAtomic && rightBound.isAtomic) {
            return this._evaluateAtomicEquality(leftBound, rightBound);
        }

        // For compound structures, do more complex matching
        const bindings = VariableBindingUtils.matchAndBindVariables(leftBound, rightBound, variableBindings);
        if (bindings) {
            // If successful matching occurred, return True
            return this._createResult(SYSTEM_ATOMS.True, true, 'Equality: structures match', {bindings});
        }

        // If no match found, return False - but this is still a successful evaluation
        return this._createResult(SYSTEM_ATOMS.False, true, 'Equality: structures do not match');
    }

    _evaluateAtomicEquality(leftBound, rightBound) {
        const leftVal = this._termToValue(leftBound);
        const rightVal = this._termToValue(rightBound);

        // For simple values, return True/False
        return leftVal === rightVal
            ? this._createResult(SYSTEM_ATOMS.True, true, 'Equality: atomic values match')
            : this._createResult(SYSTEM_ATOMS.False, true, 'Equality: atomic values do not match');
    }

    async _attemptEquationSolving(left, right, variableBindings) {
        if (this._isOperationWithVariable(left) && this._isAtomicOrNumeric(right)) {
            return await this._solveForVariableInOperation(left, right, variableBindings);
        }

        if (this._isOperationWithVariable(right) && this._isAtomicOrNumeric(left)) {
            return await this._solveForVariableInOperation(right, left, variableBindings);
        }

        if (this._isOperationWithVariable(left) && this._isOperationWithVariable(right)) {
            return await this._solveOperationOperationEquation(left, right, variableBindings);
        }

        return null;
    }

    _isOperationWithVariable(term) {
        return term.isCompound && 
               term.operator === '^' && 
               term.components?.length === 2 &&
               term.components[1].isCompound && 
               term.components[1].operator === ',' &&
               term.components[1].components?.some(arg => arg.name?.startsWith('?'));
    }

    _isAtomicOrNumeric(term) {
        return term.isAtomic || this._isNumericValue(term);
    }
    
    _isNumericValue(term) {
        const value = this._termToValue(term);
        return typeof value === 'number' || 
               (Array.isArray(value) && value.every(v => typeof v === 'number'));
    }

    async _solveForVariableInOperation(operation, target, variableBindings) {
        if (!operation.isCompound || operation.operator !== '^' || operation.components.length !== 2) {
            return null;
        }

        const [functionTerm, argsTerm] = operation.components;
        const functionName = this._resolveFunctionName(functionTerm, variableBindings);

        if (!functionName) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Unbound variable in function position');
        }

        const targetValue = this._termToValue(target);
        if (targetValue === null || (typeof targetValue !== 'number' && !Array.isArray(targetValue))) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Target value cannot be determined for equation solving');
        }

        const args = this._extractArguments(argsTerm, variableBindings);
        const variableIndex = args.findIndex(arg => arg.name?.startsWith('?'));

        if (variableIndex === -1) {
            return await this._evaluateOperation(operation, variableBindings);
        }

        const equationResult = await this.equationSolver._solveArithmeticEquation(functionName, args, variableIndex, targetValue);

        if (equationResult.success) {
            const solvedValue = equationResult.result;
            if (solvedValue && !isNull(solvedValue)) {
                const newBindings = new Map(variableBindings);
                newBindings.set(args[variableIndex].name, solvedValue);

                return this._createResult(
                    SYSTEM_ATOMS.True,
                    true,
                    `Variable ${args[variableIndex].name} solved to ${solvedValue.name || solvedValue.toString()}`,
                    {solvedVariable: args[variableIndex].name, solvedValue, bindings: newBindings}
                );
            }
        }

        return null;
    }

    async _solveOperationOperationEquation(leftOperation, rightOperation, variableBindings) {
        return null;
    }

    reduce(term) {
        if (!term || !term.isCompound) return term;

        if (this._isFunctionalEvaluation(term)) {
            return this._applyFunctionalRule(term.operator, term.components);
        } else {
            return this._applyStructuralRule(term.operator, term.components);
        }
    }

    _isFunctionalEvaluation(term) {
        if (!term.isCompound || !this.operatorRules[term.operator]) return false;
        
        return term.operator === '--' 
            ? term.components?.length > 0 && this._isBooleanValue(term.components[0])
            : term.components?.every(comp => this._isBooleanValue(comp));
    }

    _isBooleanValue(term) {
        return isTrue(term) || isFalse(term) || isNull(term) || term.isBoolean;
    }

    _applyFunctionalRule(operator, components) {
        try {
            const rule = this.operatorRules[operator]?.functional;
            return rule ? rule(components) : BooleanEvaluator.functionalReduction(operator, components).result;
        } catch (error) {
            console.error(`Error during functional reduction for operator ${operator}:`, error.message);
            return SYSTEM_ATOMS.Null;
        }
    }

    _applyStructuralRule(operator, components) {
        const rule = this.operatorRules[operator]?.structural;
        if (rule) {
            try {
                return rule(components);
            } catch (error) {
                console.error(`Error during structural reduction for operator ${operator}:`, error.message);
            }
        }
        
        const safeOperator = operator || 'UNKNOWN';
        const safeComponents = components || [];
        const componentNames = safeComponents.map(comp => comp.name || comp.toString());
        const termName = `(${safeOperator}, ${componentNames.join(', ')})`;
        return new Term('compound', termName, safeComponents, safeOperator);
    }

    // Functional reduction rules (boolean evaluation)
    _reduceAndFunctional(components) {
        if (!components?.length) return SYSTEM_ATOMS.True;
        return this._naryBooleanOperation(components,
            isFalse, SYSTEM_ATOMS.False,
            isNull, SYSTEM_ATOMS.Null,
            isTrue, SYSTEM_ATOMS.True,
            () => new Term('compound', 'AND', components, '&'));
    }

    _reduceOrFunctional(components) {
        if (!components?.length) return SYSTEM_ATOMS.False;
        return this._naryBooleanOperation(components,
            isTrue, SYSTEM_ATOMS.True,
            isNull, SYSTEM_ATOMS.Null,
            isFalse, SYSTEM_ATOMS.False,
            () => new Term('compound', 'OR', components, '|'));
    }

    _reduceNegationFunctional(components) {
        if (!components?.length) return SYSTEM_ATOMS.Null;
        const [operand] = components;
        return isTrue(operand) ? SYSTEM_ATOMS.False :
               isFalse(operand) ? SYSTEM_ATOMS.True :
               isNull(operand) ? SYSTEM_ATOMS.Null : SYSTEM_ATOMS.Null;
    }

    _reduceImplicationFunctional(components) {
        if (components?.length !== 2) return SYSTEM_ATOMS.Null;
        const [ant, cons] = components;
        return isNull(ant) || isNull(cons) ? SYSTEM_ATOMS.Null :
               isFalse(ant) || isTrue(cons) ? SYSTEM_ATOMS.True :
               isTrue(ant) && isFalse(cons) ? SYSTEM_ATOMS.False : SYSTEM_ATOMS.Null;
    }

    _reduceEquivalenceFunctional(components) {
        if (components?.length !== 2) return SYSTEM_ATOMS.Null;
        const [left, right] = components;
        return isNull(left) || isNull(right) ? SYSTEM_ATOMS.Null :
               (isTrue(left) && isTrue(right)) || (isFalse(left) && isFalse(right)) ? SYSTEM_ATOMS.True :
               (isTrue(left) && isFalse(right)) || (isFalse(left) && isTrue(right)) ? SYSTEM_ATOMS.False : SYSTEM_ATOMS.Null;
    }

    // Structural reduction rules (NAL logic)
    _reduceAndStructural(components) {
        if (!components?.length) return SYSTEM_ATOMS.True;
        return this._naryStructuralOperation(
            components, comp => !isTrue(comp), // keep non-True for AND
            comp => isFalse(comp), SYSTEM_ATOMS.False,  // any False -> False
            comp => isNull(comp), SYSTEM_ATOMS.Null,    // any Null -> Null
            SYSTEM_ATOMS.True, '&', 'AND'
        );
    }

    _reduceOrStructural(components) {
        if (!components?.length) return SYSTEM_ATOMS.False;
        return this._naryStructuralOperation(
            components, comp => !isFalse(comp), // keep non-False for OR
            comp => isTrue(comp), SYSTEM_ATOMS.True,   // any True -> True
            comp => isNull(comp), SYSTEM_ATOMS.Null,   // any Null -> Null
            SYSTEM_ATOMS.False, '|', 'OR'
        );
    }

    _reduceNegationStructural(components) {
        if (!components?.length) return SYSTEM_ATOMS.Null;
        const [operand] = components;
        return isTrue(operand) ? SYSTEM_ATOMS.False :
               isFalse(operand) ? SYSTEM_ATOMS.True :
               isNull(operand) ? SYSTEM_ATOMS.Null :
               // Check for double negation elimination
               operand.isCompound && operand.operator === '--' && operand.components?.length > 0
                   ? operand.components[0]
                   : new Term('compound', 'NEGATION', [operand], '--');
    }

    _reduceImplicationStructural(components) {
        if (components?.length !== 2) {
            return components?.length 
                ? new Term('compound', `(==>, ${components.map(comp => comp.name || comp.toString()).join(', ')})`, components, '==>')
                : SYSTEM_ATOMS.Null;
        }

        const [ant, cons] = components;
        if (isFalse(ant) || isTrue(cons)) return SYSTEM_ATOMS.True;
        if (isTrue(ant) && isFalse(cons)) return SYSTEM_ATOMS.False;
        if (isNull(ant) || isNull(cons)) return SYSTEM_ATOMS.Null;
        return new Term('compound', `(==>, ${ant.name}, ${cons.name})`, [ant, cons], '==>');
    }

    _reduceEquivalenceStructural(components) {
        if (components?.length !== 2) {
            return components?.length
                ? (components.length === 1 ? components[0] : new Term('compound', 'EQUIVALENCE', components, '<=>'))
                : SYSTEM_ATOMS.Null;
        }

        const [left, right] = components;
        const bothTrue = isTrue(left) && isTrue(right);
        const bothFalse = isFalse(left) && isFalse(right);
        const trueFalse = (isTrue(left) && isFalse(right)) || (isFalse(left) && isTrue(right));
        
        if (bothTrue || bothFalse) return SYSTEM_ATOMS.True;
        if (trueFalse) return SYSTEM_ATOMS.False;
        if (isNull(left) || isNull(right)) return SYSTEM_ATOMS.Null;
        return new Term('compound', 'EQUIVALENCE', [left, right], '<=>');
    }

    cascadeReduce(term) {
        if (!term) return SYSTEM_ATOMS.Null;

        if (term.isCompound && term.components) {
            const reducedComponents = term.components.map(comp => this.cascadeReduce(comp));
            const processedTerm = reducedComponents.some((comp, idx) => comp !== term.components[idx])
                ? new Term(term.type, term.name, reducedComponents, term.operator)
                : term;

            return this.reduce(processedTerm);
        }

        return this.reduce(term);
    }

    async _evaluateOperation(term, variableBindings) {
        const [functionTerm, argsTerm] = term.components;

        const functionName = this._resolveFunctionName(functionTerm, variableBindings);
        if (!functionName) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Unbound variable in function position');
        }

        const args = this._extractArguments(argsTerm, variableBindings);
        const functor = this.functorRegistry.get(functionName);

        if (!functor) {
            return this._createResult(SYSTEM_ATOMS.Null, false, `Functor '${functionName}' not found`);
        }

        try {
            const argValues = [];
            for (const arg of args) {
                let processedArg = arg;

                if (processedArg.isCompound && processedArg.operator === '^') {
                    const evalResult = await this.evaluate(processedArg, null, variableBindings);
                    if (!evalResult.success || isNull(evalResult.result)) {
                        return this._createResult(SYSTEM_ATOMS.Null, false, `Failed to evaluate nested operation in argument: ${processedArg.toString()}`);
                    }
                    processedArg = evalResult.result;
                }

                argValues.push(this._termToValue(processedArg));
            }

            const result = functor.call(...argValues);
            const resultTerm = this._valueToTerm(result, this.termFactory);

            if (isNull(resultTerm)) {
                return this._createResult(resultTerm, false, 'Operation resulted in Null (poison pill)');
            }

            return this._createResult(resultTerm, true, null, {functorName: functionName});
        } catch (error) {
            if (typeof process === 'undefined' || !process.env.JEST_WORKER_ID) {
                console.error(`Error evaluating operation: ${error.message}`, error.stack);
            }
            return this._createResult(SYSTEM_ATOMS.Null, false, error.message);
        }
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
        const startIndex = (argsTerm.components[0]?.name === '*' || argsTerm.components[0]?.name === '?*') ? 1 : 0;
        return argsTerm.components
            .slice(startIndex)
            .map(comp => this._substituteVariables(comp, variableBindings));
    }

    _evaluateNonOperation(term, context, variableBindings) {
        const substitutedTerm = this._substituteVariables(term, variableBindings);
        const message = substitutedTerm.isCompound ? 'Non-operation compound term, no evaluation performed' : undefined;
        return this._createResult(substitutedTerm, true, message);
    }

    // Helper methods to reduce code duplication
    _binaryBooleanOp(op, left, right, trueResult, falseResult, nullResult = SYSTEM_ATOMS.Null) {
        if (isNull(left) || isNull(right)) return nullResult;
        return op(left, right) ? trueResult : falseResult;
    }

    _unaryBooleanOp(operand, condition, trueResult, falseResult, nullResult = SYSTEM_ATOMS.Null) {
        if (isNull(operand)) return nullResult;
        return condition(operand) ? trueResult : falseResult;
    }

    _substituteVariables(term, bindings) {
        if (!term) return term;

        if (term.name?.startsWith('?')) {
            return bindings.get(term.name) ?? term;
        }

        if (term.isCompound) {
            const newComponents = term.components.map(comp => this._substituteVariables(comp, bindings));
            const hasChanges = newComponents.some((comp, idx) => comp !== term.components[idx]);
            return hasChanges ? new Term(term.type, term.name, newComponents, term.operator) : term;
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

        if (term.operator === ',') {
            const vectorValues = [];
            for (const comp of term.components) {
                const compValue = this._termToValue(comp);
                if (typeof compValue !== 'number') {
                    return term;
                }
                vectorValues.push(compValue);
            }
            return vectorValues;
        }

        return term;
    }

    _valueToTerm(value, termFactory = null) {
        if (value === null) return SYSTEM_ATOMS.Null;
        if (typeof value === 'boolean') return value ? SYSTEM_ATOMS.True : SYSTEM_ATOMS.False;

        if (typeof value === 'number') {
            if (isNaN(value)) return SYSTEM_ATOMS.Null;
            return this._createTermWithErrorHandling('atom', value.toString());
        }

        if (Array.isArray(value)) {
            const factory = termFactory || new TermFactory();
            const components = value.map(v => this._valueToTerm(v, factory));
            return factory.create({operator: ',', components});
        }

        if (typeof value === 'string' && ['True', 'False', 'Null'].includes(value)) {
            return SYSTEM_ATOMS[value];
        }

        return value instanceof Term ? value : this._createTermWithErrorHandling('atom', String(value));
    }

    _createTermWithErrorHandling(type, name) {
        try {
            return this.termFactory.create({name, components: [name]});
        } catch (error) {
            console.error(`Error creating term: ${error.message}`);
            return SYSTEM_ATOMS.Null;
        }
    }

    async solveEquation(leftTerm, rightTerm, variableName, context, variableBindings = new Map()) {
        return this.equationSolver.solveEquation(leftTerm, rightTerm, variableName, context, variableBindings);
    }

    async solveEquality(equalityTerm, variableBindings = new Map()) {
        return this.equationSolver.solveEquality(equalityTerm, variableBindings);
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

    _solveArithmeticEquation(functionName, args, variableIndex, targetValue) {
        const argValues = args.map(arg => this._termToValue(arg));

        if (targetValue === null || typeof targetValue !== 'number') {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Target value must be a number for arithmetic equation solving');
        }

        const otherValue = argValues[1 - variableIndex];
        if (typeof otherValue !== 'number') {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Non-variable argument must be a number for arithmetic equation solving');
        }

        const solvers = {
            'add': () => this._solveAddEquation(otherValue, targetValue),
            'subtract': () => this._solveSubtractEquation(variableIndex, argValues, targetValue),
            'multiply': () => this._solveMultiplyEquation(otherValue, targetValue),
            'divide': () => this._solveDivideEquation(variableIndex, argValues, targetValue)
        };

        const solver = solvers[functionName];
        if (!solver) {
            return this._createResult(SYSTEM_ATOMS.Null, false, `Back-solving not implemented for functor: ${functionName}`);
        }

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
        const [first, second] = argValues;

        if (variableIndex === 0) {
            return typeof second === 'number'
                ? {solvedValue: targetValue + second, success: true, message: null}
                : {solvedValue: null, success: false, message: 'Second argument is not a number, cannot solve'};
        } else {
            return typeof first === 'number'
                ? {solvedValue: first - targetValue, success: true, message: null}
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
        const [first, second] = argValues;

        if (variableIndex === 0) {
            return typeof second === 'number'
                ? {solvedValue: targetValue * second, success: true, message: null}
                : {solvedValue: null, success: false, message: 'Second argument is not a number, cannot solve'};
        } else {
            return targetValue !== 0
                ? (typeof first === 'number'
                    ? {solvedValue: first / targetValue, success: true, message: null}
                    : {solvedValue: null, success: false, message: 'First argument is not a number, cannot solve'})
                : {solvedValue: null, success: false, message: 'Cannot divide by target value of zero'};
        }
    }

    _createResult(result, success, message, additionalData = {}) {
        return {result, success, message, ...additionalData};
    }

    _createBooleanResult(result, message) {
        return this._createResult(result, true, message);
    }

    _valueFromSubstitutedTerm(term, variableBindings) {
        return this._termToValue(this._substituteVariables(term, variableBindings));
    }

    _binaryBooleanOperation(left, right, operationFn) {
        if (isNull(left) || isNull(right)) return SYSTEM_ATOMS.Null;

        return operationFn(left, right);
    }

    matchAndBindVariables(leftTerm, rightTerm, variableBindings = new Map()) {
        return VariableBindingUtils.matchAndBindVariables(leftTerm, rightTerm, variableBindings);
    }



    _unaryBooleanOperation(operand, operationFn) {
        return operationFn(operand);
    }

    _naryBooleanOperation(components, someCheck1, result1, someCheck2, result2, everyCheck, result3, defaultFn) {
        if (components.some(someCheck1)) return result1;
        if (components.some(someCheck2)) return result2;
        if (components.every(everyCheck)) return result3;
        return defaultFn();
    }
    


    _naryStructuralOperation(components, filterCond, check1, result1, check2, result2, allCaseResult, operator, termType) {
        if (components.some(check1)) return result1;
        if (components.some(check2)) return result2;

        const filteredComponents = components.filter(filterCond);
        const count = filteredComponents.length;
        return count === 0 ? allCaseResult :
               count === 1 ? filteredComponents[0] :
               new Term('compound', termType, filteredComponents, operator);
    }

    addFunctor(name, execute, config = {}) {
        const functor = new ConcreteFunctor(name, execute, config);
        // The third parameter to register is aliases
        return this.functorRegistry.register(name, functor, []);
    }

    getFunctorRegistry() {
        return this.functorRegistry;
    }

    _generateCacheKey(term, variableBindings) {
        const termKey = term.toString();
        const bindingsKey = Array.from(variableBindings.entries())
            .map(([key, val]) => `${key}:${val.toString()}`)
            .sort()
            .join('|');
        return `${termKey}#${bindingsKey}`;
    }

    _setCacheResult(cacheKey, result) {
        if (this.config.enableCaching && cacheKey) {
            this._evaluationCache.set(cacheKey, result);
            this._cacheMisses++;

            if (this._evaluationCache.size > 1000) {
                const firstKey = this._evaluationCache.keys().next().value;
                if (firstKey) this._evaluationCache.delete(firstKey);
            }
        }
    }

    getCacheStats() {
        if (!this.config.enableCaching) return null;
        const total = this._cacheHits + this._cacheMisses;
        return {
            hits: this._cacheHits,
            misses: this._cacheMisses,
            hitRate: total > 0 ? this._cacheHits / total : 0,
            cacheSize: this._evaluationCache.size
        };
    }

    clearCache() {
        if (this.config.enableCaching) {
            this._evaluationCache.clear();
            this._cacheHits = 0;
            this._cacheMisses = 0;
        }
    }

    analyzeTerm(term) {
        if (!this.config.enableTypeChecking) return {isValid: true, type: 'unknown'};

        return {
            isValid: true,
            type: term.isAtomic ? 'atomic' : 'compound',
            operator: term.operator || null,
            componentCount: term.components?.length || 0,
            complexity: this._calculateTermComplexity(term),
            hasVariables: this._hasVariables(term),
            isWellFormed: this._isWellFormed(term)
        };
    }

    _calculateTermComplexity(term) {
        if (!term.isCompound) return 1;

        let complexity = 1;
        if (term.components) {
            for (const comp of term.components) {
                complexity += this._calculateTermComplexity(comp);
            }
        }
        return complexity;
    }

    _hasVariables(term) {
        if (term.name?.startsWith('?')) return true;

        if (term.isCompound && term.components) {
            return term.components.some(comp => this._hasVariables(comp));
        }

        return false;
    }

    _isWellFormed(term) {
        if (['-->', '==>'].includes(term.operator)) {
            return term.components?.length === 2;
        } else if (['&', '|', '<=>'].includes(term.operator)) {
            return term.components?.length >= 2;
        }

        return term.components ? 
            term.components.every(comp => comp !== undefined) : 
            true;
    }
    
    // _matchAndBindVariables is an alias for the utils function
    _matchAndBindVariables(leftTerm, rightTerm, variableBindings) {
        return VariableBindingUtils.matchAndBindVariables(leftTerm, rightTerm, variableBindings);
    }
}