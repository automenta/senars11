import React from 'react';
import PropTypes from 'prop-types';
import ReactFlow from 'reactflow';
import 'reactflow/dist/style.css';

/**
 * A panel that displays a graph.
 * @param {{
 *   nodes: any[];
 *   edges: any[];
 * }} props
 */
export const GraphPanel = ({ nodes, edges }) => {
  return (
    <div className="graph-panel" style={{ height: '500px' }}>
      <ReactFlow nodes={nodes} edges={edges} />
    </div>
  );
};

GraphPanel.propTypes = {
  /**
   * The nodes of the graph.
   */
  nodes: PropTypes.array.isRequired,
  /**
   * The edges of the graph.
   */
  edges: PropTypes.array.isRequired,
};
