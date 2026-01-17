import { Component } from '../Component.js';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';

cytoscape.use(fcose);

export class SimpleGraphWidget extends Component {
    constructor(container, data = []) {
        super(container);
        this.data = data;
        this.cy = null;
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';
        this.container.style.cssText = 'height: 350px; width: 100%; background: #0a0a0c; border: 1px solid var(--border-color); position: relative; border-radius: 4px; overflow: hidden;';

        const graphDiv = document.createElement('div');
        graphDiv.style.cssText = 'width: 100%; height: 100%;';
        this.container.appendChild(graphDiv);

        // Defer initialization to ensure container is in DOM and has dimensions
        setTimeout(() => this.initCy(graphDiv), 100);
    }

    initCy(container) {
        // Prepare vivid elements
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
                    label: d.label || d.id,
                    type: d.type || 'concept',
                    val: d.val || 10
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
                            'background-color': '#111',
                            'label': 'data(label)',
                            'color': '#00ff9d',
                            'font-size': '10px',
                            'text-valign': 'center',
                            'text-halign': 'center',
                            'width': 'mapData(val, 0, 100, 20, 60)',
                            'height': 'mapData(val, 0, 100, 20, 60)',
                            'border-width': 2,
                            'border-color': '#00ff9d',
                            'text-outline-color': '#000',
                            'text-outline-width': 2,
                            'font-family': 'monospace',
                            'text-transform': 'uppercase'
                        }
                    },
                    {
                        selector: 'node[type="task"]',
                        style: {
                            'border-color': '#ffcc00',
                            'color': '#ffcc00'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 2,
                            'line-color': '#333',
                            'target-arrow-color': '#333',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier',
                            'label': 'data(label)',
                            'font-size': '8px',
                            'color': '#555',
                            'text-rotation': 'autorotate',
                            'text-background-opacity': 1,
                            'text-background-color': '#0a0a0c',
                            'text-background-padding': '2px'
                        }
                    },
                    {
                        selector: ':selected',
                        style: {
                            'border-width': 4,
                            'border-color': '#fff',
                            'line-color': '#fff',
                            'target-arrow-color': '#fff',
                            'shadow-blur': 10,
                            'shadow-color': '#fff'
                        }
                    }
                ],
                layout: {
                    name: 'fcose',
                    animate: true,
                    animationDuration: 500,
                    padding: 30,
                    nodeDimensionsIncludeLabels: true,
                    randomize: true
                }
            });

            // Controls Overlay
            const controls = document.createElement('div');
            controls.className = 'graph-overlay-controls';

            const fitBtn = document.createElement('button');
            fitBtn.innerHTML = '⤢';
            fitBtn.title = 'Fit View';
            fitBtn.onclick = () => this.cy.fit();

            const expandBtn = document.createElement('button');
            expandBtn.innerHTML = '🔭';
            expandBtn.title = 'Expand View';
            expandBtn.onclick = () => this.expandView();

            controls.append(fitBtn, expandBtn);
            this.container.appendChild(controls);

        } catch (e) {
            console.error('Error initializing SimpleGraphWidget:', e);
            container.innerHTML = `<div style="padding:10px; color:red;">Error: ${e.message}</div>`;
        }
    }

    updateData(newElements) {
        if (!this.cy) return;
        this.cy.add(newElements);
        this.cy.layout({ name: 'fcose', animate: true }).run();
    }

    expandView() {
        // Simple modal implementation
        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'width:90%;height:90%;background:#0a0a0c;border:1px solid #333;position:relative;border-radius:4px;';

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✖️';
        closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;z-index:10;background:#000;color:#fff;border:1px solid #555;padding:5px 10px;cursor:pointer;';
        closeBtn.onclick = () => document.body.removeChild(backdrop);

        modal.appendChild(closeBtn);
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Clone graph into modal
        const elements = this.cy.json().elements;
        new SimpleGraphWidget(modal, []).render(); // Hacky: init empty then add

        // Wait for render then add elements
        setTimeout(() => {
             // Find the cy instance inside the new widget?
             // Ideally SimpleGraphWidget should be more reusable or return its instance.
             // For now, let's just recreate cytoscape manually in the modal or trust the widget does it.
             // But the new widget instance isn't returned by render().

             // Let's just create a new widget instance properly
             const widget = new SimpleGraphWidget(modal, []);
             widget.render();
             // Manually load elements after delay
             setTimeout(() => {
                 if (widget.cy) {
                     widget.cy.add(elements);
                     widget.cy.layout({ name: 'fcose' }).run();
                 }
             }, 200);
        }, 100);
    }
}
