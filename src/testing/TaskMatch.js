/**
 * @file TaskMatch.js
 * @description Shared TaskMatch class for test frameworks
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
        if (this.termFilter && !await this._checkTermMatch(task)) {
            return false;
        }

        // Check punctuation match
        if (this.punctuationFilter && !this._checkPunctuationMatch(task)) {
            return false;
        }

        // Check truth values
        if (!this._checkTruthValues(task)) {
            return false;
        }

        // Check flexible truth matching if specified
        if (!this._checkFlexibleTruth(task)) {
            return false;
        }

        // Check range-based truth matching if specified
        if (!this._checkRangeTruth(task)) {
            return false;
        }

        return true;
    }

    async _checkTermMatch(task) {
        const {NarseseParser} = await import('../parser/NarseseParser.js');
        const {TermFactory} = await import('../term/TermFactory.js');
        const termFactory = new TermFactory();
        const parser = new NarseseParser(termFactory);
        const expectedTerm = parser.parse(this.termFilter + '.').term;
        return task.term?.equals(expectedTerm);
    }

    _checkPunctuationMatch(task) {
        const expectedType = this._punctToType(this.punctuationFilter);
        return task.type === expectedType;
    }

    _checkTruthValues(task) {
        if (this.minFreq !== null && task.truth?.f < this.minFreq) {
            return false;
        }
        if (this.minConf !== null && task.truth?.c < this.minConf) {
            return false;
        }
        return true;
    }

    _checkFlexibleTruth(task) {
        if (this.expectedFreq === null || this.expectedConf === null || this.tolerance === null || !task.truth) {
            return true; // Not applicable
        }

        const freqDiff = Math.abs(task.truth.f - this.expectedFreq);
        const confDiff = Math.abs(task.truth.c - this.expectedConf);
        return freqDiff <= this.tolerance && confDiff <= this.tolerance;
    }

    _checkRangeTruth(task) {
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
 * Task matcher for remote test expectations with WebSocket-specific handling
 */
export class RemoteTaskMatch extends TaskMatch {
    constructor(term) {
        super(term);
    }

    async matches(task) {
        // Check term match
        if (this.termFilter) {
            // Import parser and factory to properly compare terms
            const {NarseseParser} = await import('../parser/NarseseParser.js');
            const {TermFactory} = await import('../term/TermFactory.js');

            const termFactory = new TermFactory();
            const parser = new NarseseParser(termFactory);

            // Parse the expected term filter
            let expectedParsedTerm;
            try {
                // The termFilter is expected in external format like "<a ==> b>", so we need punctuation
                const termWithPunct = this.termFilter + (this.termFilter.endsWith('.') || this.termFilter.endsWith('!') || this.termFilter.endsWith('?') ? '' : '.');
                expectedParsedTerm = parser.parse(termWithPunct).term;
            } catch (parseError) {
                console.warn(`Could not parse expected term filter: ${this.termFilter}`, parseError);
                return false;
            }

            // The task.term from WebSocket is raw data, so we need to handle it properly
            // For the WebSocket pathway, we receive the actual term string in a format that can be parsed
            let actualParsedTerm = null;
            try {
                // Check if the task is already a properly formed term string that can be parsed
                const taskTermStr = task.term?._name || task.term || 'unknown';
                if (taskTermStr !== 'unknown') {
                    // Try to parse the task term from server (it might be in internal format)
                    // Try both external format <...> and internal format (...)
                    if (typeof taskTermStr === 'string') {
                        let parseString = taskTermStr;
                        // If it's in internal format like (==> a b), we might need to convert to external format
                        if (taskTermStr.startsWith('(') && taskTermStr.includes(',') && taskTermStr.endsWith(')')) {
                            // Convert internal format (==> a b) to external format <a ==> b>
                            const content = taskTermStr.substring(1, taskTermStr.length - 1); // remove ()
                            const parts = content.split(',');
                            if (parts.length >= 3) {
                                const op = parts[0].trim();
                                const args = parts.slice(1).map(arg => arg.trim());
                                parseString = `<${args.join(` ${op} `)}>`;
                            }
                        }
                        actualParsedTerm = parser.parse(parseString + '.').term;
                    }
                }
            } catch (parseError) {
                // If we can't parse the actual term, we may need to handle raw data differently
                console.warn(`Could not parse actual task term:`, task.term, parseError);
                // As fallback, attempt to match based on string
                const taskTermStr = task.term?._name || task.term || String(task.term || '');
                return taskTermStr.includes(this.termFilter.replace(/[<>]/g, ''));
            }

            // Compare the parsed terms with strict equality only
            if (actualParsedTerm && expectedParsedTerm) {
                return actualParsedTerm.equals(expectedParsedTerm);
            } else {
                return false;
            }
        }

        // Check punctuation match
        if (this.punctuationFilter) {
            // Remote tasks may have different format, need to determine type from context
            // For now, assume it's a BELIEF if no type is explicitly provided
            const taskType = task.type || 'BELIEF';
            const expectedType = this._punctToType(this.punctuationFilter);
            if (taskType !== expectedType) {
                return false;
            }
        }

        // Check truth values - remote tasks may have different field names
        const taskTruth = task.truth;
        if (!taskTruth) {
            return false;
        }

        // Handle different truth field names that might come from the server
        const frequency = taskTruth.frequency || taskTruth.f || taskTruth.freq || 0;
        const confidence = taskTruth.confidence || taskTruth.c || taskTruth.conf || 0;

        // Check truth values with min/max constraints
        if (this.minFreq !== null && frequency < this.minFreq) {
            return false;
        }
        if (this.minConf !== null && confidence < this.minConf) {
            return false;
        }

        // Check flexible truth matching if specified
        if (this.expectedFreq !== null && this.expectedConf !== null && this.tolerance !== null) {
            const freqDiff = Math.abs(frequency - this.expectedFreq);
            const confDiff = Math.abs(confidence - this.expectedConf);
            if (freqDiff > this.tolerance || confDiff > this.tolerance) {
                return false;
            }
        }

        // Check range-based truth matching if specified
        if (this.minFreq !== null && this.maxFreq !== null &&
            (frequency < this.minFreq || frequency > this.maxFreq)) {
            return false;
        }
        if (this.minConf !== null && this.maxConf !== null &&
            (confidence < this.minConf || confidence > this.maxConf)) {
            return false;
        }

        return true;
    }
}