/**
 * Force Graph Renderer
 * Original force-directed graph implementation as a renderer
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { themeUtils } from '../../../utils/themeUtils.js';
import { useUiData } from '../../../hooks/useWebSocket.js';

// Node type colors
const NODE_TYPE_COLORS = {
  concept: '#007bff',  // Blue for concepts
  task: '#28a745',     // Green for tasks
  belief: '#fd7e14',   // Orange for beliefs
  goal: '#dc3545',     // Red for goals
  question: '#6f42c1'  // Purple for questions
};

// Link type styles
const LINK_TYPE_STYLES = {
  'task-concept-association': { color: '#007bff', width: 1, dash: null, type: 'solid' },
  'belief-concept-association': { color: '#fd7e14', width: 1, dash: null, type: 'solid' },
  'goal-concept-association': { color: '#dc3545', width: 1, dash: null, type: 'solid' },
  'question-concept-association': { color: '#6f42c1', width: 1, dash: null, type: 'solid' },
  'concept-embedding': { color: '#6c757d', width: 1.5, dash: [5, 3], type: 'dashed' },
  'concept-subterm': { color: '#20c997', width: 1.2, dash: [2, 3], type: 'dotted' },
  'task-inference': { color: '#28a745', width: 2, dash: [5, 5], type: 'dashed' },
  'belief-similarity': { color: '#ffc107', width: 1.5, dash: [2, 2], type: 'dotted' },
  'goal-similarity': { color: '#e83e8c', width: 1.5, dash: [2, 2], type: 'dotted' },
  'question-answer': { color: '#6610f2', width: 2, dash: [3, 3, 6, 3], type: 'dash-dot' },
  association: { color: '#999', width: 1, dash: null, type: 'solid' },
  inference: { color: '#28a745', width: 2, dash: [5, 5], type: 'dashed' },
  similarity: { color: '#ffc107', width: 1.5, dash: [2, 2], type: 'dotted' }
};

// Default node and link properties
const DEFAULT_NODE_SIZE = 8;
const MAX_NODE_SIZE = 24;

export const ForceGraphRenderer = ({ filters, priorityRange }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const fgRef = useRef();

  // Get data from store (consolidated - no separate beliefs/goals arrays)
  const {
    tasks, concepts, // Removed beliefs and goals since we're consolidating
    wsConnected,
    addNotification
  } = useUiData();

  // Transform store data to graph format based on filters
  const graphData = React.useMemo(() => {
    const nodes = [];
    const links = [];

    // Add filtered nodes
    if (filters.concepts) {
      concepts.forEach(concept => {
        if (concept.priority >= priorityRange.min && concept.priority <= priorityRange.max) {
          nodes.push({
            id: `concept-${concept.term}`,
            term: concept.term,
            type: 'concept',
            priority: concept.priority,
            taskCount: concept.taskCount,
            beliefCount: concept.beliefCount,
            questionCount: concept.questionCount,
            occurrenceTime: concept.occurrenceTime
          });
        }
      });
    }

    // Consolidate all tasks (including beliefs, questions, goals) with filtering by punctuation/type
    // Show tasks only if the main tasks filter is enabled
    if (filters.tasks) {
      tasks.forEach(task => {
        if (task.priority >= priorityRange.min && task.priority <= priorityRange.max) {
          // Determine task type based on punctuation or type field
          let taskType = task.type || 'task';
          const content = task.content || task.term || task.id || '';

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
            nodes.push({
              id: `task-${task.id}`,
              term: task.content || task.term || task.id,
              type: taskType,
              priority: task.priority,
              creationTime: task.creationTime,
              truth: task.truth,
              ...task
            });
          }
        }
      });
    }

    // Add some sample links (in a real implementation, these would come from the actual relationship data)
    // For now, we'll create some basic associations between concepts and other nodes
    nodes.forEach((node, index) => {
      // Create some associations with other nodes
      if (index < nodes.length - 1) {
        links.push({
          source: node.id,
          target: nodes[index + 1].id,
          type: 'association'
        });
      }
    });

    return { nodes, links };
  }, [concepts, tasks, filters, priorityRange]);

  const getColorForNodeType = useCallback((type) => NODE_TYPE_COLORS[type] ?? '#999', []);

  const drawNode = useCallback((node, ctx, globalScale) => {
    const label = node.term ?? node.id;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;

    // Calculate radius based on priority
    const baseRadius = DEFAULT_NODE_SIZE / globalScale;
    const priorityRadius = node.priority ? (node.priority * MAX_NODE_SIZE / globalScale) : baseRadius;
    const radius = Math.max(baseRadius, priorityRadius);

    // Draw main node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = getColorForNodeType(node.type);
    ctx.fill();

    // Highlight selected node
    if (selectedNode?.id === node.id) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Draw label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = themeUtils.get('TEXT.PRIMARY');
    ctx.fillText(label, node.x, node.y + fontSize * 1.2);

    // Draw priority indicator as border thickness
    if (node.priority != null) {
      const priority = Math.max(0, Math.min(1, node.priority));
      const borderWidth = Math.max(1, priority * 5) / globalScale;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + borderWidth, 0, 2 * Math.PI, false);
      ctx.strokeStyle = `rgba(255, 255, 255, ${priority})`;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }

    // Draw belief-specific information (frequency and confidence)
    if (node.type === 'belief' && node.truth) {
      const frequency = node.truth.frequency;
      const confidence = node.truth.confidence;

      // Draw frequency indicator as inner circle
      if (frequency != null) {
        const freqRadius = radius * 0.6;
        ctx.beginPath();
        ctx.arc(node.x, node.y, freqRadius, 0, 2 * Math.PI, false);
        ctx.strokeStyle = `rgba(255, 0, 0, ${frequency})`; // Red for frequency
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();

        // Add frequency text
        ctx.font = `${fontSize * 0.8}px Sans-Serif`;
        ctx.fillStyle = '#000';
        ctx.fillText(`${frequency.toFixed(2)}`, node.x, node.y - fontSize * 0.5);
      }

      // Draw confidence indicator
      if (confidence != null) {
        // Draw confidence as a small bar at the bottom
        const barWidth = 12 / globalScale;
        const barHeight = 4 / globalScale;
        const barX = node.x - barWidth / 2;
        const barY = node.y + radius + 2 / globalScale;

        // Background bar (gray)
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Confidence bar (blue)
        ctx.fillStyle = `rgba(0, 123, 255, ${confidence})`;
        ctx.fillRect(barX, barY, barWidth * confidence, barHeight);
      }
    }

    // Draw goal-specific information (desire and confidence)
    if (node.type === 'goal' && node.truth) {
      const desire = node.truth.desire;
      const confidence = node.truth.confidence;

      if (desire != null) {
        // Draw desire as an outer ring around the goal node
        const desireRadius = radius * 1.3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, desireRadius, 0, 2 * Math.PI, false);
        ctx.strokeStyle = `rgba(255, 0, 0, ${Math.abs(desire)})`; // Red for positive, blue for negative
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();

        // Add desire text
        ctx.font = `${fontSize * 0.8}px Sans-Serif`;
        ctx.fillStyle = '#000';
        ctx.fillText(`${desire.toFixed(2)}`, node.x, node.y + fontSize * 1.8);
      }

      if (confidence != null) {
        // Draw confidence as a small bar at the bottom
        const barWidth = 12 / globalScale;
        const barHeight = 4 / globalScale;
        const barX = node.x - barWidth / 2;
        const barY = node.y + radius + 6 / globalScale;

        // Background bar (gray)
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Confidence bar (red for goals)
        ctx.fillStyle = `rgba(220, 53, 69, ${confidence})`;
        ctx.fillRect(barX, barY, barWidth * confidence, barHeight);
      }
    }

    // Draw question-specific information (priority indicators)
    if (node.type === 'question' && node.priority != null) {
      // Draw question priority as a pulsing border effect
      const pulseOffset = (Date.now() % 1000) / 1000; // 0 to 1 over 1 second
      const pulseValue = Math.sin(pulseOffset * Math.PI * 2) * 0.5 + 0.5; // 0 to 1
      const pulseRadius = radius * (1.1 + 0.2 * pulseValue); // Pulsing radius

      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseRadius, 0, 2 * Math.PI, false);
      ctx.strokeStyle = `rgba(111, 66, 193, ${0.3 + 0.7 * pulseValue})`; // Purple for questions
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    }
  }, [selectedNode, getColorForNodeType]);

  const drawLink = useCallback((link, ctx, globalScale) => {
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);

    // Get style based on link type
    const style = LINK_TYPE_STYLES[link.type] ?? LINK_TYPE_STYLES.association;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width / globalScale;

    // Apply dash pattern if specified
    if (style.dash) {
      ctx.setLineDash(style.dash);
    }

    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Draw arrow for directional relationships
    if (link.directional) {
      const angle = Math.atan2(link.target.y - link.source.y, link.target.x - link.source.x);
      const arrowSize = 5 / globalScale;

      ctx.beginPath();
      ctx.moveTo(link.target.x, link.target.y);
      ctx.lineTo(
        link.target.x - arrowSize * Math.cos(angle - Math.PI / 6),
        link.target.y - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        link.target.x - arrowSize * Math.cos(angle + Math.PI / 6),
        link.target.y - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
  }, []);

  // Event handlers
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    addNotification?.({
      type: 'info',
      title: 'Node Selected',
      message: `Selected: ${node.term || node.id} (${node.type})`,
      timestamp: Date.now()
    });
  }, [addNotification]);

  const handleNodeHover = useCallback(() => {
    // Could implement highlighting on hover
  }, []);

  const handleLinkClick = useCallback(() => {
    // Could implement link details display
  }, []);

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      fgRef.current.zoomToFit(400);
    }
  }, [graphData]);

  // Connection status indicator
  const connectionIndicator = React.createElement('div', {
    style: {
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: 100,
      padding: '5px 10px',
      borderRadius: '4px',
      fontSize: '0.8em',
      backgroundColor: wsConnected ? '#d4edda' : '#f8d7da',
      color: wsConnected ? '#155724' : '#721c24'
    }
  }, wsConnected ? 'Connected' : 'Disconnected');

  // Selected node info panel
  const nodeInfoPanel = selectedNode && React.createElement('div', {
    style: {
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '15px',
      maxWidth: '300px',
      zIndex: 100,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }
  },
  React.createElement('h4', null, 'Node Details'),
  React.createElement('p', null,
    React.createElement('strong', null, 'ID: '),
    selectedNode.id
  ),
  React.createElement('p', null,
    React.createElement('strong', null, 'Term: '),
    selectedNode.term
  ),
  React.createElement('p', null,
    React.createElement('strong', null, 'Type: '),
    selectedNode.type
  ),
  selectedNode.priority != null && React.createElement('p', null,
    React.createElement('strong', null, 'Priority: '),
    selectedNode.priority.toFixed(3)
  ),
  React.createElement('button', {
    onClick: () => setSelectedNode(null),
    style: {
      marginTop: '10px',
      padding: '5px 10px',
      background: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer'
    }
  }, 'Close')
  );

  return React.createElement('div', {
    style: {
      width: '100%',
      height: '100%',
      position: 'relative'
    }
  },
  connectionIndicator,
  nodeInfoPanel,
  React.createElement(ForceGraph2D,
    {
      ref: fgRef,
      graphData: graphData,
      nodeLabel: node => {
        let label = `${node.term ?? node.id}`;

        if (node.type === 'belief' && node.truth) {
          label += `\nFreq: ${(node.truth.frequency || 0).toFixed(2)}, Conf: ${(node.truth.confidence || 0).toFixed(2)}`;
        } else if (node.type === 'goal' && node.truth) {
          label += `\nDesire: ${(node.truth.desire || 0).toFixed(2)}, Conf: ${(node.truth.confidence || 0).toFixed(2)}`;
        } else if (node.type === 'question' && node.priority) {
          label += `\nPriority: ${node.priority.toFixed(2)}`;
        } else if (node.priority) {
          label += ` (Priority: ${node.priority.toFixed(2)})`;
        }

        return label;
      },
      nodeAutoColorBy: "type",
      nodeCanvasObject: drawNode,
      linkCanvasObject: drawLink,
      linkDirectionalArrowLength: 6,
      linkDirectionalArrowRelPos: 1,
      linkAutoColorBy: "type",
      linkLabel: link => {
        const linkType = link.type || 'association';
        const typeLabels = {
          'task-concept-association': 'Task-Concept',
          'belief-concept-association': 'Belief-Concept',
          'goal-concept-association': 'Goal-Concept',
          'question-concept-association': 'Question-Concept',
          'concept-embedding': 'Embedding',
          'concept-subterm': 'Subterm',
          'task-inference': 'Inference',
          'belief-similarity': 'Belief Sim',
          'goal-similarity': 'Goal Sim',
          'question-answer': 'Answer',
          association: 'Association',
          inference: 'Inference',
          similarity: 'Similarity'
        };
        return typeLabels[linkType] || linkType;
      },
      onNodeClick: handleNodeClick,
      onNodeHover: handleNodeHover,
      onLinkClick: handleLinkClick,
      cooldownTicks: 100,
      d3AlphaDecay: 0.05,
      d3VelocityDecay: 0.4,
      onEngineStop: () => fgRef.current.zoomToFit(400),
      backgroundColor: themeUtils.get('BACKGROUNDS.CANVAS')
    }
  ));
};