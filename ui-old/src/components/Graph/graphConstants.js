/**
 * Graph Visualization Constants
 */

// Define available renderers
export const RENDERERS = Object.freeze({
    force: {
        id: 'force',
        name: 'Force-Directed',
        component: null, // Will be imported dynamically
        description: 'Interactive force-directed graph visualization'
    },
    reactflow: {
        id: 'reactflow',
        name: 'ReactFlow',
        component: null, // Will be imported dynamically
        description: 'ReactFlow-based graph visualization'
    },
    simple: {
        id: 'simple',
        name: 'Simple List',
        component: null, // Will be imported dynamically
        description: 'Simple list view of concepts and tasks'
    },
    json: {
        id: 'json',
        name: 'JSON/Text',
        component: null, // Will be imported dynamically
        description: 'Raw JSON data representation for debugging'
    }
});

// Get renderer component by ID
export const getRendererComponent = (id, rendererComponents = {}) =>
    rendererComponents[id] || null;

// Get renderer options for select field
export const getRendererOptions = () =>
    Object.values(RENDERERS).map(renderer => ({
        value: renderer.id,
        label: renderer.name
    }));

export const DEFAULT_RENDERER = 'json';

export const DEFAULT_FILTERS = Object.freeze({
    concepts: true
});