export class PerformanceTracker {
    constructor() {
        this.totalExecutions = 0;
        this.successfulExecutions = 0;
        this.failedExecutions = 0;
        this.averageExecutionTime = 0;
        this.totalErrors = 0;
        this.toolUsageStats = new Map();
        this.categoryPerformance = new Map();
        this.performanceHistory = [];
        this.peakUsageTimes = new Map();
        this.errorPatterns = new Map();
    }

    trackExecutionSuccess(toolName, startTime) {
        const duration = Date.now() - startTime;

        this.totalExecutions++;
        this.successfulExecutions++;

        const {successfulExecutions} = this;
        this.averageExecutionTime =
            (this.averageExecutionTime * (successfulExecutions - 1) + duration) / successfulExecutions;

        if (!this.toolUsageStats.has(toolName)) {
            this.toolUsageStats.set(toolName, {
                executions: 0,
                successes: 0,
                failures: 0,
                totalTime: 0,
                averageTime: 0
            });
        }

        const toolStats = this.toolUsageStats.get(toolName);
        toolStats.executions++;
        toolStats.successes++;
        toolStats.totalTime += duration;
        toolStats.averageTime = toolStats.totalTime / toolStats.executions;
    }

    trackExecutionFailure(toolName, startTime, error) {
        const duration = Date.now() - startTime;

        this.totalExecutions++;
        this.failedExecutions++;

        if (!this.toolUsageStats.has(toolName)) {
            this.toolUsageStats.set(toolName, {
                executions: 0,
                successes: 0,
                failures: 0,
                totalTime: 0,
                averageTime: 0
            });
        }

        const toolStats = this.toolUsageStats.get(toolName);
        toolStats.executions++;
        toolStats.failures++;
        toolStats.totalTime += duration;
        toolStats.averageTime = toolStats.totalTime / toolStats.executions;

        const errorKey = error.constructor.name;
        const count = this.errorPatterns.get(errorKey) ?? 0;
        this.errorPatterns.set(errorKey, count + 1);
    }

    getStats(tools) {
        const stats = {
            totalTools: tools.size,
            toolsByCategory: {},
            totalExecutions: this.totalExecutions,
            successfulExecutions: this.successfulExecutions,
            failedExecutions: this.failedExecutions,
            averageExecutionTime: this.averageExecutionTime,
            mostUsedTools: []
        };

        for (const tool of tools.values()) {
            const category = tool.category;
            stats.toolsByCategory[category] = (stats.toolsByCategory[category] ?? 0) + 1;
        }

        const toolUsage = new Map();
        for (const tool of tools.values()) {
            toolUsage.set(tool.id, tool.usageCount);
        }

        stats.mostUsedTools = Array.from(toolUsage.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([toolName, count]) => ({toolName, count}));

        return stats;
    }
}
