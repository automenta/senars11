import cytoscape from 'cytoscape';
import { Config } from '../config/Config.js';

/**
 * EmbeddedGraphRenderer
 * Helper to render mini graphs inside the console or other containers.
 */
export class EmbeddedGraphRenderer {
    static render(container, data) {
        if (!container) return null;

        const { nodes = [], edges = [] } = data;

        // Ensure container has dimensions
        container.style.width = '100%';
        container.style.height = '200px';
        container.style.background = 'var(--bg-dark)';
        container.style.border = '1px solid var(--border-color)';
        container.style.borderRadius = '4px';
        container.style.marginBottom = '5px';

        try {
            const cy = cytoscape({
                container: container,
                elements: {
                    nodes: nodes.map(n => ({
                        data: {
                            id: n.id,
                            label: n.term || n.id,
                            type: n.type || 'concept',
                            weight: n.truth ? n.truth.confidence * 100 : 50
                        }
                    })),
                    edges: edges.map(e => ({
                        data: {
                            id: e.id || `edge_${e.source}_${e.target}`,
                            source: e.source,
                            target: e.target,
                            label: e.type || 'relationship'
                        }
                    }))
                },
                style: [
                    ...Config.getGraphStyle(),
                    {
                        selector: 'node',
                        style: {
                            'font-size': '10px',
                            'width': 20,
                            'height': 20
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'font-size': '8px',
                            'width': 1
                        }
                    }
                ],
                layout: {
                    name: 'grid', // Simple layout for mini-view, or 'circle'
                    padding: 10
                },
                userZoomingEnabled: true,
                userPanningEnabled: true
            });

            // Re-layout after render to ensure fit
            setTimeout(() => {
                cy.resize();
                cy.fit();
            }, 100);

            return cy;
        } catch (e) {
            console.error('Failed to render embedded graph', e);
            container.innerHTML = `<div style="color:var(--accent-error); padding:5px;">Graph Error: ${e.message}</div>`;
            return null;
        }
    }
}
