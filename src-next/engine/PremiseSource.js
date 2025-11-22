export class PremiseSource {
    constructor(memory) {
        this.memory = memory;
    }

    getTask() {
        // Take highest priority task from Focus
        return this.memory.focus.take();
    }
}
