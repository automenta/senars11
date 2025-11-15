/**
 * Layout component for the Graph Visualization page
 * Provides the appropriate structure for graph visualizer
 */
import React from 'react';

const GraphLayout = ({ children }) => {
  // The GraphVisualizer already handles its own full layout
  // So we just return the children directly
  return React.createElement(React.Fragment, null, children);
};

export default GraphLayout;