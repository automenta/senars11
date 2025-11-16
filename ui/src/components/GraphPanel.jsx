import React from 'react';
import ReactFlow from 'reactflow';
import 'reactflow/dist/style.css';
import PropTypes from 'prop-types';

export const GraphPanel = ({ nodes, edges }) => {
    return (
        <div style={{ height: '100%' }}>
            <ReactFlow nodes={nodes} edges={edges} />
        </div>
    );
};

GraphPanel.propTypes = {
    nodes: PropTypes.array.isRequired,
    edges: PropTypes.array.isRequired,
};
