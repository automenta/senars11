/**
 * ReactFlow Renderer
 * ReactFlow-based graph visualization
 */
import React, { useCallback } from 'react';
import ReactFlow, { 
  MiniMap, Controls, Background, 
  useNodesState, useEdgesState 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useUiData } from '../../../hooks/useWebSocket.js';

// Node type colors for ReactFlow
const NODE_TYPE_COLORS = {
  concept: '#007bff',  // Blue for concepts
  task: '#28a745',     // Green for tasks
  belief: '#fd7e14',   // Orange for beliefs
  goal: '#dc3545',     // Red for goals
  question: '#6f42c1'  // Purple for questions
};

// Default node and edge styles
const NODE_STYLES = {
  concept: { 
    width: 120, 
    height: 60,
    background: NODE_TYPE_COLORS.concept,
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  task: { 
    width: 120, 
    height: 60,
    background: NODE_TYPE_COLORS.task,
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  belief: { 
    width: 120, 
    height: 60,
    background: NODE_TYPE_COLORS.belief,
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  goal: { 
    width: 120, 
    height: 60,
    background: NODE_TYPE_COLORS.goal,
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  question: { 
    width: 120, 
    height: 60,
    background: NODE_TYPE_COLORS.question,
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  }
};

export const ReactFlowRenderer = ({ filters, priorityRange }) => {
  const { tasks, concepts, beliefs, goals } = useUiData();
  
  // Transform store data to ReactFlow format
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update nodes and edges when data changes
  React.useEffect(() => {
    const newNodes = [];
    const newEdges = [];

    // Add filtered concepts
    if (filters.concepts) {
      concepts.forEach((concept, index) => {
        if (concept.priority >= priorityRange.min && concept.priority <= priorityRange.max) {
          newNodes.push({
            id: `concept-${concept.term}`,
            type: 'default',
            position: { x: 100 + (index % 5) * 150, y: 100 + Math.floor(index / 5) * 100 },
            data: { 
              label: `${concept.term}\nPriority: ${concept.priority.toFixed(2)}`,
              type: 'concept',
              ...concept
            },
            style: NODE_STYLES.concept
          });
        }
      });
    }

    // Add filtered tasks
    if (filters.tasks) {
      tasks.forEach((task, index) => {
        if (task.priority >= priorityRange.min && task.priority <= priorityRange.max) {
          newNodes.push({
            id: `task-${task.id}`,
            type: 'default',
            position: { x: 200 + (index % 4) * 150, y: 250 + Math.floor(index / 4) * 100 },
            data: { 
              label: `${task.term || task.content || task.id}\nPriority: ${task.priority.toFixed(2)}`,
              type: task.type || 'task',
              ...task
            },
            style: NODE_STYLES[task.type] || NODE_STYLES.task
          });
        }
      });
    }

    // Add filtered beliefs
    if (filters.beliefs) {
      beliefs.forEach((belief, index) => {
        if (belief.priority >= priorityRange.min && belief.priority <= priorityRange.max) {
          newNodes.push({
            id: `belief-${belief.id}`,
            type: 'default',
            position: { x: 150 + (index % 4) * 150, y: 400 + Math.floor(index / 4) * 100 },
            data: { 
              label: `${belief.term}\nFreq: ${(belief.truth?.frequency || 0).toFixed(2)}`,
              type: 'belief',
              ...belief
            },
            style: NODE_STYLES.belief
          });
        }
      });
    }

    // Add filtered goals
    if (filters.goals) {
      goals.forEach((goal, index) => {
        if (goal.priority >= priorityRange.min && goal.priority <= priorityRange.max) {
          newNodes.push({
            id: `goal-${goal.id}`,
            type: 'default',
            position: { x: 250 + (index % 4) * 150, y: 550 + Math.floor(index / 4) * 100 },
            data: { 
              label: `${goal.term}\nDesire: ${(goal.truth?.desire || 0).toFixed(2)}`,
              type: 'goal',
              ...goal
            },
            style: NODE_STYLES.goal
          });
        }
      });
    }

    // Create some sample edges (in a real implementation, these would come from actual relationship data)
    if (newNodes.length > 1) {
      for (let i = 0; i < Math.min(5, newNodes.length - 1); i++) {
        newEdges.push({
          id: `edge-${i}`,
          source: newNodes[i].id,
          target: newNodes[i + 1].id,
          animated: true,
          style: { stroke: '#999', strokeWidth: 1 },
          label: "relation"
        });
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [concepts, tasks, beliefs, goals, filters, priorityRange, setNodes, setEdges]);

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