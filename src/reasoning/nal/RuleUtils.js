export class RuleUtils {
    static collectTasks(context) {
        const {memory, focus} = context || {};
        const tasks = [];

        if (memory?.getAllTasks) tasks.push(...memory.getAllTasks());
        if (focus?.getCurrentTasks) tasks.push(...focus.getCurrentTasks());

        return tasks;
    }

    static filterByTerm(tasks, term, unifyFn) {
        return tasks.filter(task => {
            if (!task?.term) return false;
            return unifyFn(term, task.term) !== null;
        });
    }

    static filterByInheritance(tasks, operator = '-->') {
        return tasks.filter(task =>
            task?.term?.isCompound &&
            task.term.operator === operator &&
            task.term.components?.length === 2
        );
    }

    static findTasksByTerm(term, context, unifyFn) {
        const allTasks = this.collectTasks(context);
        return this.filterByTerm(allTasks, term, unifyFn);
    }

    static applyTruthOperation(operation, t1, t2) {
        return operation(t1, t2);
    }
}