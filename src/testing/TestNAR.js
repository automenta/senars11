/**
 * @file TestNAR.js
 * @description Simple test framework for NAR functionality
 */

import { TaskMatch } from './TaskMatch.js';

// Re-export TaskMatch as before to maintain backward compatibility
//export { SharedTaskMatch as TaskMatch };
export { TaskMatch as TaskMatch };

/**
 * Simplified test framework for NAR
 */
export class TestNAR {
    constructor(trace = false) {
        this.operations = [];
        this.nar = null;
        this.trace = trace; // Add trace flag to show all events
        this.eventLog = []; // Log of all events for debugging
    }

    static _matchesTruth(taskTruth, criteriaTruth) {
        if (!taskTruth) return false;
        return (!criteriaTruth.minFreq || taskTruth.f >= criteriaTruth.minFreq) &&
            (!criteriaTruth.minConf || taskTruth.c >= criteriaTruth.minConf);
    }

    getNAR() {
        return this.nar;
    }

    input(termStr, freq = 0.9, conf = 0.9) {
        this.operations.push({type: 'input', termStr, freq, conf});
        return this;
    }

    run(cycles = 1) {
        this.operations.push({type: 'run', cycles});
        return this;
    }

    expect(termStr) {
        // If termStr is already a TaskMatch instance, use it directly
        // Otherwise, create a new TaskMatch with the provided term string
        const matcher = termStr instanceof TaskMatch ? termStr : new TaskMatch(termStr);
        this.operations.push({type: 'expect', matcher, shouldExist: true});
        return this;
    }

    expectNot(termStr) {
        // If termStr is already a TaskMatch instance, use it directly
        // Otherwise, create a new TaskMatch with the provided term string
        const matcher = termStr instanceof TaskMatch ? termStr : new TaskMatch(termStr);
        this.operations.push({type: 'expect', matcher, shouldExist: false});
        return this;
    }
    
    // Provide convenience methods for consistent API
    expectWithPunct(termStr, punct) {
        return this.expect(new TaskMatch(termStr).withPunctuation(punct));
    }
    
    expectWithTruth(termStr, minFreq, minConf) {
        return this.expect(new TaskMatch(termStr).withTruth(minFreq, minConf));
    }
    
    expectWithFlexibleTruth(termStr, expectedFreq, expectedConf, tolerance) {
        return this.expect(new TaskMatch(termStr).withFlexibleTruth(expectedFreq, expectedConf, tolerance));
    }

    async execute() {
        // Dynamically import NAR to avoid circular dependencies
        const {NAR} = await import('../nar/NAR.js');

        // Use optimized config for tests to improve performance
        const config = {
            performance: {
                useOptimizedCycle: true,
                cycle: {
                    maxTaskCacheSize: 1000, // Keep at default or reasonable value
                    maxInferenceCacheSize: 500, // Keep at reasonable value
                    batchProcessingEnabled: false // Disable batching for simpler test flow
                }
            },
            reasoning: {
                maxCombinations: 25, // Smaller limit for tests (was 100, now 50)
                maxRuleApplications: 50, // Smaller limit for tests (was 1000, now 100)
                maxTasksPerBatch: 5, // Smaller batches for tests (was 50, now 10)
                useStreamReasoner: true, // Enable stream-based reasoning for tests
                cpuThrottleInterval: 0, // No CPU throttling in tests to improve performance
                maxDerivationDepth: 5 // Limit derivation depth for tests
            },
            cycle: {
                delay: 1 // Minimum delay to pass validation but still optimized for tests
            }
        };

        this.nar = new NAR(config);
        await this.nar.initialize(); // Initialize the NAR to ensure components are set up

        // Process operations first
        const expectations = [];

        for (const op of this.operations) {
            switch (op.type) {
                case 'input':
                    try {
                        // Format input with truth values: "term. %freq;conf%"
                        const inputStr = `${op.termStr}. %${op.freq};${op.conf}%`;
                        await this.nar.input(inputStr);
                    } catch (error) {
                        this.logger?.warn(`Input failed: ${op.termStr}`, error);
                    }
                    break;

                case 'run':
                    // For stream reasoner, run iterative steps with enhanced processing
                    for (let i = 0; i < op.cycles; i++) {
                        await this.nar.step();
                    }
                    break;

                case 'expect':
                    expectations.push(op);
                    break;
            }
        }

        // Run additional reasoning cycles after all inputs to allow for inference
        // Execute multiple steps to make sure processing happens
        if (this.nar.streamReasoner) {
            for (let i = 0; i < 50; i++) {  // Run additional steps to allow for derivations
                await this.nar.step();
            }
        }

        // Collect tasks emitted by the system
        let collectedTasks = [];
        
        // Get tasks from memory and focus
        if (this.nar.memory) {
            collectedTasks = this.nar.memory.getAllConcepts().flatMap(c => c.getAllTasks());
        }

        // Also check focus for tasks that might not be in memory yet
        if (this.nar._focus) {
            const focusTasks = this.nar._focus.getTasks(1000);
            collectedTasks = [...collectedTasks, ...focusTasks];
        }

        // Get all tasks from memory and focus to catch derived results
        let allTasks = [...collectedTasks]; // Start with collected tasks
        
        // Also get tasks from memory and focus to ensure nothing is missed
        if (this.nar.memory) {
            const memoryTasks = this.nar.memory.getAllConcepts().flatMap(c => c.getAllTasks());
            allTasks = [...allTasks, ...memoryTasks];
        }

        // Also check focus for tasks that might not be in memory yet
        if (this.nar._focus) {
            const focusTasks = this.nar._focus.getTasks(1000);
            allTasks = [...allTasks, ...focusTasks];
        }

        // Remove duplicates based on term and stamp
        const uniqueTasks = [];
        const seen = new Set();

        for (const task of allTasks) {
            const key = task.term?.toString() + (task.stamp?.id || '');
            if (!seen.has(key)) {
                seen.add(key);
                uniqueTasks.push(task);
            }
        }

        allTasks = uniqueTasks;

        // Validate expectations
        for (const exp of expectations) {
            const {matcher, shouldExist} = exp;

            let found = false;
            for (const task of allTasks) {
                if (await matcher.matches(task)) {
                    found = true;
                    break;
                }
            }

            if ((shouldExist && !found) || (!shouldExist && found)) {
                const taskList = allTasks.length
                    ? allTasks.map(t => `  - ${t.toString()}`).join('\n')
                    : '  (None)';

                throw new Error(`
          ==================== TEST FAILED ====================
          Expectation: ${shouldExist ? 'FIND' : 'NOT FIND'} a task matching criteria.
          Criteria: Term="${matcher.termFilter}", MinFreq="${matcher.minFreq}", MinConf="${matcher.minConf}"

          ----- All Tasks (${allTasks.length}) -----
${taskList}
          ---------------------------------------------------
        `);
            }
        }

        // Properly dispose of the NAR to avoid Jest teardown issues
        if (this.nar) {
            try {
                await this.nar.dispose();
            } catch (disposeError) {
                // Log disposal errors but don't fail the test
                console.warn('Warning during NAR disposal:', disposeError.message);
            }
        }

        return true;
    }


}