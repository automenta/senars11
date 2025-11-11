import {EventEmitter} from 'events';
import blessed from 'blessed';

/**
 * Metrics Dashboard Component - Shows system metrics and intelligence metrics
 */
export class MetricsDashboardComponent {
    constructor(options = {}) {
        this.elementConfig = options.elementConfig || {};
        this.parent = options.parent;
        this.eventEmitter = options.eventEmitter;
        this.engine = options.engine;
        this.element = null;
        this.updateInterval = null;
    }

    init() {
        this.element = blessed.box({
            ...this.elementConfig,
            tags: true,
            border: {type: 'line'},
            style: {
                fg: 'white',
                bg: 'black',
                border: {fg: 'blue'}
            }
        });

        this.parent.append(this.element);

        // Start periodic updates
        this.updateInterval = setInterval(() => {
            this.updateContent();
        }, 2000); // Update every 2 seconds

        return this;
    }

    updateContent() {
        if (!this.engine || !this.element) return;

        try {
            // Gather metrics from the engine and NAR
            const metrics = this._gatherMetrics();
            const content = this._formatMetrics(metrics);
            
            this.element.setContent(content);
            this.parent.render();
        } catch (error) {
            this.element.setContent(`📊 Metrics Error: ${error.message}`);
            this.parent.render();
        }
    }

    _gatherMetrics() {
        const metrics = {
            system: {
                cycles: 0,
                tasksProcessed: 0,
                rulesApplied: 0
            },
            intelligence: {
                knowledgeBaseSize: 0,
                avgBeliefConfidence: 0,
                inferenceDepth: 0,
                lmNalAgreement: 0
            },
            resources: {
                memory: 0,
                connections: 0,
                cacheHitRate: 0
            }
        };

        // Get metrics from engine and NAR
        if (this.engine.getStats) {
            const engineStats = this.engine.getStats();
            metrics.system = {
                cycles: engineStats.cycleCount || 0,
                tasksProcessed: engineStats.tasksProcessed || 0,
                rulesApplied: engineStats.rulesApplied || 0
            };
        }

        // Get beliefs and calculate intelligence metrics
        if (this.engine.getBeliefs) {
            const beliefs = this.engine.getBeliefs();
            metrics.intelligence.knowledgeBaseSize = beliefs.length;
            
            if (beliefs.length > 0) {
                const totalConfidence = beliefs.reduce((sum, belief) => {
                    return sum + (belief.truth?.confidence || 0);
                }, 0);
                metrics.intelligence.avgBeliefConfidence = totalConfidence / beliefs.length;
            }
        }

        // Add LM-specific metrics if available
        if (this.engine.agentLM && this.engine.agentLM.getMetrics) {
            const lmMetrics = this.engine.agentLM.getMetrics();
            metrics.resources.connections = lmMetrics.providerCount || 0;
        }

        return metrics;
    }

    _formatMetrics(metrics) {
        const content = `📊 System Metrics
 ┣━ Cycles: {bold}${metrics.system.cycles}{/bold}
 ┣━ Tasks Processed: {bold}${metrics.system.tasksProcessed}{/bold}
 ┗━ Rules Applied: {bold}${metrics.system.rulesApplied}{/bold}

🧠 Intelligence Metrics  
 ┣━ Knowledge Base: {bold}${metrics.intelligence.knowledgeBaseSize}{/bold} concepts
 ┣━ Avg. Belief Confidence: {bold}${metrics.intelligence.avgBeliefConfidence.toFixed(2)}{/bold}
 ┗━ Inference Depth: {bold}N/A{/bold} (avg)

💾 Resource Usage
 ┣━ Active Connections: {bold}${metrics.resources.connections}{/bold}
 ┗━ Cache Hit Rate: {bold}${metrics.resources.cacheHitRate || 'N/A'}{/bold}`;
        
        return content;
    }

    getElement() {
        return this.element;
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}