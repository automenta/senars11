import React, { useEffect, useRef, useCallback } from 'react';
import useUiStore from '../stores/uiStore.js';
import { getTaskColor } from '../utils/taskUtils.js';

const TaskRelationshipGraph = () => {
  const canvasRef = useRef(null);
  const tasks = useUiStore(state => state.tasks);
  const concepts = useUiStore(state => state.concepts);
  
  // Function to find relationships between tasks
  const getTaskRelationships = useCallback(() => {
    // For each task, find potential relationships with other tasks
    const relationships = [];
    
    tasks.forEach((task, index) => {
      // Look for relationships based on term similarity or dependencies
      tasks.forEach((otherTask, otherIndex) => {
        if (task.id !== otherTask.id) {
          // Check if terms are related (simple heuristic: if they share common words)
          if (task.term && otherTask.term) {
            const taskTerms = task.term.toLowerCase().split(/[()<>{}[\]| ]/).filter(Boolean);
            const otherTerms = otherTask.term.toLowerCase().split(/[()<>{}[\]| ]/).filter(Boolean);
            
            const commonWords = taskTerms.filter(word => otherTerms.includes(word));
            if (commonWords.length > 0) {
              relationships.push({
                from: task.id || `task-${index}`,
                to: otherTask.id || `task-${otherIndex}`,
                type: 'term-related',
                strength: commonWords.length
              });
            }
          }
          
          // If task has dependencies
          if (task.dependencies && Array.isArray(task.dependencies) && 
              task.dependencies.includes(otherTask.term)) {
            relationships.push({
              from: otherTask.id || `task-${otherIndex}`,
              to: task.id || `task-${index}`,
              type: 'dependency',
              strength: 1
            });
          }
          
          // If task influences other task (based on term matching)
          if (task.term && otherTask.term && 
              (otherTask.term.includes(task.term) || task.term.includes(otherTask.term))) {
            relationships.push({
              from: task.id || `task-${index}`,
              to: otherTask.id || `task-${otherIndex}`,
              type: 'influences',
              strength: 1
            });
          }
        }
      });
    });
    
    return relationships;
  }, [tasks]);
  
  // Function to find task by ID
  const getTaskById = useCallback((id) => {
    return tasks.find(task => task.id === id || `task-${tasks.indexOf(task)}` === id);
  }, [tasks]);
  
  // Draw the graph
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get relationships and tasks
    const relationships = getTaskRelationships();
    const visibleTasks = tasks.slice(0, 20); // Limit to 20 tasks to avoid overcrowding
    
    if (visibleTasks.length === 0) {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.fillText('No tasks to display relationships', width / 2, height / 2);
      return;
    }
    
    // Calculate positions for tasks (in a circular layout)
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    
    const taskPositions = {};
    visibleTasks.forEach((task, index) => {
      const angle = (index / visibleTasks.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      taskPositions[task.id || `task-${index}`] = { x, y, task };
    });
    
    // Draw relationships (lines between tasks)
    relationships.forEach(rel => {
      const fromPos = taskPositions[rel.from];
      const toPos = taskPositions[rel.to];
      
      if (fromPos && toPos) {
        // Set line style based on relationship type
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);
        
        // Set line width based on strength
        ctx.lineWidth = Math.min(4, rel.strength);
        
        // Set line color based on relationship type
        ctx.strokeStyle = getRelationshipColor(rel.type);
        
        ctx.stroke();
        
        // Draw arrow for directional relationships
        const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
        const arrowSize = 8;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(toPos.x, toPos.y);
        ctx.lineTo(
          toPos.x - arrowSize * Math.cos(angle - Math.PI/6),
          toPos.y - arrowSize * Math.sin(angle - Math.PI/6)
        );
        ctx.lineTo(
          toPos.x - arrowSize * Math.cos(angle + Math.PI/6),
          toPos.y - arrowSize * Math.sin(angle + Math.PI/6)
        );
        ctx.closePath();
        ctx.fill();
      }
    });
    
    // Draw task nodes
    Object.entries(taskPositions).forEach(([id, pos]) => {
      const task = pos.task;
      const isSelected = false; // We could add selection logic later
      
      // Draw node
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);
      ctx.fillStyle = getTaskColor(task.type);
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#000' : '#666';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
      
      // Draw task text (shortened if needed)
      ctx.font = '10px Arial';
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const text = getTaskText(task.term);
      ctx.fillText(text, pos.x, pos.y + 20);
    });
  }, [tasks, getTaskRelationships]);
  
  // Redraw when tasks change
  useEffect(() => {
    drawGraph();
  }, [drawGraph]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawGraph();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawGraph]);
  
  return React.createElement('div', 
    {style: {width: '100%', height: '400px', border: '1px solid #ddd', borderRadius: '4px'}},
    React.createElement('canvas', 
      {
        ref: canvasRef,
        width: 800,
        height: 400,
        style: {width: '100%', height: '100%', display: 'block'}
      }
    )
  );
};

export default TaskRelationshipGraph;