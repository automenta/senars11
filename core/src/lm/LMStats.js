export class LMStats {
    constructor() {
        this.totalCalls = 0;
        this.totalTokens = 0;
        this.avgResponseTime = 0;
        this.avgFirstTokenLatency = 0;
        this.avgTokensPerSecond = 0;
        this.peakMemoryUsage = 0;
        this.providerUsage = new Map();
    }

    _countTokens(text) {
        return typeof text === 'string' ? text.split(/\s+/).filter(token => token.length > 0).length : 0;
    }

    update(prompt, result, providerId, startTime, firstTokenTime = null) {
        this.totalCalls++;
        const resultTokens = this._countTokens(result);
        this.totalTokens += this._countTokens(prompt) + resultTokens;

        const responseTime = Date.now() - startTime;
        this.avgResponseTime = (this.avgResponseTime * (this.totalCalls - 1) + responseTime) / this.totalCalls;

        // Track Time To First Token (TTFT) if provided
        if (firstTokenTime !== null) {
            const ttft = firstTokenTime - startTime;
            this.avgFirstTokenLatency = (this.avgFirstTokenLatency * (this.totalCalls - 1) + ttft) / this.totalCalls;
        }

        // Calculate tokens per second for this call
        if (responseTime > 0 && resultTokens > 0) {
            const tokensPerSec = (resultTokens / responseTime) * 1000;
            this.avgTokensPerSecond = (this.avgTokensPerSecond * (this.totalCalls - 1) + tokensPerSec) / this.totalCalls;
        }

        const usage = this.providerUsage.get(providerId) ?? {calls: 0, tokens: 0, avgLatency: 0};
        usage.calls++;
        usage.tokens += resultTokens;
        usage.avgLatency = (usage.avgLatency * (usage.calls - 1) + responseTime) / usage.calls;
        this.providerUsage.set(providerId, usage);

        // Memory tracking hook (to be implemented with actual memory profiling)
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const memUsage = process.memoryUsage().heapUsed;
            if (memUsage > this.peakMemoryUsage) {
                this.peakMemoryUsage = memUsage;
            }
        }
    }

    getMetrics(providerCount) {
        return {
            providerCount,
            lmStats: {
                totalCalls: this.totalCalls,
                totalTokens: this.totalTokens,
                avgResponseTime: this.avgResponseTime,
                avgFirstTokenLatency: this.avgFirstTokenLatency,
                avgTokensPerSecond: this.avgTokensPerSecond,
                peakMemoryUsageMB: Math.round(this.peakMemoryUsage / 1024 / 1024),
            },
            providerUsage: new Map(this.providerUsage)
        };
    }
}
