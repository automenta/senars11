/**
 * Utility functions for transforming NAR data to graph format
 */

const DEFAULT_PRIORITY = 0;
const DEFAULT_TERM = 'Unknown';

// Helper function to generate node ID
const generateNodeId = (prefix, id, fallback) =>
  `${prefix}-${id ?? fallback ?? Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

// Helper function to get creation timestamp
const getCreationTime = (item, timeField = 'creationTime', fallbackField = 'occurrenceTime') =>
  item[timeField] ?? item[fallbackField] ?? Date.now();

// Transform NAR tasks to graph nodes
export const transformTaskToNode = (task) => ({
  id: generateNodeId('task', task.id),
  term: task.content ?? task.term ?? DEFAULT_TERM,
  type: task.type?.toLowerCase() ?? 'task',
  priority: task.priority ?? DEFAULT_PRIORITY,
  createdAt: getCreationTime(task),
  ...(task.truth && { truth: task.truth })
});

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

// Transform NAR beliefs to graph nodes
export const transformBeliefToNode = (belief) => ({
  id: generateNodeId('belief', belief.id),
  term: belief.term ?? DEFAULT_TERM,
  type: 'belief',
  priority: belief.priority ?? DEFAULT_PRIORITY,
  createdAt: getCreationTime(belief),
  ...(belief.truth && { truth: belief.truth })
});

// Transform NAR goals to graph nodes
export const transformGoalToNode = (goal) => ({
  id: generateNodeId('goal', goal.id),
  term: goal.term ?? DEFAULT_TERM,
  type: 'goal',
  priority: goal.priority ?? DEFAULT_PRIORITY,
  createdAt: getCreationTime(goal),
  ...(goal.truth && { truth: goal.truth })
});

// Transform NAR questions to graph nodes
export const transformQuestionToNode = (question) => ({
  id: generateNodeId('question', question.id),
  term: question.term ?? DEFAULT_TERM,
  type: 'question',
  priority: question.priority ?? DEFAULT_PRIORITY,
  createdAt: getCreationTime(question)
});

// Transform NAR event to graph node based on event type
export const transformNarEventToNode = (event) => {
  if (!event?.eventType || !event.data) return null;

  const handlers = {
    'task.input': (data) => transformTaskToNode(data.task),
    'task.processed': (data) => transformTaskToNode(data.task),
    'concept.created': (data) => transformConceptToNode(data.concept),
    'belief.added': (data) => transformBeliefToNode(data.belief),
    'goal.added': (data) => transformGoalToNode(data.goal),
    'question.added': (data) => transformQuestionToNode(data.question)
  };

  const handler = handlers[event.eventType];
  return handler ? handler(event.data) : null;
};

// Create links between nodes based on relationships
export const createRelationshipLinks = (nodes) => {
  const conceptNodes = nodes.filter(n => n.type === 'concept');
  const otherNodes = nodes.filter(n => n.type !== 'concept');

  return otherNodes.flatMap(node =>
    conceptNodes
      .filter(concept =>
        node.term && concept.term &&
        (node.term.includes(concept.term) || concept.term.includes(node.term))
      )
      .map(concept => ({
        id: `link-${node.id}-${concept.id}`,
        source: node.id,
        target: concept.id,
        type: 'association',
        directional: true
      }))
  );
};

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