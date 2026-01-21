import { Component } from './Component.js';
import { NarseseHighlighter } from '../utils/NarseseHighlighter.js';

export class TaskCard extends Component {
    constructor(container, task, options = {}) {
        super(container);
        this.task = task;
        this.compact = options.compact ?? false;
    }

    render() {
        if (!this.container) return;

        const div = document.createElement('div');
        div.className = `task-card ${this.compact ? 'compact' : 'full'}`;

        div.addEventListener('mouseenter', () => {
            this._dispatchHover(true);
        });
        div.addEventListener('mouseleave', () => {
            this._dispatchHover(false);
        });

        div.addEventListener('click', () => {
            if (this.task) {
                document.dispatchEvent(new CustomEvent('senars:task:select', {
                     detail: { task: this.task }
                }));
            }
        });

        const term = this.task.term ?? this.task.sentence?.term ?? 'unknown';
        const truth = this.task.truth ?? this.task.sentence?.truth;
        const punctuation = this.task.punctuation ?? '.';

        const truthStr = truth
            ? `{${(truth.frequency ?? 0).toFixed(2)} ${(truth.confidence ?? 0).toFixed(2)}}`
            : '';

        div.innerHTML = `
            <div class="task-card-content">
                 ${this.compact ? '<span style="opacity: 0.7;">📝</span>' : ''}
                 ${NarseseHighlighter.highlight(term)}<span class="nars-punctuation">${punctuation}</span>
            </div>
            <div class="task-card-meta">
                ${truthStr}
            </div>
        `;

        this.container.appendChild(div);
        this.elements.card = div;
    }

    _dispatchHover(isHovering) {
        if (this.task) {
            document.dispatchEvent(new CustomEvent('senars:task:hover', {
                detail: { task: this.task, hovering: isHovering }
            }));
        }
    }
}
