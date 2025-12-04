import {Runner} from './Runner.js';

/**
 * A simple, sequential execution runner that processes reasoning steps in a loop.
 * This avoids complex async streams and backpressure mechanisms, favoring predictability.
 */
export class SimpleRunner extends Runner {
    constructor(reasoner, config = {}) {
        super(reasoner, config);
        this.interval = config.executionInterval ?? 100;
        this.stepTimeout = config.stepTimeout ?? 500;
        this.isRunning = false;
        this.loopPromise = null;
        this.metrics = {
            totalCycles: 0,
            totalDerivations: 0,
            lastDerivationTime: null
        };
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.loopPromise = this._loop();
    }

    async stop() {
        this.isRunning = false;
        if (this.loopPromise) {
            await this.loopPromise;
            this.loopPromise = null;
        }
    }

    async _loop() {
        while (this.isRunning) {
            try {
                const start = Date.now();
                // Perform one reasoning step with configured timeout
                const results = await this.reasoner.step(this.stepTimeout, false);

                this.metrics.totalCycles++;
                if (results?.length > 0) {
                    this.metrics.totalDerivations += results.length;
                    this.metrics.lastDerivationTime = Date.now();
                }

                const elapsed = Date.now() - start;
                const delay = Math.max(10, this.interval - elapsed);

                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
                console.error('SimpleRunner loop error:', error);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    getMetrics() {
        return {
            mode: 'simple',
            ...this.metrics
        };
    }
}
