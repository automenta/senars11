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

    return cytoscape({
        container: graphDiv,
        style: styleConfig.style,
        layout: GraphLayout.getLayoutOptions()
    });
}