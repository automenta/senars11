import React, { useCallback, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { themeUtils } from '../../../utils/themeUtils.js';
import { NODE_TYPE_CONFIG, LINK_TYPE_STYLES } from '../../../utils/graph/graphConstants.js';
import { drawNodeWithDetails, drawLinkWithDetails } from '../../../utils/graph/renderingUtils.js';
import { formatNodeLabel } from '../../../utils/graph/transformers.js';

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
        nodeLabel: formatNodeLabel,
        nodeAutoColorBy: "type",
        nodeCanvasObject: drawNode,
        linkCanvasObject: drawLink,
        linkDirectionalArrowLength: 6,
        linkDirectionalArrowRelPos: 1,
        linkAutoColorBy: "type",
        linkLabel: formatLinkLabel,
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