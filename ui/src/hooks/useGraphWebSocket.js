import { useEffect, useState, useCallback } from 'react';
import useUiStore from '../stores/uiStore.js';
import { createGraphDataFromNarEvents, transformNarEventToNode, createRelationshipLinks } from '../utils/graph/transformers.js';

// Function to create node from store data
const createNodeFromStoreData = (item, type, idPrefix, contentField = 'content', termField = 'term') => ({
  id: `${idPrefix}-${item.id ?? item.term}`,
  term: item[contentField] ?? item[termField],
  type,
  priority: item.priority,
  createdAt: item.creationTime ?? item.occurrenceTime ?? Date.now(),
  ...(item.truth && { truth: item.truth })
});

// Function to update or add a node in graph data
const updateOrAddNode = (graphData, newNode) => {
  const existingIndex = graphData.nodes.findIndex(n => n.id === newNode.id);
  let updatedNodes;

  if (existingIndex !== -1) {
    updatedNodes = [...graphData.nodes];
    updatedNodes[existingIndex] = { ...updatedNodes[existingIndex], ...newNode };
  } else {
    updatedNodes = [...graphData.nodes, newNode];
  }

  const updatedLinks = createRelationshipLinks(updatedNodes);
  return { nodes: updatedNodes, links: updatedLinks };
};

// Custom hook to handle WebSocket connection for graph visualization
const useGraphWebSocket = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isConnected, setIsConnected] = useState(false);
  const wsService = useUiStore(state => state.wsService);
  const wsConnected = useUiStore(state => state.wsConnected);

  // Initialize graph data from existing store data
  const concepts = useUiStore(state => state.concepts);
  const tasks = useUiStore(state => state.tasks);
  const beliefs = useUiStore(state => state.beliefs);
  const goals = useUiStore(state => state.goals);

  // Update initial graph data from store
  useEffect(() => {
    const initialNodes = [];
    const nodeMap = new Set();

    // Process items with deduplication
    const processItems = (items, type, idPrefix, contentField = 'content', termField = 'term') => {
      items.forEach(item => {
        const nodeId = `${idPrefix}-${item.id ?? item.term}`;
        if (!nodeMap.has(nodeId)) {
          initialNodes.push(createNodeFromStoreData(item, type, idPrefix, contentField, termField));
          nodeMap.add(nodeId);
        }
      });
    };

    processItems(concepts, 'concept', 'concept', 'term', 'term');
    processItems(tasks, 'task', 'task', 'content', 'term');
    processItems(beliefs, 'belief', 'belief', 'term', 'term');
    processItems(goals, 'goal', 'goal', 'term', 'term');

    const initialLinks = createRelationshipLinks(initialNodes);
    setGraphData({ nodes: initialNodes, links: initialLinks });
  }, [concepts, tasks, beliefs, goals]);

  // Handle different message types
  const handleMessage = useCallback((data) => {
    if (data.type === 'event') {
      // Transform NAR event to graph node
      const node = transformNarEventToNode(data);
      if (node) {
        setGraphData(prevData => updateOrAddNode(prevData, node));
      }
    } else if (data.type === 'taskUpdate' && data.payload?.task) {
      const taskNode = createNodeFromStoreData(data.payload.task, 'task', 'task', 'content', 'term');
      setGraphData(prevData => updateOrAddNode(prevData, taskNode));
    } else if (data.type === 'conceptUpdate' && data.payload?.concept) {
      const conceptNode = createNodeFromStoreData(data.payload.concept, 'concept', 'concept', 'term', 'term');
      setGraphData(prevData => updateOrAddNode(prevData, conceptNode));
    } else if (data.type === 'beliefUpdate' && data.payload) {
      const beliefNode = createNodeFromStoreData(data.payload, 'belief', 'belief', 'term', 'term');
      beliefNode.truth = data.payload.truth;
      setGraphData(prevData => updateOrAddNode(prevData, beliefNode));
    } else if (data.type === 'goalUpdate' && data.payload) {
      const goalNode = createNodeFromStoreData(data.payload, 'goal', 'goal', 'term', 'term');
      goalNode.truth = data.payload.truth;
      setGraphData(prevData => updateOrAddNode(prevData, goalNode));
    }
  }, []);

  // Handle WebSocket events
  useEffect(() => {
    if (!wsService) return;

    // Add the event listener
    const unsubscribe = wsService.addListener('event', handleMessage);

    // Also handle the general message routing
    const originalRouteMessage = wsService.routeMessage;
    wsService.routeMessage = function(data) {
      handleMessage(data);
      return originalRouteMessage.call(this, data);
    };

    // Update connection status
    setIsConnected(wsConnected);

    // Cleanup
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
      // Restore original routeMessage if we modified it
      if (originalRouteMessage) {
        wsService.routeMessage = originalRouteMessage;
      }
    };
  }, [wsService, wsConnected, handleMessage]);

  return { graphData, isConnected, setGraphData };
};

export default useGraphWebSocket;