import { Component } from './Component.js';
import { GraphConfig } from '../config/GraphConfig.js';

export class DerivationTree extends Component {
    constructor(container) {
        super(container);
        this.cy = null;
        this.maxNodes = 50;
        this.initialized = false;
    }

    initialize() {
        if (!this.container) return;

        // Wait for container to have dimensions
        if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
            console.warn('DerivationTree: Container has 0 dimensions, deferring init via ResizeObserver');
            this._setupResizeObserver();
            return;
        }

        this._initCytoscape();
    }

    _setupResizeObserver() {
         if (window.ResizeObserver) {
            new ResizeObserver((entries) => {
                if (!this.initialized && entries[0].contentRect.width > 0) {
                    this._initCytoscape();
                } else if (this.cy) {
                    this.cy.resize();
                    this.cy.fit();
                }
            }).observe(this.container);
        }
    }

    _initCytoscape() {
        if (this.initialized) return;

        try {
            console.log('DerivationTree: Initializing Cytoscape');
            this.container.innerHTML = '';
            const cyContainer = document.createElement('div');
            cyContainer.style.width = '100%';
            cyContainer.style.height = '100%';
            this.container.appendChild(cyContainer);

            // Use fixed width/height to avoid 'label' warnings and x1 errors
            this.cy = cytoscape({
                container: cyContainer,
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#222',
                            'label': 'data(label)',
                            'color': '#e0e0e0',
                            'font-family': 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
                            'font-size': '10px',
                            'text-valign': 'center',
                            'text-halign': 'center',
                            'text-wrap': 'wrap',
                            'width': 'label',
                            'height': 'label',
                            'padding': '10px',
                            'shape': 'round-rectangle',
                            'border-width': 1,
                            'border-color': '#333',
                            'text-max-width': 150
                        }
                    },
                    {
                        selector: 'node[type="rule"]',
                        style: {
                            'background-color': '#333',
                            'border-color': '#00bcd4', // Cyan for rules
                            'color': '#00bcd4'
                        }
                    },
                    {
                        selector: 'node[type="conclusion"]',
                        style: {
                            'border-color': '#00ff9d', // Green for conclusion
                            'color': '#00ff9d',
                            'font-weight': 'bold'
                        }
                    },
                    {
                        selector: 'node[type="premise"]',
                        style: {
                            'border-color': '#aaa'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 1,
                            'line-color': '#444',
                            'target-arrow-color': '#444',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier',
                            'arrow-scale': 0.8
                        }
                    }
                ],
                layout: {
                    name: 'grid', // Start with grid, switch to breadthfirst on data
                    rows: 1
                }
            });

            this.initialized = true;
            this._setupResizeObserver(); // Ensure we still observe resizing

        } catch (e) {
            console.error('DerivationTree: Failed to init Cytoscape', e);
        }
    }

    addDerivation(data) {
        if (!this.cy || !this.initialized) return;

        // ... existing addDerivation logic ...
        const { input, knowledge, derived, rule } = data;
        if (!derived) return;

        const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        this.cy.add({
            group: 'nodes',
            data: { id: ruleId, label: rule || 'Rule', type: 'rule' }
        });

        const addTermNode = (termData, type) => {
            if (!termData) return null;
            const id = termData.id || `term_${Math.abs(this._hash(termData.term))}`;
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
        this.cy.add({ group: 'edges', data: { source: ruleId, target: derivedId } });

        if (input) {
            const inputId = addTermNode(input, 'premise');
            this.cy.add({ group: 'edges', data: { source: inputId, target: ruleId } });
        }

        if (knowledge) {
            const knowId = addTermNode(knowledge, 'premise');
            this.cy.add({ group: 'edges', data: { source: knowId, target: ruleId } });
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
