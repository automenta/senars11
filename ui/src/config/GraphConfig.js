import { DESIGN_TOKENS } from '@senars/core';

/**
 * Graph configuration constants and styles
 * Uses shared DESIGN_TOKENS from core for consistency with CLI
 */
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
        const { concept, task, question, edge, inheritance, similarity, implication, relation, highlight } = DESIGN_TOKENS.colors;
        return [
            {
                selector: 'node',
                style: {
                    'background-color': concept,
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
                    'border-color': concept
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': relation,
                    'target-arrow-color': relation,
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier'
                }
            },
            { selector: 'node[type = "concept"]', style: { 'background-color': concept } },
            { selector: 'node[type = "task"]', style: { 'background-color': task } },
            { selector: 'node[type = "question"]', style: { 'background-color': question } },
            { selector: 'edge[type = "inheritance"]', style: { 'line-color': inheritance, 'target-arrow-color': inheritance } },
            { selector: 'edge[type = "similarity"]', style: { 'line-color': similarity, 'target-arrow-color': similarity } },
            { selector: 'edge[type = "implication"]', style: { 'line-color': implication, 'target-arrow-color': implication } },
            // Keyboard navigation highlight
            {
                selector: '.keyboard-selected',
                style: {
                    'border-width': 6,
                    'border-color': highlight,
                    'border-style': 'solid',
                    'z-index': 9999
                }
            }
        ];
    },

    getGraphLayout: () => ({
        name: 'fcose',
        // fcose (force-directed with constraints) configuration
        quality: 'default',
        randomize: false,
        animate: false,
        fit: true,
        padding: 30,
        nodeSeparation: 75,
        idealEdgeLength: 50,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10,
        gravityRangeCompound: 1.5,
        gravityCompound: 1.0,
        gravityRange: 3.8
    })
};