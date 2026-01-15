import { Component } from './Component.js';
import { GraphConfig } from '../config/GraphConfig.js';

export class DerivationTree extends Component {
    constructor(container) {
        super(container);
        this.cy = null;
        this.maxNodes = 50; // Limit to prevent clutter
    }

    initialize() {
        if (!this.container) return;

        // Create wrapper
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';

        const cyContainer = document.createElement('div');
        cyContainer.style.width = '100%';
        cyContainer.style.height = '100%';
        this.container.appendChild(cyContainer);

        const colors = GraphConfig.COLORS;

        this.cy = cytoscape({
            container: cyContainer,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#333',
                        'label': 'data(label)',
                        'color': '#aaa',
                        'font-family': 'monospace',
                        'font-size': '10px',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'text-wrap': 'wrap',
                        'width': 'label',
                        'height': 'label',
                        'padding': '10px',
                        'shape': 'round-rectangle',
                        'border-width': 1,
                        'border-color': '#555'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#444',
                        'target-arrow-color': '#444',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'arrow-scale': 0.8
                    }
                },
                {
                    selector: 'node[type="premise"]',
                    style: {
                        'background-color': '#2a2a2a',
                        'border-color': colors.CONCEPT,
                        'color': colors.CONCEPT
                    }
                },
                {
                    selector: 'node[type="conclusion"]',
                    style: {
                        'background-color': '#2a2a2a',
                        'border-color': colors.HIGHLIGHT,
                        'color': colors.HIGHLIGHT,
                        'font-weight': 'bold'
                    }
                },
                {
                    selector: 'node[type="rule"]',
                    style: {
                        'background-color': '#222',
                        'border-color': '#666',
                        'shape': 'ellipse',
                        'width': 30,
                        'height': 30,
                        'font-size': '8px'
                    }
                }
            ],
            layout: {
                name: 'breadthfirst',
                directed: true,
                padding: 10,
                spacingFactor: 1.5
            }
        });

        this.cy.on('tap', 'node', (evt) => {
            const node = evt.target;
            console.log('Clicked derivation node:', node.data());
        });

        // Handle resizing
        if (window.ResizeObserver) {
            new ResizeObserver(() => {
                this.cy.resize();
                this.cy.fit();
            }).observe(this.container);
        }
    }

    addDerivation(data) {
        if (!this.cy) return;

        // data structure expected: { input, knowledge, derived, rule }
        // Each of input/knowledge/derived should have { id, term, truth }

        const { input, knowledge, derived, rule } = data;
        if (!derived) return;

        const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        // Add Rule Node (Center)
        this.cy.add({
            group: 'nodes',
            data: { id: ruleId, label: rule || 'Rule', type: 'rule' }
        });

        // Helper to add premise/conclusion
        const addTermNode = (termData, type) => {
            if (!termData) return null;
            const id = termData.id || `term_${Math.abs(this._hash(termData.term))}`;

            // Check if exists
            if (this.cy.getElementById(id).empty()) {
                this.cy.add({
                    group: 'nodes',
                    data: {
                        id: id,
                        label: this._formatLabel(termData),
                        type: type,
                        fullData: termData
                    }
                });
            }
            return id;
        };

        const derivedId = addTermNode(derived, 'conclusion');

        // Edges: Rule -> Derived
        this.cy.add({
            group: 'edges',
            data: { source: ruleId, target: derivedId }
        });

        if (input) {
            const inputId = addTermNode(input, 'premise');
            this.cy.add({ group: 'edges', data: { source: inputId, target: ruleId } });
        }

        if (knowledge) {
            const knowId = addTermNode(knowledge, 'premise');
            this.cy.add({ group: 'edges', data: { source: knowId, target: ruleId } });
        }

        // Prune old nodes if too many
        if (this.cy.nodes().length > this.maxNodes) {
             // Remove oldest derived nodes that are not roots?
             // Simple cleanup: just remove disjoint components or oldest added.
             // For now, let's just re-layout.
        }

        this.cy.layout({
            name: 'breadthfirst',
            directed: true,
            padding: 20,
            spacingFactor: 1.2,
            animate: true
        }).run();
    }

    clear() {
        if (this.cy) this.cy.elements().remove();
    }

    _formatLabel(data) {
        if (!data) return '?';
        let label = data.term || data.label || 'Unknown';
        if (label.length > 20) label = label.substring(0, 18) + '..';
        if (data.truth) {
            label += `\n{${data.truth.frequency?.toFixed(2)}, ${data.truth.confidence?.toFixed(2)}}`;
        }
        return label;
    }

    _hash(str) {
        let hash = 0;
        if (!str) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
}
