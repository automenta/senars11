import React from 'react';
import ReactFlow from 'reactflow';
import PropTypes from 'prop-types';

const GraphPanel = ({ nodes, edges }) => {
    return (
        <div className="graph-panel" style={{ height: '500px' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
            >
            </ReactFlow>
        </div>
    );
};

GraphPanel.propTypes = {
    nodes: PropTypes.array.isRequired,
    edges: PropTypes.array.isRequired,
};

export default GraphPanel;
