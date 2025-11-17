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

    return cytoscape({
        container: graphDiv,
        style: [
            {
                selector: 'node',
                style: {
                    label: 'data(id)',
                    width: 20,
                    height: 20,
                    'background-color': '#3399FF'
                }
            },
            {
                selector: 'edge',
                style: {
                    width: 1,
                    'line-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': '#ccc',
                    'curve-style': 'bezier'
                }
            },
            {
                selector: 'node[type="concept"]',
                style: {
                    'background-color': '#3399FF',
                    shape: 'ellipse'
                }
            },
            {
                selector: 'node[type="task"]',
                style: {
                    'background-color': '#FF6B6B',
                    shape: 'rectangle'
                }
            },
            {
                selector: 'node[type="belief"]',
                style: {
                    'background-color': '#6BCF7F',
                    shape: 'triangle'
                }
            }
        ],
        layout: {
            name: 'cose',
            animate: false,
            fit: true,
            padding: 30
        }
    });
}