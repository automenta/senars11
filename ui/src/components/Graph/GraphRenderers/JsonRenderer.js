/**
 * JSON/Text Renderer
 * Shows raw JSON representation of the graph data for debugging purposes
 */
import React from 'react';
import { useUiData } from '../../../hooks/useWebSocket.js';
import { detectTaskType } from '../../../utils/graph/nodeUtils.js';

export const JsonRenderer = ({ concepts, filters, priorityRange }) => {
  // Filter data based on filters and priority range
  const filteredData = React.useMemo(() => {
    const result = {};

    if (filters.concepts) {
        result.concepts = concepts.map(concept => {
            const filteredTasks = concept.tasks.filter(task => {
                const priority = task.budget?.priority ?? task.priority ?? 0;
                return priority >= priorityRange.min && priority <= priorityRange.max;
            });
            return { ...concept, tasks: filteredTasks };
        }).filter(concept => {
            const priority = concept.priority ?? 0;
            return priority >= priorityRange.min && priority <= priorityRange.max;
        });
    }

    return result;
  }, [concepts, filters, priorityRange]);

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
  React.createElement('strong', null, 'JSON Graph Data')
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