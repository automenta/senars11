export const GraphConfig = {
    DEFAULT_NODE_WEIGHT: 50,
    TASK_NODE_WEIGHT: 30,
    QUESTION_NODE_WEIGHT: 40,

    // Hackerish Palette (Matching style.css)
    COLORS: {
        CONCEPT: '#00bcd4',   // Cyan
        TASK: '#ffcc00',      // Amber
        QUESTION: '#aa00ff',  // Purple
        EDGE: '#555555',      // Grey
        HIGHLIGHT: '#00ff9d', // Neon Green
        DIM: '#222222',       // Dark Grey
        INHERITANCE: '#00bcd4',
        SIMILARITY: '#2196f3',
        IMPLICATION: '#ff4444', // Red
        TEXT: '#e0e0e0'
    },

    getGraphStyle() {
        const colors = GraphConfig.COLORS;
        const isHighContrast = document.body.classList.contains('high-contrast');

        // Overrides for High Contrast
        if (isHighContrast) {
            colors.CONCEPT = '#00ffff';
            colors.TASK = '#ffff00';
            colors.QUESTION = '#ff00ff';
            colors.EDGE = '#ffffff';
            colors.TEXT = '#ffffff';
        }

        return [
            {
                selector: 'node',
                style: {
                    'background-color': colors.CONCEPT,
                    'label': 'data(label)',
                    'color': colors.TEXT,
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'text-margin-y': 5,
                    'font-family': 'JetBrains Mono, monospace', // Hackerish font
                    'font-size': '12px',
                    'text-transform': 'uppercase',
                    'font-weight': 'normal',
                    'text-background-color': '#0a0a0c',
                    'text-background-opacity': 0.8,
                    'text-background-padding': 3,
                    'width': 'mapData(weight, 0, 100, 20, 60)',
                    'height': 'mapData(weight, 0, 100, 20, 60)',
                    'border-width': 1,
                    'border-color': colors.CONCEPT,
                    'ghost': 'yes',
                    'ghost-offset-x': 0,
                    'ghost-offset-y': 0,
                    'ghost-opacity': 0.5,
                    'transition-property': 'background-color, border-color, width, height, opacity',
                    'transition-duration': '0.3s'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 1,
                    'line-color': colors.EDGE,
                    'target-arrow-color': colors.EDGE,
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'arrow-scale': 0.8,
                    'opacity': 0.6
                }
            },
            // Node Types
            {selector: 'node[type = "concept"]', style: {'background-color': colors.CONCEPT, 'border-color': colors.CONCEPT}},
            {selector: 'node[type = "task"]', style: {'background-color': colors.TASK, 'border-color': colors.TASK, 'shape': 'rectangle'}},
            {selector: 'node[type = "question"]', style: {'background-color': colors.QUESTION, 'border-color': colors.QUESTION, 'shape': 'diamond'}},

            // Edge Types
            {
                selector: 'edge[type = "inheritance"]',
                style: {'line-color': colors.INHERITANCE, 'target-arrow-color': colors.INHERITANCE}
            },
            {
                selector: 'edge[type = "similarity"]',
                style: {'line-color': colors.SIMILARITY, 'target-arrow-color': colors.SIMILARITY, 'line-style': 'dashed'}
            },
            {
                selector: 'edge[type = "implication"]',
                style: {'line-color': colors.IMPLICATION, 'target-arrow-color': colors.IMPLICATION}
            },

            // Interaction States
            {
                selector: ':selected',
                style: {
                    'border-width': 2,
                    'border-color': '#ffffff',
                    'overlay-opacity': 0
                }
            },
            {
                selector: '.keyboard-selected',
                style: {
                    'border-width': 2,
                    'border-color': colors.HIGHLIGHT,
                    'shadow-blur': 10,
                    'shadow-color': colors.HIGHLIGHT
                }
            },

            // Trace Mode Styles
            {
                selector: '.trace-highlight',
                style: {
                    'border-width': 3,
                    'border-color': colors.HIGHLIGHT,
                    'line-color': colors.HIGHLIGHT,
                    'target-arrow-color': colors.HIGHLIGHT,
                    'z-index': 9999,
                    'opacity': 1,
                    'width': 3 // Thicker edges
                }
            },
            {
                selector: '.trace-dim',
                style: {
                    'opacity': 0.1,
                    'z-index': 0,
                    'label': '' // Hide labels of dimmed nodes
                }
            }
        ];
    },

    OVERRIDES: {},

    getGraphLayout: (layoutName = 'fcose') => {
        const layouts = {
            fcose: {
                name: 'fcose',
                animate: true,
                animationDuration: 500,
                refresh: 20,
                fit: true,
                padding: 30,
                randomize: false,
                componentSpacing: 100,
                nodeRepulsion: 450000,
                idealEdgeLength: 100,
                edgeElasticity: 0.45,
                nestingFactor: 0.1,
                gravity: 0.25,
                numIter: 2500,
                tile: true,
                tilingPaddingVertical: 10,
                tilingPaddingHorizontal: 10,
                ...GraphConfig.OVERRIDES
            },
            grid: {
                name: 'grid',
                animate: true,
                padding: 30
            },
            circle: {
                name: 'circle',
                animate: true,
                padding: 30
            },
            concentric: {
                name: 'concentric',
                animate: true,
                padding: 30
            }
        };
        return layouts[layoutName] || layouts.fcose;
    }
};
