export class CognitiveDiversity {
    constructor(termFactory) {
        this.termFactory = termFactory;
        this.registeredTerms = new Map();
        this.diversityMetrics = this._getDefaultMetrics();
    }

    registerTerm(term) {
        if (term?.name) {
            this.registeredTerms.set(term.name, this.termFactory.getComplexity(term));
            this._updateMetrics();
        }
    }

    unregisterTerm(termName) {
        this.registeredTerms.delete(termName);
        this._updateMetrics();
    }

    _updateMetrics() {
        if (!this.registeredTerms.size) {
            this.diversityMetrics = this._getDefaultMetrics();
            return;
        }

        const complexities = Array.from(this.registeredTerms.values());
        const variety = this._calculateVariety(complexities);
        const averageComplexity = complexities.length
            ? complexities.reduce((sum, val) => sum + val, 0) / complexities.length
            : 0;
        const diversityScore = variety * (1 + Math.log(averageComplexity + 1));

        this.diversityMetrics = {
            complexityDistribution: this._calculateComplexityDistribution(complexities),
            diversityScore,
            variety,
            averageComplexity,
            totalTerms: complexities.length
        };
    }

    calculateDiversity() {
        return this.diversityMetrics;
    }

    _calculateComplexityDistribution(complexities) {
        const distribution = new Map();
        for (const complexity of complexities) {
            distribution.set(complexity, (distribution.get(complexity) || 0) + 1);
        }
        return distribution;
    }

    _calculateVariety(complexities) {
        if (!complexities.length) return 0;

        const counts = new Map();
        for (const complexity of complexities) {
            counts.set(complexity, (counts.get(complexity) || 0) + 1);
        }

        let variety = 0;
        for (const count of counts.values()) {
            const probability = count / complexities.length;
            variety -= probability * Math.log2(probability);
        }
        return variety;
    }

    getMetrics() {
        return {...this.diversityMetrics};
    }

    getRegisteredTermNames() {
        return Array.from(this.registeredTerms.keys());
    }

    isHighDiversity(threshold = 1.5) {
        return this.diversityMetrics.diversityScore > threshold;
    }

    isLowDiversity(threshold = 0.5) {
        return this.diversityMetrics.diversityScore < threshold;
    }

    suggestDiversityTerm() {
        const currentComplexities = Array.from(this.diversityMetrics.complexityDistribution.keys())
            .sort((a, b) => a - b);

        if (!currentComplexities.length) {
            return {suggestedComplexity: 1, reason: 'No terms exist, suggest simple term'};
        }

        if (this.isLowDiversity()) {
            const avg = this.diversityMetrics.averageComplexity;
            return {
                suggestedComplexity: avg < 3 ? 5 : 1,
                reason: 'Low diversity detected, suggesting contrasting complexity'
            };
        }

        for (let i = 1; i <= Math.max(...currentComplexities) + 2; i++) {
            if (!currentComplexities.includes(i)) {
                return {
                    suggestedComplexity: i,
                    reason: `Gap found in complexity distribution at ${i}`
                };
            }
        }

        return {
            suggestedComplexity: Math.max(...currentComplexities) + 2,
            reason: 'No gaps found, suggesting higher complexity'
        };
    }

    complexityDistance(term1, term2) {
        return Math.abs(this.termFactory.getComplexity(term1) - this.termFactory.getComplexity(term2));
    }

    getDiversityContributors(topN = 5) {
        if (!this.registeredTerms.size) return [];
        return Array.from(this.registeredTerms.entries())
            .map(([termName, complexity]) => ({
                termName,
                complexity,
                contribution: Math.abs(complexity - this.diversityMetrics.averageComplexity)
            }))
            .sort((a, b) => b.contribution - a.contribution)
            .slice(0, topN);
    }

    evaluateDiversity(term) {
        if (!term?.name) return {diversityImpact: 0, normalizationFactor: 1};

        const termComplexity = this.termFactory.getComplexity(term);
        const {averageComplexity: currentAvg, variety: currentVariety} = this.diversityMetrics;
        const complexityDistanceFromAvg = Math.abs(termComplexity - currentAvg);

        return {
            diversityImpact: complexityDistanceFromAvg / (currentAvg || 1),
            normalizationFactor: currentVariety < 1 ? 1.5 : 1,
            contribution: complexityDistanceFromAvg
        };
    }

    _getDefaultMetrics() {
        return {
            complexityDistribution: new Map(),
            diversityScore: 0,
            variety: 0,
            averageComplexity: 0,
            totalTerms: 0
        };
    }

    clear() {
        this.registeredTerms.clear();
        this._updateMetrics();
    }
}