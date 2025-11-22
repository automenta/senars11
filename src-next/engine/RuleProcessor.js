export class RuleProcessor {
    constructor() {
        this.rules = [];
    }

    register(rule) {
        this.rules.push(rule);
    }

    process(task, belief, context) {
        const results = [];
        for (const rule of this.rules) {
            results.push(...rule.apply(task, belief, context));
        }
        return results;
    }
}
