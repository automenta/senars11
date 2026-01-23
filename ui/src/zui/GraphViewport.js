/**
 * GraphViewport handles the Cytoscape instance and rendering for ZUI.
 */
export class GraphViewport {
    constructor(containerId) {
        this.containerId = containerId;
        this.cy = null;
        this.callbacks = {};
    }

    initialize() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`GraphViewport: Container #${this.containerId} not found`);
            return false;
        }

        try {
            this.cy = cytoscape({
                container: container,
                style: this._getDefaultStyle(),
                layout: { name: 'grid' }, // Default layout
                minZoom: 0.1,
                maxZoom: 10,
                wheelSensitivity: 0.2
            });

            this._setupEvents();
            return true;
        } catch (error) {
            console.error('GraphViewport: Failed to initialize Cytoscape', error);
            return false;
        }
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }

    _setupEvents() {
        if (!this.cy) return;

        // Propagate zoom/pan events
        this.cy.on('zoom pan', () => {
            this.trigger('viewport', {
                zoom: this.cy.zoom(),
                pan: this.cy.pan(),
                extent: this.cy.extent()
            });
        });

        this.cy.on('tap', 'node', (evt) => {
            this.trigger('nodeClick', { node: evt.target });
        });
    }

    _getDefaultStyle() {
        return [
            {
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'color': '#fff',
                    'text-outline-width': 2,
                    'text-outline-color': '#333',
                    'background-color': '#666',
                    'width': 'data(weight)',
                    'height': 'data(weight)'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier'
                }
            },
             {
                selector: '.highlighted',
                style: {
                    'background-color': '#00ff9d',
                    'line-color': '#00ff9d',
                    'target-arrow-color': '#00ff9d',
                    'transition-property': 'background-color, line-color, target-arrow-color',
                    'transition-duration': '0.3s'
                }
            }
        ];
    }

    // API to be used by ActivityGraph
    addElements(elements) {
        if (!this.cy) return;
        this.cy.add(elements);
    }

    clear() {
        if (!this.cy) return;
        this.cy.elements().remove();
    }

    fit() {
        if (!this.cy) return;
        this.cy.fit();
    }
}
