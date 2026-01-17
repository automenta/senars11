import { Component } from '../Component.js';
import cytoscape from 'cytoscape';

export class SimpleGraphWidget extends Component {
    constructor(container, data = []) {
        super(container);
        this.data = data;
        this.cy = null;
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';
        this.container.style.cssText = 'height: 300px; width: 100%; background: #1e1e1e; border: 1px solid var(--border-color); position: relative; border-radius: 4px; overflow: hidden;';

        const graphDiv = document.createElement('div');
        graphDiv.style.cssText = 'width: 100%; height: 100%;';
        this.container.appendChild(graphDiv);

        // Defer initialization to ensure container is in DOM and has dimensions
        setTimeout(() => this.initCy(graphDiv), 100);
    }

    initCy(container) {
        // Convert simple data to cytoscape elements if needed, or expect standard format
        // Supports [{id:'a'}, {source:'a', target:'b'}]
        const elements = this.data.map(d => {
            if (d.source && d.target) {
                return {
                    group: 'edges',
                    data: {
                        id: d.id || `${d.source}-${d.target}`,
                        source: d.source,
                        target: d.target,
                        label: d.label || ''
                    }
                };
            }
            return {
                group: 'nodes',
                data: {
                    id: d.id,
                    label: d.label || d.id
                }
            };
        });

        try {
            this.cy = cytoscape({
                container: container,
                elements: elements,
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#00bcd4',
                            'label': 'data(label)',
                            'color': '#fff',
                            'font-size': '10px',
                            'text-valign': 'center',
                            'text-halign': 'center',
                            'width': 30,
                            'height': 30,
                            'border-width': 1,
                            'border-color': '#fff'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 2,
                            'line-color': '#555',
                            'target-arrow-color': '#555',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier',
                            'label': 'data(label)',
                            'font-size': '8px',
                            'color': '#aaa',
                            'text-rotation': 'autorotate',
                            'text-background-opacity': 1,
                            'text-background-color': '#1e1e1e',
                            'text-background-padding': '2px'
                        }
                    }
                ],
                layout: {
                    name: 'cose',
                    animate: false,
                    padding: 30
                }
            });

            // Controls
            const controls = document.createElement('div');
            controls.className = 'graph-overlay-controls';

            const fitBtn = document.createElement('button');
            fitBtn.innerHTML = '⤢';
            fitBtn.title = 'Fit View';
            fitBtn.onclick = () => this.cy.fit();

            controls.appendChild(fitBtn);
            this.container.appendChild(controls);

        } catch (e) {
            console.error('Error initializing SimpleGraphWidget:', e);
            container.innerHTML = `<div style="padding:10px; color:red;">Error: ${e.message}</div>`;
        }
    }
}
