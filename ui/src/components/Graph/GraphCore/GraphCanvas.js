import React, { useCallback, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { themeUtils } from '../../../utils/themeUtils.js';

const NODE_TYPE_COLORS = {
  concept: '#007bff',  // Blue for concepts
  task: '#28a745',     // Green for tasks
  belief: '#fd7e14',   // Orange for beliefs
  goal: '#dc3545',     // Red for goals
  question: '#6f42c1'  // Purple for questions
};

const LINK_TYPE_STYLES = {
  'task-concept-association': { color: '#007bff', width: 1, dash: null, type: 'solid' },    // Blue for task-concept
  'belief-concept-association': { color: '#fd7e14', width: 1, dash: null, type: 'solid' }, // Orange for belief-concept
  'goal-concept-association': { color: '#dc3545', width: 1, dash: null, type: 'solid' },   // Red for goal-concept
  'question-concept-association': { color: '#6f42c1', width: 1, dash: null, type: 'solid' }, // Purple for question-concept
  'concept-embedding': { color: '#6c757d', width: 1.5, dash: [5, 3], type: 'dashed' },    // Gray for concept embedding
  'concept-subterm': { color: '#20c997', width: 1.2, dash: [2, 3], type: 'dotted' },      // Teal for subterms
  'task-inference': { color: '#28a745', width: 2, dash: [5, 5], type: 'dashed' },         // Green for task inference
  'belief-similarity': { color: '#ffc107', width: 1.5, dash: [2, 2], type: 'dotted' },    // Yellow for belief similarity
  'goal-similarity': { color: '#e83e8c', width: 1.5, dash: [2, 2], type: 'dotted' },      // Pink for goal similarity
  'question-answer': { color: '#6610f2', width: 2, dash: [3, 3, 6, 3], type: 'dash-dot' }, // Purple for question-answer
  association: { color: '#999', width: 1, dash: null, type: 'solid' }, // Default fallback
  inference: { color: '#28a745', width: 2, dash: [5, 5], type: 'dashed' }, // Default inference
  similarity: { color: '#ffc107', width: 1.5, dash: [2, 2], type: 'dotted' } // Default similarity
};

const GraphCanvas = ({
  graphData,
  onNodeClick,
  onNodeHover,
  onLinkClick,
  selectedNode
}) => {
  const fgRef = useRef();

  const getColorForNodeType = useCallback((type) => NODE_TYPE_COLORS[type] ?? '#999', []);

  const drawNode = useCallback((node, ctx, globalScale) => {
    const label = node.term ?? node.id;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;

    // Draw main node circle
    const radius = Math.max(8, 24 / globalScale);
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

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      fgRef.current.zoomToFit(400);
    }
  }, [graphData]);

  return React.createElement('div',
    {
      style: { width: '100%', height: '100%' }
    },
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
        onNodeClick: onNodeClick,
        onNodeHover: onNodeHover,
        onLinkClick: onLinkClick,
        cooldownTicks: 100,
        d3AlphaDecay: 0.05,
        d3VelocityDecay: 0.4,
        onEngineStop: () => fgRef.current.zoomToFit(400),
        backgroundColor: themeUtils.get('BACKGROUNDS.CANVAS')
      }
    )
  );
};

export default GraphCanvas;