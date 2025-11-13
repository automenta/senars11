/**
 * CognitiveIDE Component
 * Main entry point for the SeNARS Web-Based Cognitive IDE
 * Implements the design philosophy and component hierarchy from PLAN.repl.md
 * 
 * Features:
 * - Tabbed interface with multiple views (Dashboard, Input, Controls, Debugger, Visualization, etc.)
 * - Real-time system metrics display
 * - WebSocket connection status monitoring
 * - Breakpoint and debugging controls
 * - Task and concept monitoring
 * - Consistent theming and styling
 */
import React, {memo, useState, useCallback} from 'react';
import useUiStore from '../stores/uiStore.js';
import {themeUtils} from '../utils/themeUtils.js';
import ReasonerControls from './ReasonerControls.js';
import VisualizationPanel from './VisualizationPanel.js';
import TraceInspector from './TraceInspector.js';
import InputInterfacePanel from './InputInterfacePanel.js';
import SystemStatusPanel from './SystemStatusPanel.js';
import TaskPanel from './TaskPanel.js';
import ConceptPanel from './ConceptPanel.js';

const CognitiveIDE = memo(() => {
  const wsService = useUiStore(state => state.wsService);
  const wsConnected = useUiStore(state => state.wsConnected);
  const systemMetrics = useUiStore(state => state.systemMetrics);
  const tasks = useUiStore(state => state.tasks);
  const concepts = useUiStore(state => state.concepts);
  const [activeView, setActiveView] = useState('dashboard');
  const [breakpoints, setBreakpoints] = useState([]);
  const [isDebugging, setIsDebugging] = useState(false);

  // Enhanced view configuration with debug features
  const views = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      component: React.createElement('div',
        {key: 'dashboard-view', style: {padding: '1rem'}},
        React.createElement('h2', {style: {marginBottom: '1rem', color: themeUtils.get('COLORS.PRIMARY')}}, 'Cognitive IDE Dashboard'),
        React.createElement('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }
        },
        React.createElement('div', {
          style: {
            padding: '1rem',
            backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
          }
        },
        React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: '0.5rem'}}, 'Active Tasks'),
        React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.LG'), color: themeUtils.get('COLORS.PRIMARY')}}, tasks.length)
        ),
        React.createElement('div', {
          style: {
            padding: '1rem',
            backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
          }
        },
        React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: '0.5rem'}}, 'Active Concepts'),
        React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.LG'), color: themeUtils.get('COLORS.PRIMARY')}}, Object.keys(concepts).length)
        ),
        React.createElement('div', {
          style: {
            padding: '1rem',
            backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
          }
        },
        React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: '0.5rem'}}, 'Connection Status'),
        React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.LG'), color: wsConnected ? '#28a745' : '#dc3545'}}, wsConnected ? 'Connected' : 'Disconnected')
        )
        ),
        React.createElement('div', {style: {marginBottom: '1rem'}},
          React.createElement(ReasonerControls, {key: 'quick-controls'})
        ),
        React.createElement('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }
        },
        React.createElement('div',
          {style: {backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'), padding: '1rem', borderRadius: themeUtils.get('BORDERS.RADIUS.SM')}},
          React.createElement('h3', {style: {margin: '0 0 0.5rem 0', color: themeUtils.get('COLORS.PRIMARY')}}, 'Recent Tasks'),
          React.createElement('div',
            {style: {maxHeight: '150px', overflowY: 'auto'}},
            tasks.slice(0, 5).map((task, index) =>
              React.createElement('div',
                {
                  key: task.id || index,
                  style: {
                    padding: '0.25rem',
                    margin: '0.25rem 0',
                    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                    borderRadius: themeUtils.get('BORDERS.RADIUS.XS')
                  }
                },
                React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.SM')}}, task.content || 'No content'),
                React.createElement('div', {
                  style: {
                    fontSize: themeUtils.get('FONTS.SIZE.XS'),
                    color: themeUtils.get('TEXT.SECONDARY')
                  }
                }, `Priority: ${(task.priority || 0).toFixed(2)}`)
              )
            )
          )
        ),
        React.createElement('div',
          {style: {backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'), padding: '1rem', borderRadius: themeUtils.get('BORDERS.RADIUS.SM')}},
          React.createElement('h3', {style: {margin: '0 0 0.5rem 0', color: themeUtils.get('COLORS.PRIMARY')}}, 'System Status'),
          React.createElement('pre',
            {style: {fontSize: themeUtils.get('FONTS.SIZE.XS'), margin: 0}},
            systemMetrics ? JSON.stringify(systemMetrics, null, 2) : 'No metrics available'
          )
        )
        )
      )
    },
    {
      id: 'input',
      label: 'Input Panel',
      icon: '⌨️',
      component: React.createElement(InputInterfacePanel, {key: 'input-panel'})
    },
    {
      id: 'controls',
      label: 'Reasoner Controls',
      icon: '🎛️',
      component: React.createElement('div',
        {key: 'controls-panel', style: {padding: '1rem'}},
        React.createElement('div', {style: {marginBottom: '1rem'}},
          React.createElement(ReasonerControls, {key: 'reasoner-controls'})
        ),
        React.createElement('div', {style: {padding: '0.5rem', backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'), borderRadius: themeUtils.get('BORDERS.RADIUS.SM')}},
          React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: '0.5rem'}}, 'Control Commands'),
          React.createElement('ul', {style: {margin: 0, paddingLeft: '1rem', fontSize: themeUtils.get('FONTS.SIZE.SM')}},
            React.createElement('li', null, '/run or /start - Start continuous reasoning'),
            React.createElement('li', null, '/stop or /st - Stop continuous reasoning'),
            React.createElement('li', null, '/next or /n - Execute single reasoning cycle'),
            React.createElement('li', null, '/reset - Reset the reasoning engine'),
            React.createElement('li', null, '/save - Save current state'),
            React.createElement('li', null, '/load - Load saved state')
          )
        )
      )
    },
    {
      id: 'debug',
      label: 'Debugger',
      icon: '🐞',
      component: React.createElement('div',
        {key: 'debug-panel', style: {padding: '1rem'}},
        React.createElement('h2', {style: {marginBottom: '1rem', color: themeUtils.get('COLORS.PRIMARY')}}, 'Debugger'),
        React.createElement('div', {style: {marginBottom: '1rem', display: 'flex', gap: '1rem'}},
          React.createElement('button',
            {
              onClick: () => setIsDebugging(!isDebugging),
              style: {
                padding: '0.5rem 1rem',
                backgroundColor: isDebugging ? themeUtils.get('COLORS.DANGER') : themeUtils.get('COLORS.SUCCESS'),
                color: 'white',
                border: 'none',
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                cursor: 'pointer'
              }
            },
            isDebugging ? 'Disable Debug' : 'Enable Debug'
          ),
          React.createElement('button',
            {
              onClick: () => {
                // In a real implementation, this would send a message to pause execution
                useUiStore.getState().addNotification({
                  type: 'info',
                  title: 'Breakpoint',
                  message: 'Execution paused at breakpoint'
                });
              },
              disabled: !isDebugging,
              style: {
                padding: '0.5rem 1rem',
                backgroundColor: isDebugging ? themeUtils.get('COLORS.WARNING') : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                cursor: isDebugging ? 'pointer' : 'not-allowed'
              }
            },
            'Set Breakpoint'
          )
        ),
        React.createElement('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }
        },
        React.createElement('div',
          {style: {backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'), padding: '1rem', borderRadius: themeUtils.get('BORDERS.RADIUS.SM')}},
          React.createElement('h3', {style: {margin: '0 0 0.5rem 0', color: themeUtils.get('COLORS.PRIMARY')}}, 'Active Breakpoints'),
          React.createElement('div', null,
            breakpoints.length > 0
              ? breakpoints.map((bp, index) =>
                React.createElement('div',
                  {
                    key: index,
                    style: {
                      padding: '0.5rem',
                      margin: '0.25rem 0',
                      border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                      borderRadius: themeUtils.get('BORDERS.RADIUS.XS'),
                      backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY')
                    }
                  },
                  `Breakpoint ${index + 1}: ${bp.condition || 'N/A'}`,
                  React.createElement('div', {
                    style: {
                      fontSize: themeUtils.get('FONTS.SIZE.XS'),
                      color: themeUtils.get('TEXT.SECONDARY'),
                      marginTop: '0.25rem'
                    }
                  }, `Created: ${new Date(bp.timestamp).toLocaleTimeString()}`)
                )
              )
              : React.createElement('div',
                {style: {fontStyle: 'italic', color: themeUtils.get('TEXT.SECONDARY'), padding: '0.5rem'}},
                'No breakpoints set'
              )
          )
        ),
        React.createElement('div',
          {style: {backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'), padding: '1rem', borderRadius: themeUtils.get('BORDERS.RADIUS.SM')}},
          React.createElement('h3', {style: {margin: '0 0 0.5rem 0', color: themeUtils.get('COLORS.PRIMARY')}}, 'Debug Info'),
          React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.SM')}},
            React.createElement('div', null, `Debugging: ${isDebugging ? 'Enabled' : 'Disabled'}`),
            React.createElement('div', null, `Active Breakpoints: ${breakpoints.length}`),
            React.createElement('div', null, `Connection: ${wsConnected ? 'Active' : 'Inactive'}`)
          )
        )
        )
      )
    },
    {
      id: 'visualization',
      label: 'Visualization',
      icon: '📊',
      component: React.createElement(VisualizationPanel, {key: 'visualization-panel'})
    },
    {
      id: 'trace',
      label: 'Trace Inspector',
      icon: '🔍',
      component: React.createElement(TraceInspector, {key: 'trace-inspector'})
    },
    {
      id: 'status',
      label: 'System Status',
      icon: '📈',
      component: React.createElement(SystemStatusPanel, {key: 'system-status'})
    }
  ];

  /**
     * Renders connection status indicator
     * @returns {JSX.Element} Connection status indicator element
     */
  const connectionStatus = React.createElement('div',
    {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.5rem',
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
        backgroundColor: wsConnected ? '#d4edda' : '#f8d7da',
        color: wsConnected ? '#155724' : '#721c24',
        border: `1px solid ${wsConnected ? '#c3e6cb' : '#f5c6cb'}`,
        fontSize: themeUtils.get('FONTS.SIZE.SM')
      }
    },
    React.createElement('div',
      {
        style: {
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: wsConnected ? '#28a745' : '#dc3545',
          marginRight: '0.5rem'
        }
      }
    ),
    wsConnected ? 'Connected' : 'Disconnected'
  );

  /**
     * Renders system metrics summary
     * @returns {JSX.Element} Metrics summary element
     */
  const metricsSummary = React.createElement('div',
    {
      style: {
        display: 'flex',
        gap: '1rem',
        padding: '0.5rem',
        backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
        fontSize: themeUtils.get('FONTS.SIZE.SM')
      }
    },
    systemMetrics && React.createElement('div', null,
      React.createElement('strong', null, 'Cycles:'),
      ` ${systemMetrics.cycleCount || 0}`
    ),
    systemMetrics && React.createElement('div', null,
      React.createElement('strong', null, 'Tasks:'),
      ` ${systemMetrics.activeTasks || 0}`
    ),
    systemMetrics && React.createElement('div', null,
      React.createElement('strong', null, 'Memory:'),
      ` ${(systemMetrics.memory || 0).toFixed(2)} MB`
    )
  );

  /**
     * Renders navigation tabs for switching between views
     * @returns {JSX.Element} Navigation tabs element
     */
  const renderViewTabs = () => {
    return React.createElement('div',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          borderBottom: `2px solid ${themeUtils.get('BORDERS.COLOR')}`,
          marginBottom: '1rem'
        }
      },
      ...views.map(view =>
        React.createElement('button',
          {
            key: view.id,
            onClick: () => setActiveView(view.id),
            style: {
              padding: '0.5rem 1rem',
              margin: '0 0.25rem 0.25rem 0',
              backgroundColor: activeView === view.id ? themeUtils.get('COLORS.PRIMARY') : themeUtils.get('BACKGROUNDS.SECONDARY'),
              color: activeView === view.id ? 'white' : themeUtils.get('TEXT.PRIMARY'),
              border: '1px solid ' + themeUtils.get('BORDERS.COLOR'),
              borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
              cursor: 'pointer',
              fontWeight: activeView === view.id ? themeUtils.get('FONTS.WEIGHT.BOLD') : 'normal',
              display: 'flex',
              alignItems: 'center'
            }
          },
          React.createElement('span', {style: {marginRight: '0.5rem'}}, view.icon),
          view.label
        )
      )
    );
  };

  // Get active view content
  const activeViewContent = views.find(view => view.id === activeView)?.component || views[0].component;

  /**
     * Adds a new breakpoint to the debugging system
     */
  const addBreakpoint = useCallback(() => {
    if (!wsService || !wsConnected) {
      useUiStore.getState().addNotification({
        type: 'error',
        title: 'Breakpoint Error',
        message: 'Cannot set breakpoint - not connected to engine'
      });
      return;
    }

    const newBreakpoint = {
      id: `bp_${Date.now()}`,
      condition: 'Task priority exceeds threshold',
      timestamp: Date.now(),
      enabled: true
    };
        
    setBreakpoints(prev => [...prev, newBreakpoint]);
    useUiStore.getState().addNotification({
      type: 'success',
      title: 'Breakpoint Added',
      message: 'New breakpoint has been added'
    });
  }, [wsService, wsConnected]);

  /**
     * Clears all breakpoints from the system
     */
  const clearBreakpoints = useCallback(() => {
    setBreakpoints([]);
    useUiStore.getState().addNotification({
      type: 'info',
      title: 'Breakpoints Cleared',
      message: 'All breakpoints have been removed'
    });
  }, []);

  return React.createElement('div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1rem',
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
        color: themeUtils.get('TEXT.PRIMARY')
      }
    },
    // Header section
    React.createElement('div',
      {
        style: {
          marginBottom: '1rem',
          paddingBottom: '1rem',
          borderBottom: `2px solid ${themeUtils.get('BORDERS.COLOR')}`
        }
      },
      React.createElement('h1',
        {
          style: {
            margin: '0 0 0.5rem 0',
            fontSize: themeUtils.get('FONTS.SIZE.XL'),
            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
            color: themeUtils.get('COLORS.PRIMARY')
          }
        },
        'SeNARS Cognitive IDE'
      ),
      React.createElement('div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }
        },
        React.createElement('div', null,
          connectionStatus,
          React.createElement('button',
            {
              onClick: addBreakpoint,
              style: {
                marginLeft: '1rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: themeUtils.get('COLORS.PRIMARY'),
                color: 'white',
                border: 'none',
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                cursor: 'pointer',
                fontSize: themeUtils.get('FONTS.SIZE.SM')
              }
            },
            '+ Breakpoint'
          ),
          React.createElement('button',
            {
              onClick: clearBreakpoints,
              style: {
                marginLeft: '0.5rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: themeUtils.get('COLORS.DANGER'),
                color: 'white',
                border: 'none',
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                cursor: 'pointer',
                fontSize: themeUtils.get('FONTS.SIZE.SM')
              }
            },
            'Clear All'
          )
        ),
        metricsSummary
      )
    ),
    // Navigation tabs
    renderViewTabs(),
    // Active view content
    React.createElement('div',
      {
        style: {
          flex: 1,
          overflow: 'auto',
          border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
          borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
          backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY')
        }
      },
      activeViewContent
    )
  );
});

export default CognitiveIDE;