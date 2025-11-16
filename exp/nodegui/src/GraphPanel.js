import React, { useEffect, useRef } from 'react';
import { Canvas, View } from '@nodegui/react-nodegui';
import { useStore } from './store.js';

const style = {
  flex: 1,
  background: '#1a1a1a',
};

export function GraphPanel({ style: customStyle }) {
  const { nodes, edges } = useStore();
  const canvasRef = useRef();

  useEffect(() => {
    try {
      // In NodeGUI, the canvas context handling is different
      // We'll update the canvas when nodes/edges change
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Get the canvas 2D context to draw
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width || 1200, canvas.height || 800);

      // Draw edges
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      if (Array.isArray(edges)) {
        edges.forEach(edge => {
          if (edge && typeof edge === 'object') {
            const sourceX = typeof edge.sourceX === 'number' ? edge.sourceX : 100;
            const sourceY = typeof edge.sourceY === 'number' ? edge.sourceY : 100;
            const targetX = typeof edge.targetX === 'number' ? edge.targetX : 200;
            const targetY = typeof edge.targetY === 'number' ? edge.targetY : 200;

            ctx.beginPath();
            ctx.moveTo(sourceX, sourceY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
          }
        });
      }

      // Draw nodes
      if (Array.isArray(nodes)) {
        nodes.forEach(node => {
          if (node && typeof node === 'object') {
            ctx.fillStyle = '#4f46e5';
            const x = typeof node.x === 'number' ? node.x : 100;
            const y = typeof node.y === 'number' ? node.y : 100;
            ctx.fillRect(x - 8, y - 8, 16, 16);

            // Draw node label if available
            if (node.label && typeof node.label === 'string') {
              ctx.fillStyle = 'white';
              ctx.font = '12px Arial';
              ctx.fillText(node.label, x + 10, y);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error in GraphPanel drawing:', error);
    }
  }, [nodes, edges]);

  return React.createElement(View, { style: { ...style, ...customStyle } },
    React.createElement(Canvas, {
      ref: canvasRef,
      width: 1200,
      height: 800,
    })
  );
}