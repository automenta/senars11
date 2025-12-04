export class ExecutionHistory {
    constructor(maxHistorySize = 1000) {
        this.maxHistorySize = maxHistorySize;
        this.history = [];
    }

    add(execution) {
        this.history.push({...execution, timestamp: Date.now()});
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }

    get(options = {}, tools) {
        let history = [...this.history];

        if (options.toolName) {
            history = history.filter(exec => exec.toolId === options.toolName);
        }
        if (options.category) {
            history = history.filter(exec => {
                const tool = tools.get(exec.toolId);
                return tool?.category === options.category;
            });
        }
        if (options.limit) {
            history = history.slice(-options.limit);
        }

        return history;
    }
}
