import React from 'react';
import { NODE_TYPE_CONFIG } from '../../../utils/graph/graphConstants.js';

const Node = ({ node, isSelected, onClick, themeUtils }) => {
  const getNodeColor = (type) => NODE_TYPE_CONFIG[type]?.color ?? '#999';

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