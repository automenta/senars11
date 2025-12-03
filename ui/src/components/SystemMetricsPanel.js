import {Component} from './Component.js';

export class SystemMetricsPanel extends Component {
    constructor(containerId) {
        super(containerId);
        this.metrics = {
            throughput: 0,
            memoryUtilization: 0,
            successRate: 0,
            cycleCount: 0,
            avgLatency: 0
        };
    }

    update(metrics) {
        if (!metrics) return;

        // Parse metrics from the event payload
        const perf = metrics.performance || {};
        const res = metrics.resourceUsage || {};
        const proc = metrics.taskProcessing || {};

        this.metrics = {
            throughput: perf.throughput || 0,
            memoryUtilization: res.heapTotal ? (res.heapUsed / res.heapTotal) : 0,
            successRate: proc.totalProcessed ? (proc.successful / proc.totalProcessed) : 0,
            cycleCount: metrics.reasoningSteps || 0,
            avgLatency: perf.avgLatency || 0,
            uptime: metrics.uptime || 0
        };

        this.render();
    }

    render() {
        if (!this.container) return;

        const throughput = this.metrics.throughput.toFixed(2);
        const memory = (this.metrics.memoryUtilization * 100).toFixed(1);
        const success = (this.metrics.successRate * 100).toFixed(1);
        const latency = this.metrics.avgLatency.toFixed(2);
        const uptime = Math.floor(this.metrics.uptime / 1000);

        this.container.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-item">
                    <span class="metric-label">Throughput</span>
                    <span class="metric-value">${throughput} <small>ops/s</small></span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Memory</span>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getMemoryColor(this.metrics.memoryUtilization)}" style="width: ${memory}%"></div>
                    </div>
                    <span class="metric-sub">${memory}%</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Success Rate</span>
                    <span class="metric-value">${success}%</span>
                </div>
                 <div class="metric-item">
                    <span class="metric-label">Avg Latency</span>
                    <span class="metric-value">${latency} <small>ms</small></span>
                </div>
                <div class="metric-item full-width">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value">${uptime}s</span>
                </div>
            </div>
        `;
    }

    getMemoryColor(usage) {
        if (usage > 0.8) return 'danger';
        if (usage > 0.6) return 'warning';
        return 'success';
    }
}
