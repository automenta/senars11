export class RuleUtils {
    static collectTasks(context) {
        const {memory, focus} = context || {};
        return [
            ...(memory?.getAllTasks?.() || []),
            ...(focus?.getCurrentTasks?.() || [])
        ];
    }

    static filterByTerm(tasks, term, unifyFn) {
        return tasks.filter(task => task?.term && unifyFn(term, task.term) !== null);
    }

    static filterByInheritance(tasks, operator = '-->') {
        return tasks.filter(task =>
            task?.term?.isCompound &&
            task.term.operator === operator &&
            task.term.components?.length === 2
        );
    }

    static findTasksByTerm = (term, context, unifyFn) => this.filterByTerm(this.collectTasks(context), term, unifyFn);

    static applyTruthOperation = (operation, t1, t2) => operation(t1, t2);
}