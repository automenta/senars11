/**
 * Main Graph Visualizer Component
 * Now uses abstract renderer system with multiple visualization options
 */
import React from 'react';
import AbstractGraphVisualizer from './AbstractGraphVisualizer.js';

const GraphVisualizer = () => {
  // Use the abstract graph visualizer with all new functionality
  return React.createElement(AbstractGraphVisualizer, null);
};

export default GraphVisualizer;