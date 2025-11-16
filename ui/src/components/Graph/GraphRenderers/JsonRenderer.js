/**
 * JSON/Text Renderer
 * Shows raw JSON representation of the graph data for debugging purposes
 */
import React from 'react';
import { useUiData } from '../../../hooks/useWebSocket.js';
import { detectTaskType } from '../../../utils/graph/nodeUtils.js';

export const JsonRenderer = ({ filters, priorityRange }) => {
  const {
    tasks, concepts, // Removed beliefs and goals since we're consolidating
    wsConnected,
    systemMetrics
  } = useUiData();

  // Filter data based on filters and priority range
  const filteredData = React.useMemo(() => {
    const result = {};

    if (filters.concepts) {
      result.concepts = concepts.filter(concept =>
        concept.priority >= priorityRange.min && concept.priority <= priorityRange.max
      );
    }

    // Consolidate task filtering based on punctuation/type
    // Show tasks based on their specific type filters (no main tasks filter anymore)
    result.tasks = tasks.filter(task => {
      if (task.priority < priorityRange.min || task.priority > priorityRange.max) {
        return false;
      }

      const taskType = detectTaskType(task);

      // Check if this task type should be included based on filters
      if (taskType === 'question' && filters.questions) {
        return true;
      } else if (taskType === 'belief' && filters.beliefs) {
        return true;
      } else if (taskType === 'goal' && filters.goals) {
        return true;
      } else if (taskType === 'task') {
        // Include if any filter is active
        return filters.beliefs || filters.questions || filters.goals;
      }

      return false;
    });

    result.systemMetrics = systemMetrics;
    result.wsConnected = wsConnected;

    return result;
  }, [concepts, tasks, filters, priorityRange, wsConnected, systemMetrics]);

  const jsonContent = JSON.stringify(filteredData, null, 2);

  return React.createElement('div', {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
      fontSize: '12px',
      padding: '10px',
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      overflow: 'auto'
    }
  },
  React.createElement('div', {
    style: {
      marginBottom: '10px',
      padding: '5px',
      backgroundColor: '#2d2d2d',
      borderRadius: '3px'
    }
  },
  React.createElement('strong', null, 'JSON Graph Data'),
  React.createElement('br'),
  React.createElement('span', { 
    style: { 
      color: wsConnected ? '#4ec9b0' : '#d19a66' 
    } 
  }, `WebSocket: ${wsConnected ? 'CONNECTED' : 'DISCONNECTED'}`)
  ),
  React.createElement('pre', {
    style: {
      margin: 0,
      padding: '10px',
      backgroundColor: '#2d2d2d',
      borderRadius: '3px',
      overflow: 'auto',
      maxHeight: 'calc(100% - 60px)',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word'
    }
  }, jsonContent)
  );
};