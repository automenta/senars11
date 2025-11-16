/**
 * Utility functions for transforming NAR data to graph format
 */

import { DEFAULT_PRIORITY, DEFAULT_TERM } from './graphConstants.js';

// Helper function to generate node ID
const generateNodeId = (prefix, id, fallback) =>
  `${prefix}-${id ?? fallback ?? Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

// Helper function to get creation timestamp
const getCreationTime = (item, timeField = 'creationTime', fallbackField = 'occurrenceTime') =>
  item[timeField] ?? item[fallbackField] ?? Date.now();

// Get priority value from task based on its type
const getPriorityValue = (task, taskType) => {
  if (taskType === 'belief') {
    return task.truth?.frequency ?? task.budget?.priority ?? task.priority ?? DEFAULT_PRIORITY;
  } else if (taskType === 'goal') {
    return task.truth?.desire ?? task.budget?.priority ?? task.priority ?? DEFAULT_PRIORITY;
  } else {
    return task.budget?.priority ?? task.priority ?? DEFAULT_PRIORITY;
  }
};

// Transform NAR tasks to graph nodes
export const transformTaskToNode = (task) => {
  const taskType = task.type?.toLowerCase() ??
    (task.content?.endsWith('?') ? 'question' :
     task.content?.endsWith('!') ? 'goal' :
     task.content?.endsWith('.') ? 'belief' : 'task');

  const priorityValue = getPriorityValue(task, taskType);

  return {
    id: generateNodeId('task', task.id),
    term: task.content ?? task.term ?? DEFAULT_TERM,
    type: taskType,
    priority: priorityValue,
    createdAt: getCreationTime(task),
    ...(task.truth && { truth: task.truth })
  };
};

// Transform NAR concepts to graph nodes
export const transformConceptToNode = (concept) => ({
  id: `concept-${concept.term}`,
  term: concept.term,
  type: 'concept',
  priority: concept.priority ?? DEFAULT_PRIORITY,
  createdAt: getCreationTime(concept, 'occurrenceTime', 'creationTime'),
  taskCount: concept.taskCount ?? 0,
  beliefCount: concept.beliefCount ?? 0,
  questionCount: concept.questionCount ?? 0
});

// Transform NAR beliefs to graph nodes (Beliefs ARE Tasks)
export const transformBeliefToNode = (belief) => transformTaskToNode({ ...belief, type: 'belief' });

// Transform NAR goals to graph nodes (Goals ARE Tasks)
export const transformGoalToNode = (goal) => transformTaskToNode({ ...goal, type: 'goal' });

// Transform NAR questions to graph nodes (Questions ARE Tasks)
export const transformQuestionToNode = (question) => transformTaskToNode({ ...question, type: 'question' });

// Transform NAR event to graph node based on event type
export const transformNarEventToNode = (event) => {
  if (!event?.eventType || !event.data) return null;

  const handlers = {
    'task.input': (data) => transformTaskToNode(data.task),
    'task.processed': (data) => transformTaskToNode(data.task),
    'concept.created': (data) => transformConceptToNode(data.concept),
    'belief.added': (data) => transformBeliefToNode(data.belief),
    'goal.added': (data) => transformGoalToNode(data.goal),
    'question.added': (data) => transformQuestionToNode(data.question),
    'question.answered': (data) => transformQuestionToNode(data.question)  // Also handle answered questions
  };

  const handler = handlers[event.eventType];
  return handler ? handler(event.data) : null;
};

// Create links between nodes based on relationships
export const createRelationshipLinks = (nodes) => {
  const conceptNodes = nodes.filter(n => n.type === 'concept');
  const taskNodes = nodes.filter(n => n.type === 'task');
  const beliefNodes = nodes.filter(n => n.type === 'belief');
  const goalNodes = nodes.filter(n => n.type === 'goal');
  const questionNodes = nodes.filter(n => n.type === 'question');

  const links = [];

  // Relationship: task → concept association
  taskNodes.forEach(task => {
    conceptNodes.forEach(concept => {
      if (task.term && concept.term &&
          (task.term.includes(concept.term) || concept.term.includes(task.term))) {
        links.push({
          id: `task-concept-${task.id}-${concept.id}`,
          source: task.id,
          target: concept.id,
          type: 'task-concept-association',
          directional: true
        });
      }
    });
  });

  // Relationship: belief → concept association
  beliefNodes.forEach(belief => {
    conceptNodes.forEach(concept => {
      if (belief.term && concept.term &&
          (belief.term.includes(concept.term) || concept.term.includes(belief.term))) {
        links.push({
          id: `belief-concept-${belief.id}-${concept.id}`,
          source: belief.id,
          target: concept.id,
          type: 'belief-concept-association',
          directional: true
        });
      }
    });
  });

  // Relationship: goal → concept association
  goalNodes.forEach(goal => {
    conceptNodes.forEach(concept => {
      if (goal.term && concept.term &&
          (goal.term.includes(concept.term) || concept.term.includes(goal.term))) {
        links.push({
          id: `goal-concept-${goal.id}-${concept.id}`,
          source: goal.id,
          target: concept.id,
          type: 'goal-concept-association',
          directional: true
        });
      }
    });
  });

  // Relationship: question → concept association
  questionNodes.forEach(question => {
    conceptNodes.forEach(concept => {
      if (question.term && concept.term &&
          (question.term.includes(concept.term) || concept.term.includes(question.term))) {
        links.push({
          id: `question-concept-${question.id}-${concept.id}`,
          source: question.id,
          target: concept.id,
          type: 'question-concept-association',
          directional: true
        });
      }
    });
  });

  // Relationship: concept embedding (similarity-based)
  conceptNodes.forEach((concept1, i) => {
    conceptNodes.slice(i + 1).forEach(concept2 => {
      if (concept1.term && concept2.term) {
        // Check if concepts are similar (simple substring check for now, could be enhanced with semantic similarity)
        const isSimilar = concept1.term.includes(concept2.term) ||
                         concept2.term.includes(concept1.term) ||
                         getSimilarityScore(concept1.term, concept2.term) > 0.5;

        if (isSimilar) {
          links.push({
            id: `concept-embed-${concept1.id}-${concept2.id}`,
            source: concept1.id,
            target: concept2.id,
            type: 'concept-embedding',
            directional: false
          });
        }
      }
    });
  });

  // Relationship: concept subterm hierarchies
  conceptNodes.forEach((concept1, i) => {
    conceptNodes.slice(i + 1).forEach(concept2 => {
      if (concept1.term && concept2.term) {
        // Check for subterm relationships
        if (concept1.term.includes(`<${concept2.term}>`) ||
            concept2.term.includes(`<${concept1.term}>`)) {
          links.push({
            id: `concept-subterm-${concept1.id}-${concept2.id}`,
            source: concept1.term.includes(`<${concept2.term}>`) ? concept2.id : concept1.id,
            target: concept1.term.includes(`<${concept2.term}>`) ? concept1.id : concept2.id,
            type: 'concept-subterm',
            directional: true
          });
        }
      }
    });
  });

  // Relationship: task inference chains (tasks that are causally related)
  taskNodes.forEach(task1 => {
    taskNodes.forEach(task2 => {
      if (task1.id !== task2.id && task1.term && task2.term) {
        // Check for inference relationships (simple heuristic)
        if (task1.term.includes(task2.term) || task2.term.includes(task1.term)) {
          links.push({
            id: `task-inference-${task1.id}-${task2.id}`,
            source: task1.id,
            target: task2.id,
            type: 'task-inference',
            directional: true
          });
        }
      }
    });
  });

  // Relationship: belief → belief similarity
  beliefNodes.forEach((belief1, i) => {
    beliefNodes.slice(i + 1).forEach(belief2 => {
      if (belief1.term && belief2.term &&
          (belief1.term.includes(belief2.term) || belief2.term.includes(belief1.term))) {
        links.push({
          id: `belief-similarity-${belief1.id}-${belief2.id}`,
          source: belief1.id,
          target: belief2.id,
          type: 'belief-similarity',
          directional: false
        });
      }
    });
  });

  // Relationship: goal → goal similarity
  goalNodes.forEach((goal1, i) => {
    goalNodes.slice(i + 1).forEach(goal2 => {
      if (goal1.term && goal2.term &&
          (goal1.term.includes(goal2.term) || goal2.term.includes(goal1.term))) {
        links.push({
          id: `goal-similarity-${goal1.id}-${goal2.id}`,
          source: goal1.id,
          target: goal2.id,
          type: 'goal-similarity',
          directional: false
        });
      }
    });
  });

  // Relationship: question → belief when belief answers the question
  questionNodes.forEach(question => {
    beliefNodes.forEach(belief => {
      if (question.term && belief.term &&
          (question.term.includes(belief.term) || belief.term.includes(question.term))) {
        links.push({
          id: `question-answer-${question.id}-${belief.id}`,
          source: question.id,
          target: belief.id,
          type: 'question-answer',
          directional: true
        });
      }
    });
  });

  return links;
};

// Helper function to calculate similarity between terms
function getSimilarityScore(term1, term2) {
  // Simple similarity calculation based on common characters
  const commonChars = new Set([...term1].filter(char => term2.includes(char)));
  const totalChars = new Set([...term1, ...term2]).size;
  return totalChars > 0 ? commonChars.size / totalChars : 0;
}

// Create graph data structure from NAR events
export const createGraphDataFromNarEvents = (events) => {
  const nodeMap = new Set();
  const nodes = events
    .map(transformNarEventToNode)
    .filter(node => {
      if (!node) return false;
      if (nodeMap.has(node.id)) return false;
      nodeMap.add(node.id);
      return true;
    });

  const links = createRelationshipLinks(nodes);
  return { nodes, links };
};

// Apply filters to graph data
export const applyFilters = (graphData, filters) => {
  const { nodes, links } = graphData;

  const filteredNodes = nodes.filter(node => {
    // Type filter
    if (filters[node.type] === false) return false;

    // Priority range filter
    if (filters.priorityRange) {
      const priority = node.priority ?? DEFAULT_PRIORITY;
      const { min, max } = filters.priorityRange;
      if (priority < min || priority > max) return false;
    }

    return true;
  });

  const nodeIds = new Set(filteredNodes.map(node => node.id));
  const filteredLinks = links.filter(link =>
    nodeIds.has(link.source) && nodeIds.has(link.target)
  );

  return { nodes: filteredNodes, links: filteredLinks };
};

// Calculate graph statistics
export const calculateGraphStatistics = (graphData) => {
  const { nodes, links } = graphData;
  const nodeCount = nodes.length;
  const edgeCount = links.length;

  return {
    nodeCount,
    edgeCount,
    density: nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0,
    nodeTypes: nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] ?? 0) + 1;
      return acc;
    }, {}),
    avgPriority: nodeCount > 0
      ? nodes.reduce((sum, node) => sum + (node.priority ?? DEFAULT_PRIORITY), 0) / nodeCount
      : 0
  };
};