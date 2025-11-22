import {Concept} from './Concept.js';
import {Bag} from './Bag.js';
import {TaskType} from '../core/Task.js';

export class Memory {
    constructor() {
        this.concepts = new Map();
        this.focus = new Bag('focus');
        this.termLinks = new Map(); // TermName -> Set<Task>
    }

    getConcept(term) {
        let concept = this.concepts.get(term.name);
        if (!concept) {
            concept = new Concept(term);
            this.concepts.set(term.name, concept);
        }
        return concept;
    }

    getAllConcepts() {
        return Array.from(this.concepts.values());
    }

    addResult(task) {
        // Add to Focus (Attention Buffer)
        // Use term name as key? Or task ID?
        // Focus usually holds Concepts or Tasks. Here Tasks.
        this.focus.put(task.term.name, task, task.budget?.priority || 0.9);

        // Add to Concept Storage
        const concept = this.getConcept(task.term);
        if (task.type === TaskType.BELIEF) {
             concept.addBelief(task);
             this._indexTask(task);
        }
    }

    _indexTask(task) {
        // Index task under its components (e.g., A->B under A and B)
        if (task.term.isCompound) {
            task.term.components.forEach(c => {
                if (!this.termLinks.has(c.name)) this.termLinks.set(c.name, new Set());
                this.termLinks.get(c.name).add(task);
            });
        }
    }

    getTasksRelatedTo(term) {
        const related = new Set();
        // Add tasks indexed under this term's name
        const direct = this.termLinks.get(term.name);
        if (direct) direct.forEach(t => related.add(t));

        // Also, if term is compound, tasks indexed under its components?
        // No, usually we look for tasks that *contain* the term.
        return Array.from(related);
    }
}
