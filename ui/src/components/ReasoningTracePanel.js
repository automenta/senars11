import {Component} from './Component.js';

export class ReasoningTracePanel extends Component {
    constructor(containerId) {
        super(containerId);
        this.traces = [];
        this.maxTraces = 50;
    }

    addTrace(trace) {
        if (!trace) return;

        // Ensure we have a derived task to show
        const task = trace.derivedTask;
        if (!task) return;

        this.traces.unshift({
            id: Date.now() + Math.random(),
            timestamp: trace.timestamp || Date.now(),
            source: trace.source || 'Unknown',
            task: task, // Object or string
            rule: trace.rule || 'Inference'
        });

        if (this.traces.length > this.maxTraces) {
            this.traces.pop();
        }

        this.render();
    }

    clear() {
        this.traces = [];
        this.render();
    }

    render() {
        if (!this.container) return;

        if (this.traces.length === 0) {
            this.container.innerHTML = '<div class="empty-state">No reasoning traces yet...</div>';
            return;
        }

        const html = this.traces.map(trace => {
            const time = new Date(trace.timestamp).toLocaleTimeString();

            // Format task - assuming it might be an object or string
            let taskStr = '';
            let truthStr = '';

            if (typeof trace.task === 'string') {
                taskStr = trace.task;
            } else if (trace.task && trace.task.term) {
                taskStr = trace.task.term.toString();
                if (trace.task.truth) {
                    const {frequency, confidence} = trace.task.truth;
                    truthStr = `{${frequency.toFixed(2)}, ${confidence.toFixed(2)}}`;
                }
            } else {
                taskStr = JSON.stringify(trace.task);
            }

            return `
                <div class="trace-item">
                    <div class="trace-header">
                        <span class="trace-time">${time}</span>
                        <span class="trace-source">${trace.source}</span>
                    </div>
                    <div class="trace-content">
                        <div class="trace-term">${this.escapeHtml(taskStr)}</div>
                        ${truthStr ? `<div class="trace-truth">${truthStr}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        this.container.innerHTML = `<div class="trace-list">${html}</div>`;
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
