/**
 * ReactFlow Renderer
 * ReactFlow-based graph visualization
 */
import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background,
  useNodesState, useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useUiData } from '../../../hooks/useWebSocket.js';

// Node type configuration
const NODE_CONFIG = Object.freeze({
  concept: { color: '#007bff', label: 'Concept' },
  task: { color: '#28a745', label: 'Task' },
  belief: { color: '#fd7e14', label: 'Belief' },
  goal: { color: '#dc3545', label: 'Goal' },
  question: { color: '#6f42c1', label: 'Question' }
});

// Get color for node type
const getNodeColor = (type) => NODE_CONFIG[type]?.color ?? '#999';

// Get node style based on type
const getNodeStyle = (type) => ({
  width: 120,
  height: 60,
  background: getNodeColor(type),
  color: 'white',
  fontSize: '12px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center'
});

// Determine task type from content
const getTaskType = (task) => {
  const content = task.term || task.content || task.id || '';
  return task.type ||
    (content.endsWith('?') ? 'question' :
     content.endsWith('!') ? 'goal' :
     content.endsWith('.') ? 'belief' : 'task');
};


// Get priority value from task (truth, budget, or priority)
const getTaskPriorityValue = (task, taskType) => {
  if (taskType === 'belief') {
    return task.truth?.frequency ?? task.budget?.priority ?? task.priority ?? 0;
  } else if (taskType === 'goal') {
    return task.truth?.desire ?? task.budget?.priority ?? task.priority ?? 0;
  } else {
    return task.budget?.priority ?? task.priority ?? 0;
  }
};

// Create task node
const createTaskNode = (task, index) => {
  const taskType = getTaskType(task);
  const content = task.term || task.content || task.id || '';
  const priorityValue = getTaskPriorityValue(task, taskType);

  let label = `${content}`;
  switch (taskType) {
    case 'belief':
      label += `\nFreq: ${priorityValue.toFixed(2)}`;
      break;
    case 'goal':
      label += `\nDesire: ${priorityValue.toFixed(2)}`;
      break;
    case 'question':
    default:
      label += `\nPriority: ${priorityValue.toFixed(2)}`;
      break;
  }

  return {
    id: `task-${task.id}`,
    type: 'default',
    position: { x: 300 + (index % 6) * 120, y: 350 + Math.floor(index / 6) * 150 },
    data: {
      label,
      type: taskType,
      ...task
    },
    style: getNodeStyle(taskType)
  };
};

// Create concept node
const createConceptNode = (concept, index) => ({
  id: `concept-${concept.term}`,
  type: 'default',
  position: { x: 100 + (index % 5) * 150, y: 100 + Math.floor(index / 5) * 100 },
  data: {
    label: `${concept.term}\nPriority: ${concept.priority.toFixed(2)}`,
    type: 'concept',
    ...concept
  },
  style: getNodeStyle('concept')
});

// Create sample edges
const createSampleEdges = (nodes) => {
  const edges = [];
  for (let i = 0; i < Math.min(5, nodes.length - 1); i++) {
    edges.push({
      id: `edge-${i}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      animated: true,
      style: { stroke: '#999', strokeWidth: 1 },
      label: "relation"
    });
  }
  return edges;
};

export const ReactFlowRenderer = ({ filters, priorityRange }) => {
  const { tasks, concepts } = useUiData();

  // Transform store data to ReactFlow format
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update nodes and edges when data changes
  React.useEffect(() => {
    const newNodes = [];

    // Add filtered concepts
    if (filters.concepts) {
      concepts
        .filter(concept => concept.priority >= priorityRange.min && concept.priority <= priorityRange.max)
        .forEach((concept, index) => {
          newNodes.push(createConceptNode(concept, index));
        });
    }

    // Add all tasks (using budget.priority if available, otherwise priority)
    tasks
      .filter(task => {
        const priority = task.budget?.priority || task.priority || 0;
        return priority >= priorityRange.min && priority <= priorityRange.max;
      })
      .forEach((task, index) => {
        newNodes.push(createTaskNode(task, index));
      });

    const newEdges = newNodes.length > 1 ? createSampleEdges(newNodes) : [];

    setNodes(newNodes);
    setEdges(newEdges);
  }, [concepts, tasks, filters, priorityRange, setNodes, setEdges]);

  // Event handlers
  const onConnect = useCallback((params) => setEdges((eds) => eds.concat(params)), [setEdges]);

  const onNodeClick = useCallback((event, node) => {
    console.log('Node clicked:', node);
  }, []);

  return React.createElement('div', {
    style: {
      width: '100%',
      height: '100%',
      position: 'relative'
    }
  },
  React.createElement(ReactFlow, {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    fitView: true,
    attributionPosition: 'bottom-left'
  },
  React.createElement(MiniMap, null),
  React.createElement(Controls, null),
  React.createElement(Background, { gap: 16 })
  )
  );
};