import GraphLayout from './config/graph-layout.js';

/**
 * GraphView - Initializes and manages the Cytoscape.js graph visualization
 */
export function init(container) {
    const graphDiv = document.createElement('div');
    Object.assign(graphDiv, { id: 'cy-graph' });
    Object.assign(graphDiv.style, {
        width: '100%',
        height: '100%',
        border: '1px solid #ccc'
    });

    container.appendChild(graphDiv);

    const styleConfig = GraphLayout.getNodeStyleOptions();

    const cy = cytoscape({
        container: graphDiv,
        style: styleConfig.style,
        layout: GraphLayout.getLayoutOptions()
    });

    window.cy = cy; // Expose for testing

    const detailsPanel = document.getElementById('details-panel');

    cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        detailsPanel.innerHTML = `<pre>${JSON.stringify(node.data(), null, 2)}</pre>`;
        detailsPanel.style.display = 'block';
    });

    cy.on('tap', (evt) => {
        if (evt.target === cy) {
            detailsPanel.style.display = 'none';
        }
    });

    return cy;
}