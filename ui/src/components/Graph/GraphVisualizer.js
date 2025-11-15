/**
 * Main Graph Visualizer Component
 * Integrates all graph visualization components into a unified interface
 */
import React, { useState, useCallback } from 'react';
import GraphView from './GraphVisualizer/GraphView.js';
import GraphSidebar from './GraphVisualizer/GraphSidebar.js';
import SystemControls from './GraphVisualizer/SystemControls.js';
import NarStatusDisplay from './GraphVisualizer/NarStatusDisplay.js';
import NodeTypeFilter from './GraphFilters/NodeTypeFilter.js';
import PriorityFilter from './GraphFilters/PriorityFilter.js';
import useUiStore from '../../stores/uiStore.js';

const GraphVisualizer = () => {
  const [filters, setFilters] = useState({
    concepts: true,
    tasks: true,
    beliefs: true,
    goals: true,
    questions: true
  });

  const [priorityRange, setPriorityRange] = useState({
    min: 0,
    max: 1
  });

  const [layoutType, setLayoutType] = useState('force');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Get data from store to calculate node counts
  const tasks = useUiStore(state => state.tasks);
  const concepts = useUiStore(state => state.concepts);
  const beliefs = useUiStore(state => state.beliefs);
  const goals = useUiStore(state => state.goals);

  // Calculate node counts
  const nodeCounts = {
    concepts: concepts.length,
    tasks: tasks.length,
    beliefs: beliefs.length,
    goals: goals.length
  };

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

  // Handle layout changes
  const handleLayoutChange = useCallback((layout) => {
    setLayoutType(layout);
  }, []);

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
        React.createElement(SystemControls),
        React.createElement(NarStatusDisplay)
      ),

      // Right side: Layout selector and collapse button
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
        React.createElement(GraphSidebar,
          {
            nodeCounts,
            onFilterChange: handleFilterChange,
            onLayoutChange: handleLayoutChange,
            filters,
            statistics: {} // Will be populated in future enhancements
          }
        ),
        React.createElement('div',
          { style: { padding: '10px' } },
          React.createElement(NodeTypeFilter, {
            filters,
            onFilterChange: handleFilterChange
          })
        ),
        React.createElement('div',
          { style: { padding: '10px' } },
          React.createElement(PriorityFilter, {
            priorityRange,
            onPriorityChange: handlePriorityChange
          })
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
        React.createElement(GraphView)
      )
    )
  );
};

export default GraphVisualizer;