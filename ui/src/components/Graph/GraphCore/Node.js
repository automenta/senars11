import React from 'react';

const Node = ({ node, isSelected, onClick, themeUtils }) => {
  const getNodeColor = (type) => {
    const colors = {
      concept: '#007bff', // Blue
      task: '#28a745',    // Green
      belief: '#ffc107',  // Yellow
      goal: '#dc3545',    // Red
      question: '#6f42c1' // Purple
    };
    return colors[type] || '#999';
  };

  const size = Math.max(10, 20 * (node.priority || 0.5)); // Scale based on priority

  return React.createElement('g',
    {
      onClick: () => onClick && onClick(node),
      style: { cursor: 'pointer' }
    },
    React.createElement('circle', {
      r: size,
      fill: getNodeColor(node.type),
      stroke: isSelected ? '#000' : '#666',
      strokeWidth: isSelected ? 3 : 1
    }),
    React.createElement('text', {
      textAnchor: "middle",
      y: size + 15,
      fontSize: 12,
      fill: themeUtils?.get('TEXT.PRIMARY') || '#000'
    }, node.term || node.id)
  );
};

export default Node;