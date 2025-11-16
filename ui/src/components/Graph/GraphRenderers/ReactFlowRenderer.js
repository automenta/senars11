/**
 * ReactFlow Renderer
 * ReactFlow-based graph visualization - works on same concepts/tasks model as other renderers
 */
import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background,
  useNodesState, useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useUiData } from '../../../hooks/useWebSocket.js';
import { NODE_TYPE_CONFIG } from '../../../utils/graph/graphConstants.js';
import { createNodeFromObject } from '../../../utils/graph/nodeUtils.js';

// Get ReactFlow style based on node type
const getNodeStyle = (type) => ({
  width: 120,
  height: 60,
  background: NODE_TYPE_CONFIG[type]?.color ?? '#999',
  color: 'white',
  fontSize: '12px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center'
});

// Transform a concept to ReactFlow node format
const conceptToReactFlowNode = (concept, index) => ({
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

// Transform a task to ReactFlow node format
const taskToReactFlowNode = (task, index) => {
  // Use shared node creation utility to get consistent type detection
  const node = createNodeFromObject(task, 'task');

  // Format the label based on node type (consistent with other renderers)
  let label = `${task.content ?? task.term ?? task.id}`;
  if (node.type === 'belief' && task.truth) {
    label += `\nFreq: ${task.truth.frequency?.toFixed(2) ?? node.priority?.toFixed(2)}`;
  } else if (node.type === 'goal' && task.truth) {
    label += `\nDesire: ${task.truth.desire?.toFixed(2) ?? node.priority?.toFixed(2)}`;
  } else if (node.type === 'question') {
    label += `\nPriority: ${node.priority?.toFixed(2)}`;
  } else if (node.priority) {
    label += `\nPriority: ${node.priority?.toFixed(2)}`;
  }

  return {
    id: `task-${task.id}`,
    type: 'default',
    position: { x: 300 + (index % 6) * 120, y: 350 + Math.floor(index / 6) * 150 },
    data: {
      label,
      type: node.type,  // Use the detected type from shared utility
      ...task
    },
    style: getNodeStyle(node.type)
  };
};

// Create sample edges for ReactFlow
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
          newNodes.push(conceptToReactFlowNode(concept, index));
        });
    }

    // Add all tasks (using budget.priority if available, otherwise priority)
    tasks
      .filter(task => {
        const priority = task.budget?.priority ?? task.priority ?? 0;
        return priority >= priorityRange.min && priority <= priorityRange.max;
      })
      .forEach((task, index) => {
        newNodes.push(taskToReactFlowNode(task, index));
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