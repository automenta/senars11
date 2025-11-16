import React from 'react';
import ReactFlow from 'reactflow';
import useNarStore from '../store/nar-store';

const GraphPanel = () => {
    const { graphNodes, graphEdges } = useNarStore();

    return (
        <ReactFlow
            nodes={graphNodes}
            edges={graphEdges}
        >
        </ReactFlow>
    );
};

export default GraphPanel;
