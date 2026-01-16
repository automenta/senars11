import { Component } from './Component.js';
import { NarseseHighlighter } from '../utils/NarseseHighlighter.js';

export class ConceptCard extends Component {
    constructor(container, concept) {
        super(container);
        this.concept = concept;
    }

    render() {
        if (!this.container) return;

        const div = document.createElement('div');
        div.className = 'concept-card';
        div.style.cssText = `
            border-left: 4px solid var(--concept-color);
            background: rgba(255, 255, 255, 0.05);
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 0 4px 4px 0;
            cursor: pointer;
            transition: all 0.2s;
        `;

        div.addEventListener('mouseenter', () => {
            div.style.background = 'rgba(255, 255, 255, 0.08)';
            div.style.transform = 'translateX(2px)';
        });
        div.addEventListener('mouseleave', () => {
            div.style.background = 'rgba(255, 255, 255, 0.05)';
            div.style.transform = 'translateX(0)';
        });

        div.addEventListener('click', () => {
             const event = new CustomEvent('senars:concept:select', {
                 detail: { concept: this.concept, id: this.concept.id || this.concept.term } // Ensure ID is passed
             });
             document.dispatchEvent(event);
        });

        div.addEventListener('dblclick', () => {
             const event = new CustomEvent('senars:concept:center', {
                 detail: { concept: this.concept, id: this.concept.id || this.concept.term }
             });
             document.dispatchEvent(event);
        });

        const term = this.concept.term || 'unknown';
        const termHtml = NarseseHighlighter.highlight(term);

        const priority = this.concept.budget?.priority || 0;
        const taskCount = this.concept.tasks ? this.concept.tasks.length : (this.concept.taskCount || 0);

        // Priority Bar
        const priorityPercent = (priority * 100).toFixed(0);
        const priorityColor = this._getPriorityColor(priority);

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">
                <div style="font-weight: bold; font-family: var(--font-mono); font-size: 12px; word-break: break-all;">
                    ${termHtml}
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 10px; font-size: 10px; color: var(--text-muted);">
                    ${taskCount} tasks
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; font-size: 10px; color: var(--text-muted);">
                <div style="flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
                    <div style="width: ${priorityPercent}%; height: 100%; background: ${priorityColor};"></div>
                </div>
                <div>PRI: ${priority.toFixed(2)}</div>
            </div>
        `;

        this.container.appendChild(div);
        this.elements.card = div;
    }

    _getPriorityColor(val) {
        if (val > 0.8) return 'var(--accent-primary)';
        if (val > 0.5) return 'var(--accent-warn)';
        return '#555';
    }
}
