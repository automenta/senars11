import { GraphViewport } from './GraphViewport.js';
import { SemanticZoom } from './SemanticZoom.js';
import { ContextualWidget } from './ContextualWidget.js';

export class ActivityGraph {
    constructor(containerId, widgetContainer) {
        this.viewport = new GraphViewport(containerId);
        this.semanticZoom = new SemanticZoom(this.viewport);
        this.widgetManager = new ContextualWidget(this.viewport, widgetContainer);
    }

    initialize() {
        if (this.viewport.initialize()) {
            this._setupDemoData();
            return true;
        }
        return false;
    }

    addConcept(term, priority, details = {}) {
        this.viewport.addElements({
            group: 'nodes',
            data: {
                id: term,
                label: term,
                weight: priority * 20 + 20,
                ...details
            }
        });

        // Add widget
        const widgetHtml = `
            <div>Prio: ${priority.toFixed(2)}</div>
            <div>Freq: ${(details.frequency || 0).toFixed(2)}</div>
        `;
        this.widgetManager.attach(term, widgetHtml);
    }

    addRelationship(source, target, type) {
        this.viewport.addElements({
            group: 'edges',
            data: {
                source: source,
                target: target,
                label: type
            }
        });
    }

    _setupDemoData() {
        // Create a cluster of concepts
        const concepts = [
            { term: 'bird', priority: 0.9, frequency: 0.8 },
            { term: 'robin', priority: 0.8, frequency: 0.7 },
            { term: 'animal', priority: 0.95, frequency: 0.9 },
            { term: 'wings', priority: 0.7, frequency: 0.6 },
            { term: 'fly', priority: 0.85, frequency: 0.75 }
        ];

        concepts.forEach(c => this.addConcept(c.term, c.priority, { frequency: c.frequency }));

        this.addRelationship('robin', 'bird', 'inheritance');
        this.addRelationship('bird', 'animal', 'inheritance');
        this.addRelationship('bird', 'wings', 'property');
        this.addRelationship('bird', 'fly', 'property');

        this.viewport.fit();
    }
}
