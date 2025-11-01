/**
 * Utility functions for task handling and visualization
 */

export const getTaskColor = (taskType) => {
  switch (taskType?.toLowerCase()) {
    case 'question':
      return '#b8daff';
    case 'goal':
      return '#ffeaa7';
    case 'belief':
      return '#a3d9a5';
    default:
      return '#ddd';
  }
};

export const getRelationshipColor = (relationshipType) => {
  switch (relationshipType) {
    case 'dependency':
      return '#28a745'; // Green for dependencies
    case 'influences':
      return '#007bff'; // Blue for influences
    default: // term-related
      return '#ffc107'; // Yellow for term related
  }
};

export const getTaskText = (taskTerm, maxLength = 10) => {
  return taskTerm && taskTerm.length > maxLength 
    ? taskTerm.substring(0, maxLength) + '...' 
    : taskTerm || 'Task';
};