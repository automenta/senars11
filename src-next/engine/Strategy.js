import {TaskType} from '../core/Task.js';

export class Strategy {
    constructor(memory) {
        this.memory = memory;
    }

    selectPremises(task) {
        const beliefs = new Set();

        // 1. Concept Beliefs (Revision)
        const concept = this.memory.getConcept(task.term);
        concept.getBeliefs().forEach(b => beliefs.add(b));

        // 2. Component Beliefs (Syllogism)
        if (task.term.isCompound) {
            task.term.components.forEach(c => {
                const related = this.memory.getTasksRelatedTo(c);
                related.forEach(r => {
                     if (r.type === TaskType.BELIEF) beliefs.add(r);
                });
            });
        }

        // Exclude self
        return Array.from(beliefs).filter(b => b !== task);
    }
}
