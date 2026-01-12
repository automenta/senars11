import { Component } from './Component.js';

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

    update(metrics = {}) {
        const { performance: perf = {}, resourceUsage: res = {}, taskProcessing: proc = {}, reasoningSteps: steps = 0, uptime = 0 } = metrics;

        this.metrics = {
            throughput: perf.throughput ?? 0,
            memoryUtilization: res.heapTotal ? res.heapUsed / res.heapTotal : 0,
            successRate: proc.totalProcessed ? proc.successful / proc.totalProcessed : 0,
            cycleCount: steps,
            avgLatency: perf.avgLatency ?? 0,
            uptime
        };
        this.render();
    }

    render() {
        if (!this.container) return;
        const { throughput, memoryUtilization, successRate, avgLatency, uptime } = this.metrics;
        const memory = (memoryUtilization * 100).toFixed(1);
        const heartbeatClass = throughput > 0 ? 'beating' : '';

        // Add styles once
        if (!this.container.querySelector('style')) {
            this.container.innerHTML = `
                <style>
                    @keyframes heartbeat { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.2); opacity: 1; text-shadow: 0 0 5px red; } 100% { transform: scale(1); opacity: 0.8; } }
                    .beating { animation: heartbeat 1s infinite; }
                    .metric-heart { font-size: 1.2em; margin-right: 5px; color: #ff4444; }
                </style>
                <div class="metrics-grid"></div>`;
        }

        this.container.querySelector('.metrics-grid').innerHTML = `
            <div class="metric-item">
                <span class="metric-heart ${heartbeatClass}">♥</span><span class="metric-label">Heartbeat</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Throughput</span><span class="metric-value">${throughput.toFixed(2)} <small>ops/s</small></span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Memory</span>
                <div class="progress-bar"><div class="progress-fill ${this.getMemoryColor(memoryUtilization)}" style="width: ${memory}%"></div></div>
                <span class="metric-sub">${memory}%</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Success Rate</span><span class="metric-value">${(successRate * 100).toFixed(1)}%</span>
            </div>
             <div class="metric-item">
                <span class="metric-label">Avg Latency</span><span class="metric-value">${avgLatency.toFixed(2)} <small>ms</small></span>
            </div>
            <div class="metric-item full-width">
                <span class="metric-label">Uptime</span><span class="metric-value">${Math.floor(uptime / 1000)}s</span>
            </div>
        `;
    }

    getMemoryColor(usage) {
        return usage > 0.8 ? 'danger' : usage > 0.6 ? 'warning' : 'success';
    }
}
