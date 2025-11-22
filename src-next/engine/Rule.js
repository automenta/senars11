export class Rule {
    constructor(name) {
        this.name = name;
    }

    // Returns Task[]
    apply(task, belief, context) {
        return [];
    }
}
