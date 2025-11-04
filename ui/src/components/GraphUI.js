import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import useUiStore from '../stores/uiStore.js';
import { getTaskColor } from '../utils/taskUtils.js';
import { themeUtils } from '../utils/themeUtils.js';

// Node types for different system items
const nodeTypes = {
  concept: ConceptNode,
  task: TaskNode,
  belief: BeliefNode,
  goal: GoalNode
};

// Custom node components
function ConceptNode({ data }) {
  return (
    <div style={{
      padding: '10px',
      borderRadius: '8px',
      backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
      border: `2px solid ${data.isSelected ? '#007bff' : '#666'}`,
      textAlign: 'center',
      minWidth: '120px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data.label}</div>
      <div style={{ fontSize: '0.8em' }}>Priority: {(data.priority || 0).toFixed(2)}</div>
    </div>
  );
}

function TaskNode({ data }) {
  return (
    <div style={{
      padding: '8px',
      borderRadius: '6px',
      backgroundColor: getTaskColor(data.type),
      border: `2px solid ${data.isSelected ? '#007bff' : '#666'}`,
      textAlign: 'center',
      minWidth: '100px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>{data.type}</div>
      <div style={{ fontSize: '0.7em' }}>{data.label}</div>
    </div>
  );
}

function BeliefNode({ data }) {
  return (
    <div style={{
      padding: '8px',
      borderRadius: '6px',
      backgroundColor: '#d4edda',
      border: `2px solid ${data.isSelected ? '#007bff' : '#666'}`,
      textAlign: 'center',
      minWidth: '100px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Belief</div>
      <div style={{ fontSize: '0.7em' }}>{data.label}</div>
      <div style={{ fontSize: '0.6em' }}>Freq: {(data.frequency || 0).toFixed(2)}</div>
    </div>
  );
}

function GoalNode({ data }) {
  return (
    <div style={{
      padding: '8px',
      borderRadius: '6px',
      backgroundColor: '#f8d7da',
      border: `2px solid ${data.isSelected ? '#007bff' : '#666'}`,
      textAlign: 'center',
      minWidth: '100px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Goal</div>
      <div style={{ fontSize: '0.7em' }}>{data.label}</div>
      <div style={{ fontSize: '0.6em' }}>Desire: {(data.desire || 0).toFixed(2)}</div>
    </div>
  );
}

const GraphUI = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const concepts = useUiStore(state => state.concepts);
  const tasks = useUiStore(state => state.tasks);
  const beliefs = useUiStore(state => state.beliefs);
  const goals = useUiStore(state => state.goals);

  // Generate nodes and edges from system data
  const { nodes: generatedNodes, edges: generatedEdges } = useMemo(() => {
    const nodeList = [];
    const edgeList = [];
    const nodeIdSet = new Set();

    // Add concepts as nodes
    concepts.forEach((concept, index) => {
      const id = `concept-${concept.term}`;
      nodeIdSet.add(id);
      
      nodeList.push({
        id,
        type: 'concept',
        position: { x: index * 150, y: 0 },
        data: { 
          label: concept.term,
          priority: concept.priority,
          taskCount: concept.taskCount,
          isSelected: selectedNode === id
        }
      });
    });

    // Add tasks as nodes
    tasks.forEach((task, index) => {
      const id = `task-${task.id || index}`;
      nodeIdSet.add(id);
      
      nodeList.push({
        id,
        type: 'task',
        position: { x: (index % 5) * 200, y: 150 + Math.floor(index / 5) * 150 },
        data: { 
          label: task.term,
          type: task.type,
          isSelected: selectedNode === id
        }
      });
    });

    // Add beliefs as nodes
    beliefs.forEach((belief, index) => {
      const id = `belief-${belief.id || index}`;
      nodeIdSet.add(id);
      
      nodeList.push({
        id,
        type: 'belief',
        position: { x: (index % 4) * 220, y: 400 + Math.floor(index / 4) * 150 },
        data: { 
          label: belief.term,
          frequency: belief.truth?.frequency,
          isSelected: selectedNode === id
        }
      });
    });

    // Add goals as nodes
    goals.forEach((goal, index) => {
      const id = `goal-${goal.id || index}`;
      nodeIdSet.add(id);
      
      nodeList.push({
        id,
        type: 'goal',
        position: { x: (index % 4) * 220, y: 650 + Math.floor(index / 4) * 150 },
        data: { 
          label: goal.term,
          desire: goal.truth?.desire,
          isSelected: selectedNode === id
        }
      });
    });

    // Create edges between related items
    // Connect tasks to their concepts
    tasks.forEach(task => {
      const taskId = `task-${task.id}`;
      if (task.term && nodeIdSet.has(taskId)) {
        // Simple heuristic to find related concept
        const relatedConcept = concepts.find(c => task.term.includes(c.term));
        if (relatedConcept) {
          const conceptId = `concept-${relatedConcept.term}`;
          if (nodeIdSet.has(conceptId)) {
            edgeList.push({
              id: `edge-${taskId}-${conceptId}`,
              source: taskId,
              target: conceptId,
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: '#007bff', strokeWidth: 2 }
            });
          }
        }
      }
    });

    // Connect beliefs to their concepts
    beliefs.forEach(belief => {
      const beliefId = `belief-${belief.id}`;
      if (belief.term && nodeIdSet.has(beliefId)) {
        const relatedConcept = concepts.find(c => belief.term.includes(c.term));
        if (relatedConcept) {
          const conceptId = `concept-${relatedConcept.term}`;
          if (nodeIdSet.has(conceptId)) {
            edgeList.push({
              id: `edge-${beliefId}-${conceptId}`,
              source: beliefId,
              target: conceptId,
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: '#28a745', strokeWidth: 2 }
            });
          }
        }
      }
    });

    // Connect goals to their concepts
    goals.forEach(goal => {
      const goalId = `goal-${goal.id}`;
      if (goal.term && nodeIdSet.has(goalId)) {
        const relatedConcept = concepts.find(c => goal.term.includes(c.term));
        if (relatedConcept) {
          const conceptId = `concept-${relatedConcept.term}`;
          if (nodeIdSet.has(conceptId)) {
            edgeList.push({
              id: `edge-${goalId}-${conceptId}`,
              source: goalId,
              target: conceptId,
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: '#dc3545', strokeWidth: 2 }
            });
          }
        }
      }
    });

    return { nodes: nodeList, edges: edgeList };
  }, [concepts, tasks, beliefs, goals, selectedNode]);

  // Update nodes and edges when data changes
  useEffect(() => {
    setNodes(generatedNodes);
    setEdges(generatedEdges);
  }, [generatedNodes, generatedEdges, setNodes, setEdges]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node.id);
  }, []);

  // Context menu for temporary Concepts
  const [contextMenu, setContextMenu] = useState(null);

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle clicking outside context menu
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [contextMenu, closeContextMenu]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} onClick={closeContextMenu}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        fitView
        attributionPosition="bottom-left"
        nodeTypes={nodeTypes}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
      
      {/* Context Menu */}
      {contextMenu && (
        <div 
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '4px 8px', cursor: 'pointer' }}>Add Related Concept</div>
          <div style={{ padding: '4px 8px', cursor: 'pointer' }}>View Details</div>
          <div style={{ padding: '4px 8px', cursor: 'pointer' }}>Export Node</div>
        </div>
      )}
      
      {/* Selected Node Info Panel */}
      {selectedNode && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '10px',
          maxWidth: '300px',
          zIndex: 100
        }}>
          <h4>Selected Item</h4>
          <p>ID: {selectedNode}</p>
          <button onClick={() => setSelectedNode(null)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default GraphUI;