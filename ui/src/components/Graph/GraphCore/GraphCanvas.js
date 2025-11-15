import React, { useCallback, useEffect, useRef } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import { themeUtils } from '../../../utils/themeUtils.js';

const NODE_TYPE_COLORS = {
  concept: '#007bff',  // Blue for concepts
  task: '#28a745',     // Green for tasks
  belief: '#ffc107',   // Yellow for beliefs
  goal: '#dc3545',     // Red for goals
  question: '#6f42c1'  // Purple for questions
};

const LINK_TYPE_STYLES = {
  association: { color: '#999', width: 1, dash: null },
  inference: { color: '#28a745', width: 2, dash: [5, 5] },  // Dashed for inference
  similarity: { color: '#ffc107', width: 1.5, dash: [2, 2] } // Dotted for similarity
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
        nodeLabel: node => `${node.term ?? node.id}${node.priority ? ` (Priority: ${node.priority.toFixed(2)})` : ''}`,
        nodeAutoColorBy: "type",
        nodeCanvasObject: drawNode,
        linkCanvasObject: drawLink,
        linkDirectionalArrowLength: 6,
        linkDirectionalArrowRelPos: 1,
        linkAutoColorBy: "type",
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