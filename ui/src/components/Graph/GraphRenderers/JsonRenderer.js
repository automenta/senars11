/**
 * JSON/Text Renderer
 * Shows raw JSON representation of the graph data for debugging purposes
 */
import React from 'react';
import { useUiData } from '../../../hooks/useWebSocket.js';

export const JsonRenderer = ({ filters, priorityRange }) => {
  const { 
    tasks, concepts, beliefs, goals, 
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

    if (filters.tasks) {
      result.tasks = tasks.filter(task => 
        task.priority >= priorityRange.min && task.priority <= priorityRange.max
      );
    }

    if (filters.beliefs) {
      result.beliefs = beliefs.filter(belief => 
        belief.priority >= priorityRange.min && belief.priority <= priorityRange.max
      );
    }

    if (filters.goals) {
      result.goals = goals.filter(goal => 
        goal.priority >= priorityRange.min && goal.priority <= priorityRange.max
      );
    }

    result.systemMetrics = systemMetrics;
    result.wsConnected = wsConnected;

    return result;
  }, [concepts, tasks, beliefs, goals, filters, priorityRange, wsConnected, systemMetrics]);

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