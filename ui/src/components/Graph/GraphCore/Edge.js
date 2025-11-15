import React from 'react';

const Edge = ({ link, onClick, themeUtils }) => {
  const getEdgeColor = (type) => {
    const colors = {
      association: '#999',
      inference: '#28a745',
      similarity: '#ffc107',
      causation: '#dc3545'
    };
    return colors[type] || '#999';
  };

  const getEdgeStyle = (type) => {
    const styles = {
      association: { strokeDasharray: 'none' },
      inference: { strokeDasharray: '5,5' },
      similarity: { strokeDasharray: '2,2' },
      causation: { strokeDasharray: 'none' }
    };
    return styles[type] || styles.association;
  };

  const edgeColor = getEdgeColor(link.type);
  const edgeStyle = getEdgeStyle(link.type);

  return React.createElement('line',
    {
      x1: link.source.x,
      y1: link.source.y,
      x2: link.target.x,
      y2: link.target.y,
      stroke: edgeColor,
      strokeWidth: "2",
      strokeDasharray: edgeStyle.strokeDasharray,
      onClick: () => onClick && onClick(link),
      style: { cursor: 'pointer' }
    },
    link.directional && React.createElement('marker', {
      id: `arrow-${link.id}`,
      markerWidth: "10",
      markerHeight: "10",
      refX: "15",
      refY: "3",
      orient: "auto",
      markerUnits: "strokeWidth"
    },
    React.createElement('path', {
      d: "M0,0 L0,6 L9,3 z",
      fill: edgeColor
    }))
  );
};

export default Edge;