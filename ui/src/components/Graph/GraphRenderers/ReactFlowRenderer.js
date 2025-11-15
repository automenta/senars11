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
  const { tasks, concepts } = useUiData(); // Removed beliefs and goals since we're consolidating

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

    // Consolidate all tasks (including beliefs, questions, goals) with filtering by punctuation/type
    // Show tasks only if the main tasks filter is enabled
    if (filters.tasks) {
      tasks.forEach((task, index) => {
        if (task.priority >= priorityRange.min && task.priority <= priorityRange.max) {
          // Determine task type based on punctuation or type field
          let taskType = task.type || 'task';
          const content = task.term || task.content || task.id || '';

          // Determine type from punctuation if not provided
          if (!task.type) {
            if (content.endsWith('?')) {
              taskType = 'question';
            } else if (content.endsWith('!')) {
              taskType = 'goal';
            } else if (content.endsWith('.')) {
              taskType = 'belief';
            } else {
              taskType = 'task';
            }
          }

          // For the filters, we'll consider the task type based on punctuation
          // Check if this task type should be shown based on filters
          let shouldShow = false;
          if (taskType === 'question' && filters.questions) {
            shouldShow = true;
          } else if (taskType === 'belief' && filters.beliefs) {
            shouldShow = true;
          } else if (taskType === 'goal' && filters.goals) {
            shouldShow = true;
          } else if (taskType === 'task') { // Regular tasks without specific punctuation
            // We can show these if any of the other filters are active
            shouldShow = filters.beliefs || filters.questions || filters.goals;
          }

          if (shouldShow) {
            // Create label based on task type
            let label = `${content}`;
            if (taskType === 'belief') {
              label += `\nFreq: ${(task.truth?.frequency || task.budget?.priority || task.priority || 0).toFixed(2)}`;
            } else if (taskType === 'goal') {
              label += `\nDesire: ${(task.truth?.desire || task.budget?.priority || task.priority || 0).toFixed(2)}`;
            } else if (taskType === 'question') {
              label += `\nPriority: ${(task.budget?.priority || task.priority || 0).toFixed(2)}`;
            } else {
              label += `\nPriority: ${(task.budget?.priority || task.priority || 0).toFixed(2)}`;
            }

            newNodes.push({
              id: `task-${task.id}`,
              type: 'default',
              position: { x: 200 + (index % 4) * 150, y: 250 + Math.floor(index / 4) * 100 },
              data: {
                label: label,
                type: taskType,
                ...task
              },
              style: NODE_STYLES[taskType] || NODE_STYLES.task
            });
          }
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