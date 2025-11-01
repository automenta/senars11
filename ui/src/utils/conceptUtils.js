/**
 * Utility functions for concept handling and visualization
 */

export const calculatePriorityChange = (concept) => {
  return concept.priority - (concept.initialPriority || concept.priority);
};

export const getPriorityChangeColor = (priorityChange) => {
  return priorityChange > 0 ? '#28a745' : priorityChange < 0 ? '#dc3545' : '#6c757d';
};

export const formatConceptDetails = (concept) => {
  return [
    `Initial Priority: ${(concept.initialPriority || concept.priority).toFixed(3)}`,
    `Priority Change: ${(concept.priority - (concept.initialPriority || concept.priority) >= 0 ? '+' : '')}${(concept.priority - (concept.initialPriority || concept.priority)).toFixed(3)}`,
    `Usage Count: ${concept.usageCount || 0}`,
    `Creation Time: ${concept.creationTime ? new Date(concept.creationTime).toLocaleString() : 'N/A'}`
  ];
};

export const sortConceptsByTime = (concepts) => {
  return concepts.map(concept => ({
    term: concept.term,
    priority: concept.priority,
    lastAccess: concept.lastAccess,
    taskCount: concept.taskCount || 0,
    beliefCount: concept.beliefCount || 0
  })).sort((a, b) => a.lastAccess - b.lastAccess);
};