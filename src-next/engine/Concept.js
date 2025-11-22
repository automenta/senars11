import {TaskType} from '../core/Task.js';

export class Concept {
    constructor(term) {
        this.term = term;
        this.beliefs = []; // Ordered by confidence/priority?
        this.tasks = []; // Pending tasks?
    }

    addBelief(task) {
        if (task.type !== TaskType.BELIEF) return;
        // Simple add for now. Revision logic belongs in Reasoner or via a specialized method.
        // Check if duplicate?
        const existing = this.beliefs.find(b => b.truth.frequency === task.truth.frequency && b.truth.confidence === task.truth.confidence);
        if (!existing) {
            this.beliefs.push(task);
            this.beliefs.sort((a, b) => b.truth.confidence - a.truth.confidence);
        }
    }

    getBeliefs() {
        return this.beliefs;
    }
}
