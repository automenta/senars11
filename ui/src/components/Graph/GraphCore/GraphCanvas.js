import React, { useCallback, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { themeUtils } from '../../../utils/themeUtils.js';
import { NODE_TYPE_CONFIG, LINK_TYPE_STYLES } from '../../../utils/graph/graphConstants.js';
import { drawNodeWithDetails, drawLinkWithDetails } from '../../../utils/graph/renderingUtils.js';

const GraphCanvas = ({
  graphData,
  onNodeClick,
  onNodeHover,
  onLinkClick,
  selectedNode
}) => {
  const fgRef = useRef();

  const getColorForNodeType = useCallback((type) => NODE_TYPE_CONFIG[type]?.color ?? '#999', []);

  const drawNode = useCallback((node, ctx, globalScale) => {
    drawNodeWithDetails(node, ctx, globalScale, selectedNode, NODE_TYPE_CONFIG);
  }, [selectedNode, NODE_TYPE_CONFIG]);

  const drawLink = useCallback((link, ctx, globalScale) => {
    drawLinkWithDetails(link, ctx, globalScale, LINK_TYPE_STYLES);
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
            label += `\nFreq: ${(node.truth.frequency ?? 0).toFixed(2)}, Conf: ${(node.truth.confidence ?? 0).toFixed(2)}`;
          } else if (node.type === 'goal' && node.truth) {
            label += `\nDesire: ${(node.truth.desire ?? 0).toFixed(2)}, Conf: ${(node.truth.confidence ?? 0).toFixed(2)}`;
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
          const linkType = link.type ?? 'association';
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
          return typeLabels[linkType] ?? linkType;
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