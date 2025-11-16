/**
 * Node Creation Utilities for Graph Visualization
 * Logical architecture: Beliefs, Goals, and Questions ARE Tasks (just with different types)
 */

import {transformConceptToNode, transformTaskToNode} from './transformers.js';

// Create concept node from store data (concepts are distinct from tasks)
export const createConceptNode = (concept) => transformConceptToNode(concept);

// Create task node from store data with proper type detection
export const createTaskNode = (task) => transformTaskToNode(task);

// Create node from any object based on its properties
export const createNodeFromObject = (item, nodeType) => {
    switch (nodeType) {
        case 'concept':
            return createConceptNode(item);
        case 'task':
        case 'belief':
        case 'goal':
        case 'question':
            // All are tasks, differentiate by type based on punctuation/content
            const detectedType = detectTaskType(item);
            return transformTaskToNode({...item, type: detectedType});
        default:
            // Auto-detect type based on available properties
            if (item.term && item.priority !== undefined && item.taskCount !== undefined) {
                return createConceptNode(item);
            } else {
                // Default to task with auto-detected type
                const detectedType = detectTaskType(item);
                return transformTaskToNode({...item, type: detectedType});
            }
    }
};

// Helper function to detect task type from content
export const detectTaskType = (task) => {
    if (task.type) return task.type.toLowerCase();

    const content = task.content || task.term || '';
    if (content.endsWith('?')) return 'question';
    if (content.endsWith('!')) return 'goal';
    if (content.endsWith('.')) return 'belief';
    return 'task';
};

// Batch create nodes from array of objects
export const createNodesFromArray = (items, nodeType) => {
    if (!Array.isArray(items)) {
        console.warn('createNodesFromArray: items is not an array');
        return [];
    }

    return items.map(item => createNodeFromObject(item, nodeType)).filter(Boolean);
};

// Create filtered nodes with priority range
export const createFilteredNodes = (items, nodeType, priorityRange) => {
    if (!Array.isArray(items)) {
        console.warn('createFilteredNodes: items is not an array');
        return [];
    }

    const min = priorityRange?.min ?? 0;
    const max = priorityRange?.max ?? 1;

    return items
        .filter(item => {
            const priority = item.priority ?? item.budget?.priority ?? 0;
            return priority >= min && priority <= max;
        })
        .map(item => createNodeFromObject(item, nodeType))
        .filter(Boolean);
};