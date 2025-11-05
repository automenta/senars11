/**
 * @file TestNAR.js
 * @description Simple test framework for NAR functionality
 */

/**
 * Task matcher for test expectations
 */
export class TaskMatch {
    constructor(term) {
        this.termFilter = term || null;
        this.punctuationFilter = null;
        this.minFreq = null;
        this.maxFreq = null;
        this.minConf = null;
        this.maxConf = null;
        this.expectedFreq = null;
        this.expectedConf = null;
        this.tolerance = null;
    }

    withPunctuation(punctuation) {
        this.punctuationFilter = punctuation;
        return this;
    }

    withTruth(minFrequency, minConfidence) {
        this.minFreq = minFrequency;
        this.minConf = minConfidence;
        return this;
    }

    /**
     * Add flexible truth matching with tolerance
     * @param {number} expectedFrequency - Expected frequency value
     * @param {number} expectedConfidence - Expected confidence value
     * @param {number} tolerance - Tolerance for matching (e.g., 0.01 for 1% tolerance)
     * @returns {TaskMatch} - Returns this for method chaining
     */
    withFlexibleTruth(expectedFrequency, expectedConfidence, tolerance) {
        this.expectedFreq = expectedFrequency;
        this.expectedConf = expectedConfidence;
        this.tolerance = tolerance;
        return this;
    }

    async matches(task) {
        // Check term match
        if (this.termFilter) {
            const {NarseseParser} = await import('../parser/NarseseParser.js');
            const {TermFactory} = await import('../term/TermFactory.js');
            const termFactory = new TermFactory();
            const parser = new NarseseParser(termFactory);
            // Add punctuation to satisfy the parser
            const expectedTerm = parser.parse(this.termFilter + '.').term;
            if (!task.term.equals(expectedTerm)) {
                return false;
            }
        }

        // Check punctuation match
        if (this.punctuationFilter) {
            const expectedType = this._punctToType(this.punctuationFilter);
            if (task.type !== expectedType) {
                return false;
            }
        }

        // Check truth values
        if (this.minFreq !== null && task.truth && task.truth.f < this.minFreq) {
            return false;
        }
        if (this.minConf !== null && task.truth && task.truth.c < this.minConf) {
            return false;
        }

        // Check flexible truth matching if specified
        if (this.expectedFreq !== null && this.expectedConf !== null && this.tolerance !== null && task.truth) {
            const freqDiff = Math.abs(task.truth.f - this.expectedFreq);
            const confDiff = Math.abs(task.truth.c - this.expectedConf);
            if (freqDiff > this.tolerance || confDiff > this.tolerance) {
                return false;
            }
        }

        // Check range-based truth matching if specified
        if (this.minFreq !== null && this.maxFreq !== null && task.truth &&
            (task.truth.f < this.minFreq || task.truth.f > this.maxFreq)) {
            return false;
        }
        if (this.minConf !== null && this.maxConf !== null && task.truth &&
            (task.truth.c < this.minConf || task.truth.c > this.maxConf)) {
            return false;
        }

        return true;
    }

    _punctToType(punct) {
        const map = {'.': 'BELIEF', '!': 'GOAL', '?': 'QUESTION'};
        return map[punct] || 'BELIEF';
    }
}

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

    expect(criteria) {
        const matcher = criteria instanceof TaskMatch ? criteria : new TaskMatch(criteria);
        this.operations.push({type: 'expect', matcher, shouldExist: true});
        return this;
    }

    expectNot(criteria) {
        const matcher = criteria instanceof TaskMatch ? criteria : new TaskMatch(criteria);
        this.operations.push({type: 'expect', matcher, shouldExist: false});
        return this;
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
        
        // If trace is enabled, set up event logging
        if (this.trace) {
            this.nar.on('task.input', (data) => {
                this.eventLog.push({ type: 'task.input', data, timestamp: Date.now() });
                console.log('TRACE [task.input]:', data);
            });
            this.nar.on('task.added', (data) => {
                this.eventLog.push({ type: 'task.added', data, timestamp: Date.now() });
                console.log('TRACE [task.added]:', data);
            });
            this.nar.on('streamReasoner.step', (data) => {
                this.eventLog.push({ type: 'streamReasoner.step', data, timestamp: Date.now() });
                console.log('TRACE [streamReasoner.step]:', data);
            });
            this.nar.on('streamReasoner.metrics', (data) => {
                this.eventLog.push({ type: 'streamReasoner.metrics', data, timestamp: Date.now() });
                console.log('TRACE [streamReasoner.metrics]:', data);
            });
            this.nar.on('reasoning.derivation', (data) => {
                this.eventLog.push({ type: 'reasoning.derivation', data, timestamp: Date.now() });
                console.log('TRACE [reasoning.derivation]:', data);
            });
        }

        // Process operations
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
                        // Small delay to allow async processing between steps
                        await new Promise(resolve => setTimeout(resolve, 2));
                    }
                    break;

                case 'expect':
                    expectations.push(op);
                    break;
            }
        }
        
        // Additional reasoning cycles after all inputs to allow for inference
        // Execute multiple steps to make sure processing happens
        if (this.nar.streamReasoner) {
            for (let i = 0; i < 200; i++) {  // Increased from 100 to 200 steps for better coverage
                const stepResults = await this.nar.step();
                
                // Make sure any derived tasks are also added to focus for next steps
                for (const result of stepResults) {
                    if (result && this.nar._focus) {
                        this.nar._focus.addTaskToFocus(result);
                    }
                }
                
                // Small delay to allow async processing
                if (i % 10 === 0) { // Every 10th step, allow more processing time
                    await new Promise(resolve => setTimeout(resolve, 5));
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1)); // Small delay
                }
            }
            
            // Additional wait for any async rules to complete derivations
            await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 300 to 500 ms
        }
        
        // Ensure all derived tasks are properly registered in memory
        await this._ensureDerivedTasksAreProcessed();

        // Get all tasks from memory and focus to catch derived results
        let allTasks = this.nar.memory.getAllConcepts().flatMap(c => c.getAllTasks());
        
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
    
    /**
     * Process all input operations
     */
    async _processInputs() {
        // Process only input operations first
        for (const op of this.operations) {
            if (op.type === 'input') {
                try {
                    // Format input with truth values: "term. %freq;conf%"
                    const inputStr = `${op.termStr}. %${op.freq};${op.conf}%`;
                    await this.nar.input(inputStr);
                } catch (error) {
                    this.logger?.warn(`Input failed: ${op.termStr}`, error);
                }
            }
        }
    }
    
    /**
     * Ensure derived tasks are properly processed into the system
     */
    async _ensureDerivedTasksAreProcessed() {
        // In the new architecture, make sure the focus and memory are synchronized
        // This helps ensure all tasks (input + derived) are available for the test check
        if (this.nar._focus) {
            // Allow any pending operations to complete
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
}