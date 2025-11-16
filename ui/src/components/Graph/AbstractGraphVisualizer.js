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
import { SimpleListRenderer } from './GraphRenderers/SimpleListRenderer.js';

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
  simple: {
    id: 'simple',
    name: 'Simple List',
    component: SimpleListRenderer,
    description: 'Simple list view of concepts and tasks'
  },
  json: {
    id: 'json',
    name: 'JSON/Text',
    component: JsonRenderer,
    description: 'Raw JSON data representation for debugging'
  }
});

const DEFAULT_RENDERER = 'json';
const DEFAULT_FILTERS = Object.freeze({
  concepts: true
});

// Get renderer component by ID
const getRendererComponent = (id) => RENDERERS[id]?.component || ForceGraphRenderer;

// Get renderer options for select field
const getRendererOptions = () => Object.values(RENDERERS).map(renderer => ({
  value: renderer.id,
  label: renderer.name
}));

// Create filter controls
const FilterControls = ({ filters, onFilterChange }) => (
  Object.entries(filters).map(([type, enabled]) =>
    React.createElement('div',
      { key: type, style: { display: 'flex', alignItems: 'center', marginBottom: '0.25rem' } },
      React.createElement('input', {
        type: 'checkbox',
        id: `filter-${type}`,
        checked: enabled,
        onChange: (e) => onFilterChange(type, e.target.checked),
        style: { marginRight: '0.5rem' }
      }),
      React.createElement('label', { htmlFor: `filter-${type}` },
        `${type.charAt(0).toUpperCase() + type.slice(1)}${type === 'concepts' ? '' : 's'}`
      )
    )
  )
);

const AbstractGraphVisualizer = () => {
  const [selectedRenderer, setSelectedRenderer] = useState(DEFAULT_RENDERER);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [priorityRange, setPriorityRange] = useState({ min: 0, max: 1 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Get data from store - concepts and tasks (with types: belief, question, goal)
  const { tasks, concepts } = useUiData();

  // Handle filter changes
  const handleFilterChange = useCallback((filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  }, []);

  // Get current renderer component
  const CurrentRenderer = getRendererComponent(selectedRenderer);

  // Top control bar component
  const ControlBar = React.createElement('div',
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
          options: getRendererOptions(),
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
  );

  // Sidebar component
  const Sidebar = !sidebarCollapsed && React.createElement('div',
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
      React.createElement(FilterControls, {
        filters,
        onFilterChange: handleFilterChange
      })
    )
  );

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
    ControlBar,
    React.createElement('div',
      {
        style: {
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        }
      },
      Sidebar,
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