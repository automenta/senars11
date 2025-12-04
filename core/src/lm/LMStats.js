export class LMStats {
    constructor() {
        this.totalCalls = 0;
        this.totalTokens = 0;
        this.avgResponseTime = 0;
        this.providerUsage = new Map();
    }

    _countTokens(text) {
        return typeof text === 'string' ? text.split(/\s+/).filter(token => token.length > 0).length : 0;
    }

    update(prompt, result, providerId, startTime) {
        this.totalCalls++;
        this.totalTokens += this._countTokens(prompt) + this._countTokens(result);
        const responseTime = Date.now() - startTime;
        this.avgResponseTime = (this.avgResponseTime * (this.totalCalls - 1) + responseTime) / this.totalCalls;

        const usage = this.providerUsage.get(providerId) ?? {calls: 0, tokens: 0};
        usage.calls++;
        usage.tokens += this._countTokens(result);
        this.providerUsage.set(providerId, usage);
    }

    getMetrics(providerCount) {
        return {
            providerCount,
            lmStats: {
                totalCalls: this.totalCalls,
                totalTokens: this.totalTokens,
                avgResponseTime: this.avgResponseTime,
            },
            providerUsage: new Map(this.providerUsage)
        };
    }
}
