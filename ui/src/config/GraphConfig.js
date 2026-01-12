import {DESIGN_TOKENS} from '@senars/core';

export const GraphConfig = {
    DEFAULT_NODE_WEIGHT: 50,
    TASK_NODE_WEIGHT: 30,
    QUESTION_NODE_WEIGHT: 40,

    // Re-export colors from shared design tokens
    GRAPH_COLORS: {
        NODE_COLOR: DESIGN_TOKENS.colors.concept,
        CONCEPT_COLOR: DESIGN_TOKENS.colors.concept,
        TASK_COLOR: DESIGN_TOKENS.colors.task,
        QUESTION_COLOR: DESIGN_TOKENS.colors.question,
        EDGE_COLOR: DESIGN_TOKENS.colors.edge
    },

    getGraphStyle() {
        const {
            concept,
            task,
            question,
            edge,
            inheritance,
            similarity,
            implication,
            relation,
            highlight
        } = DESIGN_TOKENS.colors;

        const highContrast = DESIGN_TOKENS.colorsHighContrast;
        const isHighContrast = document.body.classList.contains('high-contrast');

        const colors = isHighContrast ? highContrast : DESIGN_TOKENS.colors;

        return [
            {
                selector: 'node',
                style: {
                    'background-color': colors.concept,
                    'label': 'data(label)',
                    'color': '#ffffff',
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'text-margin-y': 5,
                    'font-size': '14px',
                    'font-weight': 'bold',
                    'text-background-color': '#000000',
                    'text-background-opacity': 0.7,
                    'text-background-padding': 4,
                    'width': 'mapData(weight, 0, 100, 20, 80)',
                    'height': 'mapData(weight, 0, 100, 20, 80)',
                    'border-width': 2,
                    'border-color': colors.concept
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': colors.relation,
                    'target-arrow-color': colors.relation,
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier'
                }
            },
            {selector: 'node[type = "concept"]', style: {'background-color': colors.concept}},
            {selector: 'node[type = "task"]', style: {'background-color': colors.task}},
            {selector: 'node[type = "question"]', style: {'background-color': colors.question}},
            {
                selector: 'edge[type = "inheritance"]',
                style: {'line-color': colors.inheritance, 'target-arrow-color': colors.inheritance}
            },
            {
                selector: 'edge[type = "similarity"]',
                style: {'line-color': colors.similarity, 'target-arrow-color': colors.similarity}
            },
            {
                selector: 'edge[type = "implication"]',
                style: {'line-color': colors.implication, 'target-arrow-color': colors.implication}
            },
            // Explicitly handle "Other" relations to ensure they are gray (or high contrast equivalent)
            {
                selector: 'edge[type != "inheritance"][type != "similarity"][type != "implication"]',
                 style: {
                    'line-color': colors.relation,
                    'target-arrow-color': colors.relation
                }
            },
            // Keyboard navigation highlight
            {
                selector: '.keyboard-selected',
                style: {
                    'border-width': 6,
                    'border-color': colors.highlight,
                    'border-style': 'solid',
                    'z-index': 9999
                }
            }
        ];
    },

    getGraphLayout: () => ({
        name: 'fcose', // Changed from cose to fcose per plan
        animate: true,
        animationDuration: 300,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        nodeOverlap: 20,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
        tile: true, // Specific to fcose
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10
    })
};
