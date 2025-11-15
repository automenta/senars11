/**
 * Abstract Graph Visualizer Component
 * Supports multiple renderers with UI to switch between them
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useUiData } from '../../hooks/useWebSocket.js';
import { GenericSelectField } from '../GenericComponents.js';

// Import all renderer configurations
import { ForceGraphRenderer } from './GraphRenderers/ForceGraphRenderer.js';
import { ReactFlowRenderer } from './GraphRenderers/ReactFlowRenderer.js';
import { JsonRenderer } from './GraphRenderers/JsonRenderer.js';

// Define available renderers
const RENDERERS = Object.freeze({
  force: {
    id: 'force',
    name: 'Force-Directed',
    component: ForceGraphRenderer,
    description: 'Interactive force-directed graph visualization'
  },
  reactflow: {
    id: 'reactflow',
    name: 'ReactFlow',
    component: ReactFlowRenderer,
    description: 'ReactFlow-based graph visualization'
  },
  json: {
    id: 'json',
    name: 'JSON/Text',
    component: JsonRenderer,
    description: 'Raw JSON data representation for debugging'
  }
});

const DEFAULT_RENDERER = 'force';

const AbstractGraphVisualizer = () => {
  const [selectedRenderer, setSelectedRenderer] = useState(DEFAULT_RENDERER);
  const [filters, setFilters] = useState({
    concepts: true,
    tasks: true,      // Show all tasks regardless of type (includes beliefs, questions, goals)
    beliefs: true,    // Show belief-type tasks (ending with '.')
    questions: true,  // Show question-type tasks (ending with '?')
    goals: true       // Show goal-type tasks (ending with '!')
  });

  const [priorityRange, setPriorityRange] = useState({
    min: 0,
    max: 1
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Get data from store
  const { tasks, concepts, beliefs, goals } = useUiData();

  // Calculate node counts
  const nodeCounts = useMemo(() => ({
    concepts: concepts.length,
    tasks: tasks.length,
    beliefs: beliefs.length,
    goals: goals.length
  }), [concepts, tasks, beliefs, goals]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  // Handle priority range changes
  const handlePriorityChange = useCallback((range) => {
    setPriorityRange(range);
  }, []);

  // Get current renderer component
  const CurrentRenderer = RENDERERS[selectedRenderer]?.component || ForceGraphRenderer;

  // Prepare renderer options for select field
  const rendererOptions = Object.values(RENDERERS).map(renderer => ({
    value: renderer.id,
    label: renderer.name
  }));

  return React.createElement('div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: '#f8f9fa'
      }
    },

    // Top control bar
    React.createElement('div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          backgroundColor: '#e9ecef',
          borderBottom: '1px solid #dee2e6',
          zIndex: 50
        }
      },
      // Left side: Controls
      React.createElement('div',
        {
          style: {
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }
        },
        React.createElement('div',
          { style: { minWidth: '180px' } },
          React.createElement(GenericSelectField, {
            label: 'Renderer',
            value: selectedRenderer,
            onChange: setSelectedRenderer,
            options: rendererOptions,
            style: { width: '100%' }
          })
        )
      ),

      // Right side: Additional controls
      React.createElement('div',
        {
          style: {
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }
        },
        React.createElement('button',
          {
            onClick: () => setSidebarCollapsed(!sidebarCollapsed),
            style: {
              padding: '0.25rem 0.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }
          },
          sidebarCollapsed ? 'Expand' : 'Collapse'
        )
      )
    ),

    // Main content area with sidebar and graph
    React.createElement('div',
      {
        style: {
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        }
      },

      // Sidebar (conditionally rendered)
      !sidebarCollapsed && React.createElement('div',
        {
          style: {
            width: '250px',
            height: '100%',
            borderRight: '1px solid #dee2e6',
            backgroundColor: 'white',
            overflowY: 'auto',
            zIndex: 20
          }
        },
        React.createElement('div',
          { style: { padding: '1rem' } },
          React.createElement('h3', { style: { margin: 0 } }, 'Graph Controls')
        ),
        React.createElement('div',
          { style: { padding: '10px' } },
          React.createElement('h4', { style: { margin: '0 0 0.5rem 0' } }, 'Node Filters')
        ),
        React.createElement('div',
          { style: { padding: '0 10px 10px' } },
          Object.entries(filters).map(([type, enabled]) =>
            React.createElement('div',
              { key: type, style: { display: 'flex', alignItems: 'center', marginBottom: '0.25rem' } },
              React.createElement('input', {
                type: 'checkbox',
                id: `filter-${type}`,
                checked: enabled,
                onChange: (e) => handleFilterChange(type, e.target.checked),
                style: { marginRight: '0.5rem' }
              }),
              React.createElement('label', { htmlFor: `filter-${type}` },
                `${type.charAt(0).toUpperCase() + type.slice(1)}${type === 'concepts' ? '' : 's'}`
              )
            )
          )
        )
      ),

      // Graph view (takes remaining space)
      React.createElement('div',
        {
          style: {
            flex: 1,
            position: 'relative'
          }
        },
        React.createElement(CurrentRenderer, {
          filters,
          priorityRange
        })
      )
    )
  );
};

export default AbstractGraphVisualizer;