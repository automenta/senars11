/**
 * BoundedExecutor - Utility for executing tasks with time and cycle limits
 * to prevent infinite loops and ensure deterministic execution
 */

export class BoundedExecutor {
    static async executeWithTimeout(taskFn, timeoutMs = 1000, cycleLimit = 100, nar = null) {
        return new Promise((resolve, reject) => {
            // Set up timeout
            const timeoutId = setTimeout(() => {
                reject(new Error(`Execution timeout after ${timeoutMs}ms`));
            }, timeoutMs);

            // Execute the task
            const executeTask = async () => {
                try {
                    let result;

                    if (nar && cycleLimit > 0) {
                        // If we have a NAR instance and cycle limit, we can enforce cycle limits
                        const initialCycles = nar.cycleCount || 0;
                        result = await taskFn();

                        // Check if cycle count exceeded limit
                        const cyclesExecuted = (nar.cycleCount || 0) - initialCycles;
                        if (cyclesExecuted > cycleLimit) {
                            throw new Error(`Cycle limit exceeded: ${cyclesExecuted} > ${cycleLimit}`);
                        }
                    } else {
                        result = await taskFn();
                    }

                    clearTimeout(timeoutId);
                    resolve(result);
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            };

            executeTask();
        });
    }

    static async inputWithLimits(nar, narseseString, options = {}) {
        const {timeoutMs = 2000, maxCycles = 20} = options;

        return this.executeWithTimeout(
            async () => {
                await nar.input(narseseString);
                // Run some cycles to allow processing
                if (maxCycles > 0) {
                    await nar.runCycles(Math.min(maxCycles, 10)); // Limit to 10 cycles max to be safe
                }
                return true;
            },
            timeoutMs,
            maxCycles,
            nar
        );
    }

    static async stepWithLimits(nar, options = {}) {
        const {timeoutMs = 1000, maxCycles = 1} = options;

        return this.executeWithTimeout(
            async () => {
                return await nar.step();
            },
            timeoutMs,
            maxCycles,
            nar
        );
    }

    static async runCyclesWithLimits(nar, count, options = {}) {
        const {timeoutMs = 2000} = options;
        const maxCycles = Math.min(count, 50); // Prevent excessive cycle counts

        return this.executeWithTimeout(
            async () => {
                return await nar.runCycles(maxCycles);
            },
            timeoutMs,
            maxCycles,
            nar
        );
    }
}