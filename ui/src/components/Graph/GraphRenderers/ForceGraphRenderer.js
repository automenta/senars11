/**
 * Force Graph Renderer
 * Original force-directed graph implementation as a renderer
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { themeUtils } from '../../../utils/themeUtils.js';
import { useUiData } from '../../../hooks/useWebSocket.js';
import { NODE_TYPE_CONFIG, LINK_TYPE_STYLES, DEFAULT_NODE_SIZE, MAX_NODE_SIZE } from '../../../utils/graph/graphConstants.js';
import { drawNodeWithDetails, drawLinkWithDetails } from '../../../utils/graph/renderingUtils.js';
import { createConceptNode, createTaskNode } from '../../../utils/graph/nodeUtils.js';
import { formatNodeLabel, formatLinkLabel } from '../../../utils/graph/transformers.js';


// Create sample links between nodes
const createSampleLinks = (nodes) => {
  const links = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    links.push({
      source: nodes[i].id,
      target: nodes[i + 1].id,
      type: 'association'
    });
  }
  return links;
};

export const ForceGraphRenderer = ({ filters, priorityRange }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const fgRef = useRef();

  // Get data from store
  const {
    tasks, concepts,
    wsConnected,
    addNotification
  } = useUiData();

  // Transform store data to graph format based on filters
  const graphData = React.useMemo(() => {
    const nodes = [];

    // Add filtered concepts
    if (filters.concepts) {
      const filteredConcepts = concepts.filter(concept =>
        concept.priority >= priorityRange.min && concept.priority <= priorityRange.max
      );
      const conceptNodes = filteredConcepts.map(createConceptNode);
      nodes.push(...conceptNodes);
    }

    // Add all tasks (using budget.priority if available, otherwise priority)
    const filteredTasks = tasks.filter(task => {
      const priority = task.budget?.priority ?? task.priority ?? 0;
      return priority >= priorityRange.min && priority <= priorityRange.max;
    });
    const taskNodes = filteredTasks.map(createTaskNode);
    nodes.push(...taskNodes);

    const links = createSampleLinks(nodes);

    return { nodes, links };
  }, [concepts, tasks, filters, priorityRange]);

  const drawNode = useCallback((node, ctx, globalScale) => {
    drawNodeWithDetails(node, ctx, globalScale, selectedNode, NODE_TYPE_CONFIG);
  }, [selectedNode, NODE_TYPE_CONFIG]);

  const drawLink = useCallback((link, ctx, globalScale) => {
    drawLinkWithDetails(link, ctx, globalScale, LINK_TYPE_STYLES);
  }, []);

  // Event handlers
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    addNotification?.({
      type: 'info',
      title: 'Node Selected',
      message: `Selected: ${node.term ?? node.id} (${node.type})`,
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
      nodeLabel: formatNodeLabel,
      nodeAutoColorBy: "type",
      nodeCanvasObject: drawNode,
      linkCanvasObject: drawLink,
      linkDirectionalArrowLength: 6,
      linkDirectionalArrowRelPos: 1,
      linkAutoColorBy: "type",
      linkLabel: formatLinkLabel,
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