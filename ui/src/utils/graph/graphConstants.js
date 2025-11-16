/**
 * Graph Visualization Constants and Configuration
 */

// Node type configuration with colors and labels
export const NODE_TYPE_CONFIG = Object.freeze({
    concept: {color: '#007bff', label: 'Concept'},
    task: {color: '#28a745', label: 'Task'},
    belief: {color: '#fd7e14', label: 'Belief'},
    goal: {color: '#dc3545', label: 'Goal'},
    question: {color: '#6f42c1', label: 'Question'}
});

// Link type styles
export const LINK_TYPE_STYLES = Object.freeze({
    'task-concept-association': {color: '#007bff', width: 1, dash: null, type: 'solid'},
    'belief-concept-association': {color: '#fd7e14', width: 1, dash: null, type: 'solid'},
    'goal-concept-association': {color: '#dc3545', width: 1, dash: null, type: 'solid'},
    'question-concept-association': {color: '#6f42c1', width: 1, dash: null, type: 'solid'},
    'concept-embedding': {color: '#6c757d', width: 1.5, dash: [5, 3], type: 'dashed'},
    'concept-subterm': {color: '#20c997', width: 1.2, dash: [2, 3], type: 'dotted'},
    'task-inference': {color: '#28a745', width: 2, dash: [5, 5], type: 'dashed'},
    'belief-similarity': {color: '#ffc107', width: 1.5, dash: [2, 2], type: 'dotted'},
    'goal-similarity': {color: '#e83e8c', width: 1.5, dash: [2, 2], type: 'dotted'},
    'question-answer': {color: '#6610f2', width: 2, dash: [3, 3, 6, 3], type: 'dash-dot'},
    association: {color: '#999', width: 1, dash: null, type: 'solid'},
    inference: {color: '#28a745', width: 2, dash: [5, 5], type: 'dashed'},
    similarity: {color: '#ffc107', width: 1.5, dash: [2, 2], type: 'dotted'}
});

// Default node and link properties
export const DEFAULT_NODE_SIZE = 8;
export const MAX_NODE_SIZE = 24;

// Default priority values
export const DEFAULT_PRIORITY = 0;
export const DEFAULT_TERM = 'Unknown';

// Relationship types
export const RELATIONSHIP_TYPES = Object.freeze({
    TASK_CONCEPT_ASSOCIATION: 'task-concept-association',
    BELIEF_CONCEPT_ASSOCIATION: 'belief-concept-association',
    GOAL_CONCEPT_ASSOCIATION: 'goal-concept-association',
    QUESTION_CONCEPT_ASSOCIATION: 'question-concept-association',
    CONCEPT_EMBEDDING: 'concept-embedding',
    CONCEPT_SUBTERM: 'concept-subterm',
    TASK_INFERENCE: 'task-inference',
    BELIEF_SIMILARITY: 'belief-similarity',
    GOAL_SIMILARITY: 'goal-similarity',
    QUESTION_ANSWER: 'question-answer',
    ASSOCIATION: 'association',
    INFERENCE: 'inference',
    SIMILARITY: 'similarity'
});

// Node type names
export const NODE_TYPES = Object.freeze({
    CONCEPT: 'concept',
    BELIEF: 'belief',
    GOAL: 'goal',
    QUESTION: 'question'
});