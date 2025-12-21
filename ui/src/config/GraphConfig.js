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
        const { CONCEPT_COLOR, TASK_COLOR, QUESTION_COLOR, EDGE_COLOR, NODE_COLOR } = this.GRAPH_COLORS;

        return [
            {
                selector: 'node',
                style: {
                    'background-color': NODE_COLOR,
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
                    'height': 'mapData(weight, 0, 100, 20, 80)'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': EDGE_COLOR,
                    'target-arrow-color': EDGE_COLOR,
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier'
                }
            },
            {
                selector: 'node[type = "concept"]',
                style: {
                    'background-color': CONCEPT_COLOR
                }
            },
            {
                selector: 'node[type = "task"]',
                style: {
                    'background-color': TASK_COLOR
                }
            },
            {
                selector: 'node[type = "question"]',
                style: {
                    'background-color': QUESTION_COLOR
                }
            }
        ];
    },

    getGraphLayout() {
        return { name: 'cose' };
    }
};