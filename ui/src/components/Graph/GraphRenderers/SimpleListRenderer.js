/**
 * Simple List Renderer
 * Lists all concepts and tasks in a simple format
 */
import React from 'react';
import { useUiData } from '../../../hooks/useWebSocket.js';

export const SimpleListRenderer = ({ filters, priorityRange }) => {
  const { tasks, concepts } = useUiData();

  // Filter concepts based on priority
  const filteredConcepts = concepts.filter(concept => 
    concept.priority >= priorityRange.min && concept.priority <= priorityRange.max
  );

  // Filter tasks based on priority (using budget.priority if available, otherwise priority)
  const filteredTasks = tasks.filter(task =>
    (task.budget?.priority || task.priority || 0) >= priorityRange.min &&
    (task.budget?.priority || task.priority || 0) <= priorityRange.max
  );

  return React.createElement('div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem',
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize: '14px'
      }
    },

    // Concepts section
    React.createElement('div',
      {
        style: {
          marginBottom: '2rem'
        }
      },
      React.createElement('h3', 
        { 
          style: { 
            margin: '0 0 1rem 0', 
            color: '#007bff',
            borderBottom: '2px solid #007bff',
            paddingBottom: '0.5rem'
          } 
        }, 
        `Concepts (${filteredConcepts.length})`
      ),
      filteredConcepts.length > 0 ? 
        React.createElement('div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.5rem'
            }
          },
          ...filteredConcepts.map((concept, index) => 
            React.createElement('div',
              {
                key: `concept-${index}`,
                style: {
                  padding: '0.5rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  backgroundColor: '#f8f9fa'
                }
              },
              React.createElement('div', 
                { style: { fontWeight: 'bold', marginBottom: '0.25rem' } }, 
                concept.term
              ),
              React.createElement('div', 
                { style: { fontSize: '0.8em', color: '#6c757d' } }, 
                `Priority: ${concept.priority.toFixed(2)}`
              )
            )
          )
        ) :
        React.createElement('div', 
          { style: { fontStyle: 'italic', color: '#6c757d' } }, 
          'No concepts to display'
        )
    ),

    // Tasks section
    React.createElement('div',
      {
        style: {}
      },
      React.createElement('h3', 
        { 
          style: { 
            margin: '0 0 1rem 0', 
            color: '#28a745',
            borderBottom: '2px solid #28a745',
            paddingBottom: '0.5rem'
          } 
        }, 
        `Tasks (${filteredTasks.length})`
      ),
      filteredTasks.length > 0 ? 
        React.createElement('div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }
          },
          ...filteredTasks.map((task, index) => 
            React.createElement('div',
              {
                key: `task-${task.id || index}`,
                style: {
                  padding: '0.75rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  backgroundColor: '#f8f9fa'
                }
              },
              React.createElement('div', 
                { style: { fontWeight: 'bold', marginBottom: '0.25rem' } }, 
                task.term || task.content || task.id
              ),
              React.createElement('div', 
                { style: { fontSize: '0.8em', color: '#6c757d', marginBottom: '0.25rem' } }, 
                `Type: ${task.type || 'unknown'}`
              ),
              React.createElement('div', 
                { style: { fontSize: '0.8em', color: '#495057' } }, 
                `Priority: ${(task.budget?.priority || task.priority || 0).toFixed(2)}`
              ),
              task.truth && React.createElement('div', 
                { style: { fontSize: '0.8em', color: '#495057', marginTop: '0.25rem' } }, 
                `Truth: Freq=${task.truth.frequency?.toFixed(2) || 'N/A'}, Conf=${task.truth.confidence?.toFixed(2) || 'N/A'}, Des=${task.truth.desire?.toFixed(2) || 'N/A'}`
              )
            )
          )
        ) :
        React.createElement('div', 
          { style: { fontStyle: 'italic', color: '#6c757d' } }, 
          'No tasks to display'
        )
    )
  );
};