import React, {useCallback, useState} from 'react';
import GraphCanvas from '../GraphCore/GraphCanvas.js';
import GraphControls from '../GraphCore/GraphControls.js';
import useGraphWebSocket from '../../../hooks/useGraphWebSocket.js';

const CONNECTION_STYLES = {
    connected: {backgroundColor: '#d4edda', color: '#155724'},
    disconnected: {backgroundColor: '#f8d7da', color: '#721c24'}
};

const NodeInfoPanel = ({node, onClose}) => React.createElement('div', {
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
        node.id
    ),
    React.createElement('p', null,
        React.createElement('strong', null, 'Term: '),
        node.term
    ),
    React.createElement('p', null,
        React.createElement('strong', null, 'Type: '),
        node.type
    ),
    node.priority != null && React.createElement('p', null,
        React.createElement('strong', null, 'Priority: '),
        node.priority.toFixed(3)
    ),
    React.createElement('button', {
        onClick: onClose,
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

const GraphView = () => {
    const [selectedNode, setSelectedNode] = useState(null);

    // Get graph data from WebSocket hook
    const {graphData, isConnected} = useGraphWebSocket();

    // Event handlers
    const handleNodeClick = useCallback((node) => setSelectedNode(node), []);

    const handleNodeHover = useCallback(() => {
        // Could implement highlighting on hover
    }, []);

    const handleLinkClick = useCallback(() => {
        // Could implement link details display
    }, []);

    // Control handlers
    const handleZoomIn = useCallback(() => {
        // This would be handled by the ForceGraph component
    }, []);

    const handleZoomOut = useCallback(() => {
        // This would be handled by the ForceGraph component
    }, []);

    const handleFitView = useCallback(() => {
        // This would be handled by the ForceGraph component
    }, []);

    const handleRefresh = useCallback(() => {
        console.log('Refresh clicked');
    }, []);

    return React.createElement('div', {
            style: {
                width: '100%',
                height: '100%',
                position: 'relative',
                backgroundColor: '#f8f9fa'
            }
        },
        React.createElement(GraphControls, {
            onZoomIn: handleZoomIn,
            onZoomOut: handleZoomOut,
            onFitView: handleFitView,
            onRefresh: handleRefresh
        }),
        React.createElement(GraphCanvas, {
            graphData: graphData,
            onNodeClick: handleNodeClick,
            onNodeHover: handleNodeHover,
            onLinkClick: handleLinkClick,
            selectedNode: selectedNode
        }),

        // Connection status indicator
        React.createElement('div', {
            style: {
                position: 'absolute',
                top: '10px',
                left: '10px',
                zIndex: 100,
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '0.8em',
                ...isConnected ? CONNECTION_STYLES.connected : CONNECTION_STYLES.disconnected
            }
        }, isConnected ? 'Connected' : 'Disconnected'),

        // Selected node info panel
        selectedNode && React.createElement(NodeInfoPanel, {
            node: selectedNode,
            onClose: () => setSelectedNode(null)
        })
    );
};

export default GraphView;