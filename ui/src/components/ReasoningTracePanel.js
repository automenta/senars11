import {Component} from './Component.js';

export class ReasoningTracePanel extends Component {
    constructor(containerId) {
        super(containerId);
        this.traces = [];
        this.maxTraces = 50;
        this.filterTerm = '';
        this.contentContainer = null;
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

        // One-time setup of structure
        if (!this.contentContainer) {
            this.container.innerHTML = '';
            this.container.style.display = 'flex';
            this.container.style.flexDirection = 'column';

            // Filter Header
            const header = document.createElement('div');
            header.style.padding = '8px';
            header.style.borderBottom = '1px solid #333';
            header.style.backgroundColor = '#252526';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Filter traces (e.g. "cat", "Deduction")...';
            input.style.width = '100%';
            input.style.padding = '6px';
            input.style.backgroundColor = '#1e1e1e';
            input.style.border = '1px solid #3c3c3c';
            input.style.color = '#dcdcdc';
            input.style.borderRadius = '4px';
            input.style.fontFamily = 'monospace';

            input.addEventListener('input', (e) => {
                this.filterTerm = e.target.value.toLowerCase();
                this.renderList();
            });

            header.appendChild(input);
            this.container.appendChild(header);

            // List Container
            this.contentContainer = document.createElement('div');
            this.contentContainer.className = 'trace-list';
            this.contentContainer.style.flex = '1';
            this.contentContainer.style.overflowY = 'auto';
            this.container.appendChild(this.contentContainer);
        }

        this.renderList();
    }

    renderList() {
        if (!this.contentContainer) return;

        const filtered = this.traces.filter(trace => {
            if (!this.filterTerm) return true;
            const taskStr = this.getTaskString(trace).toLowerCase();
            const sourceStr = (trace.source || '').toLowerCase();
            return taskStr.includes(this.filterTerm) || sourceStr.includes(this.filterTerm);
        });

        if (filtered.length === 0) {
            this.contentContainer.innerHTML = '<div class="empty-state">No matching traces</div>';
            return;
        }

        const html = filtered.map(trace => {
            const time = new Date(trace.timestamp).toLocaleTimeString();
            const taskStr = this.getTaskString(trace);
            const truthStr = this.getTruthString(trace);

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

        this.contentContainer.innerHTML = html;
    }

    getTaskString(trace) {
        if (typeof trace.task === 'string') return trace.task;
        if (trace.task && trace.task.term) return trace.task.term.toString();
        return JSON.stringify(trace.task);
    }

    getTruthString(trace) {
        if (trace.task && trace.task.truth) {
            const {frequency, confidence} = trace.task.truth;
            return `{${frequency.toFixed(2)}, ${confidence.toFixed(2)}}`;
        }
        return '';
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
