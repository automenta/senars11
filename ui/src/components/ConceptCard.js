import { Component } from './Component.js';
import { NarseseHighlighter } from '../utils/NarseseHighlighter.js';

export class ConceptCard extends Component {
    constructor(container, concept, options = {}) {
        super(container);
        this.concept = concept;
        this.compact = options.compact ?? false;
    }

    render() {
        if (!this.container) return;

        const div = document.createElement('div');
        div.className = `concept-card ${this.compact ? 'compact' : 'full'}`;

        const id = this.concept.id ?? this.concept.term;
        const detail = { concept: this.concept, id };

        div.addEventListener('click', () => document.dispatchEvent(new CustomEvent('senars:concept:select', { detail })));
        div.addEventListener('dblclick', () => document.dispatchEvent(new CustomEvent('senars:concept:center', { detail })));

        const term = this.concept.term ?? 'unknown';
        const budget = this.concept.budget ?? {};
        const priority = budget.priority ?? 0;
        const taskCount = this.concept.tasks?.length ?? this.concept.taskCount ?? 0;

        const info = this.compact
            ? `<span title="Tasks">📚${taskCount}</span> <span title="Priority" style="color:${this._getPriorityColor(priority)}">P:${priority.toFixed(2)}</span>`
            : `<span title="Tasks">📚${taskCount}</span> <span title="Priority" style="color:${this._getPriorityColor(priority)}">P:${priority.toFixed(2)}</span> <span title="Durability">D:${(budget.durability ?? 0).toFixed(2)}</span> <span title="Quality">Q:${(budget.quality ?? 0).toFixed(2)}</span>`;

        div.innerHTML = `
            <div class="concept-card-term">
                ${this.compact ? '<span style="opacity: 0.7;">🧠</span> ' : ''}${NarseseHighlighter.highlight(term)}
            </div>
            <div class="concept-card-info">
                ${info}
            </div>
        `;

        this.container.appendChild(div);
        this.elements.card = div;
    }

    _getPriorityColor(val) {
        return val > 0.8 ? 'var(--accent-primary)' : val > 0.5 ? 'var(--accent-warn)' : '#555';
    }
}
