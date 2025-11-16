import {useCallback, useEffect, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import {createRelationshipLinks, transformNarEventToNode} from '../utils/graph/transformers.js';
import {createConceptNode, createTaskNode} from '../utils/graph/nodeUtils.js';

// Function to update or add a node in graph data
const updateOrAddNode = (graphData, newNode) => {
    const existingIndex = graphData.nodes.findIndex(n => n.id === newNode.id);
    let updatedNodes;

    if (existingIndex !== -1) {
        updatedNodes = [...graphData.nodes];
        updatedNodes[existingIndex] = {...updatedNodes[existingIndex], ...newNode};
    } else {
        updatedNodes = [...graphData.nodes, newNode];
    }

    const updatedLinks = createRelationshipLinks(updatedNodes);
    return {nodes: updatedNodes, links: updatedLinks};
};

// Custom hook to handle WebSocket connection for graph visualization
const useGraphWebSocket = () => {
    const [graphData, setGraphData] = useState({nodes: [], links: []});
    const [isConnected, setIsConnected] = useState(false);
    const wsService = useUiStore(state => state.wsService);
    const wsConnected = useUiStore(state => state.wsConnected);

    // Initialize graph data from existing store data
    const concepts = useUiStore(state => state.concepts);
    const tasks = useUiStore(state => state.tasks);

    // Update initial graph data from store
    useEffect(() => {
        const initialNodes = [];
        const nodeMap = new Set();

        // Process items with deduplication
        // NOTE: Beliefs, Goals, and Questions ARE Tasks with different punctuation
        const processItems = (items, createNodeFn) => {
            items.forEach(item => {
                const nodeId = createNodeFn(item).id;
                if (!nodeMap.has(nodeId)) {
                    initialNodes.push(createNodeFn(item));
                    nodeMap.add(nodeId);
                }
            });
        };

        processItems(concepts, createConceptNode);
        // Process all tasks (Beliefs, Goals, Questions ARE all Tasks)
        processItems(tasks, createTaskNode);

        const initialLinks = createRelationshipLinks(initialNodes);
        setGraphData({nodes: initialNodes, links: initialLinks});
    }, [concepts, tasks]);

    // Handle different message types
    const handleMessage = useCallback((data) => {
        if (data.type === 'event') {
            // Transform NAR event to graph node
            const node = transformNarEventToNode(data);
            if (node) {
                setGraphData(prevData => updateOrAddNode(prevData, node));
            }
        } else if (data.type === 'taskUpdate' && data.payload?.task) {
            const taskNode = createTaskNode(data.payload.task);
            setGraphData(prevData => updateOrAddNode(prevData, taskNode));
        } else if (data.type === 'conceptUpdate' && data.payload?.concept) {
            const conceptNode = createConceptNode(data.payload.concept);
            setGraphData(prevData => updateOrAddNode(prevData, conceptNode));
        }
    }, []);

    // Handle WebSocket events
    useEffect(() => {
        if (!wsService) return;

        // Add the event listener
        const unsubscribe = wsService.addListener('event', handleMessage);

        // Also handle the general message routing
        const originalRouteMessage = wsService.routeMessage;
        wsService.routeMessage = function (data) {
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

    return {graphData, isConnected, setGraphData};
};

export default useGraphWebSocket;