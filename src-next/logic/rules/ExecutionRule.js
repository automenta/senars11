import {Rule} from '../../engine/Rule.js';
import {Task, TaskType} from '../../core/Task.js';
import {Truth} from '../../core/Truth.js';
import {Stamp} from '../../core/Stamp.js';

export class ExecutionRule extends Rule {
    constructor() { super('Execution'); }

    apply(task, belief, {termFactory, operationRegistry}) {
        // Only execute GOALs
        if (task.type !== TaskType.GOAL) return [];

        const term = task.term;

        let opName = null;
        let args = [];

        // Strict Syntax: (op ^ args)
        if (term.operator === '^') {
            opName = term.components[0].name; // e.g. "add"

            // Arguments: components[1]. Can be tuple (1, 2) or single value
            const argTerm = term.components[1];
            if (argTerm.operator === ',') {
                args = argTerm.components;
            } else {
                args = [argTerm];
            }
        } else {
            // Not an operation
            return [];
        }

        const handler = operationRegistry.get(opName);

        if (!handler) return []; // Unknown operation

        try {
            const resultValue = handler(args);

            if (resultValue === undefined || resultValue === null) return [];

            // Create result Task
            // (Result --> (op ^ args)) ?
            // Or ((op ^ args) --> Result).
            // Usually Relation: ((op ^ args) --> Result).
            // Test expected: term components[0] name is (op ^ args).
            // So Subject is InputTerm. Predicate is Result.

            let resultTerm;
            if (typeof resultValue === 'object' && resultValue.type) { // Is Term
                resultTerm = resultValue;
            } else {
                // Create atomic term from value
                resultTerm = termFactory.create(String(resultValue));
            }

            const relation = termFactory.create({
                operator: '-->',
                components: [term, resultTerm]
            });

            // Stamp: derived from Execution
            const stamp = new Stamp(null, Date.now(), [task.stamp.id]);

            return [new Task(relation, TaskType.BELIEF, Truth.TRUE, stamp)];

        } catch (e) {
            console.error(`Error executing ${opName}:`, e);
            return [];
        }
    }
}
