import React, {useCallback, useMemo, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import {
  createDistributionBar,
  createMetricCard,
  createStatusBadge,
  getPerformanceMetricColor
} from '../utils/dashboardUtils.js';
import {formatPercentage} from '../utils/formatters.js';

const DashboardPanel = () => {
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'performance'

  const systemMetrics = useUiStore(state => state.systemMetrics);
  const demoMetrics = useUiStore(state => state.demoMetrics);
  const concepts = useUiStore(state => state.concepts);
  const tasks = useUiStore(state => state.tasks);
  const wsConnected = useUiStore(state => state.wsConnected);
  const demos = useUiStore(state => state.demos);
  const demoStates = useUiStore(state => state.demoStates);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    // System metrics from demo metrics
    let systemStats = {
      tasksProcessed: 0,
      conceptsActive: 0,
      cyclesCompleted: 0,
      memoryUsage: 0,
      narsOnlySolutions: 0,
      lmAssistedSolutions: 0,
      hybridSolutions: 0,
      solutionQuality: 0
    };

    if (demoMetrics && Object.keys(demoMetrics).length > 0) {
      const allMetrics = Object.values(demoMetrics).map(m => m.systemMetrics).filter(m => m);

      if (allMetrics.length > 0) {
        systemStats = {
          tasksProcessed: allMetrics.reduce((sum, m) => sum + (m.tasksProcessed || 0), 0),
          conceptsActive: allMetrics.reduce((sum, m) => sum + (m.conceptsActive || 0), 0),
          cyclesCompleted: allMetrics.reduce((sum, m) => sum + (m.cyclesCompleted || 0), 0),
          memoryUsage: allMetrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0),
          narsOnlySolutions: allMetrics.reduce((sum, m) => sum + (m.narsOnlySolutions || 0), 0),
          lmAssistedSolutions: allMetrics.reduce((sum, m) => sum + (m.lmAssistedSolutions || 0), 0),
          hybridSolutions: allMetrics.reduce((sum, m) => sum + (m.hybridSolutions || 0), 0),
          solutionQuality: allMetrics.reduce((sum, m) => sum + (m.solutionQuality || 0), 0) / allMetrics.length
        };
      }
    }

    // Calculate demo stats
    const runningDemos = Object.keys(demoStates).filter(id => demoStates[id]?.state === 'running').length;
    const completedDemos = Object.keys(demoStates).filter(id => demoStates[id]?.state === 'completed').length;
    const errorDemos = Object.keys(demoStates).filter(id => demoStates[id]?.state === 'error').length;

    // Calculate task stats
    const beliefs = tasks.filter(t => t.type === 'belief').length;
    const questions = tasks.filter(t => t.type === 'question').length;
    const goals = tasks.filter(t => t.type === 'goal').length;

    // Calculate performance metrics
    const totalSolutions = systemStats.narsOnlySolutions + systemStats.lmAssistedSolutions + systemStats.hybridSolutions;
    const narsOnlyPercentage = totalSolutions > 0 ? (systemStats.narsOnlySolutions / totalSolutions) * 100 : 0;
    const lmAssistedPercentage = totalSolutions > 0 ? (systemStats.lmAssistedSolutions / totalSolutions) * 100 : 0;
    const hybridPercentage = totalSolutions > 0 ? (systemStats.hybridSolutions / totalSolutions) * 100 : 0;

    return {
      systemStats,
      runningDemos,
      completedDemos,
      errorDemos,
      beliefs,
      questions,
      goals,
      totalConcepts: concepts.length,
      totalTasks: tasks.length,
      wsConnected,
      narsOnlyPercentage,
      lmAssistedPercentage,
      hybridPercentage
    };
  }, [demoMetrics, concepts, tasks, wsConnected, demos, demoStates]);

  // Render metric card using utility
  const renderMetricCard = useCallback((title, value, description, color = '#007bff') =>
    createMetricCard(React, {title, value, description, color}), []);

  const renderStatusIndicator = useCallback((status, label) => {
    let statusType;
    if (status === true || status === 'Connected') {
      statusType = 'success';
    } else if (status === false || status === 'Disconnected' || status === 'error') {
      statusType = 'error';
    } else {
      statusType = 'info';
    }

    return createStatusBadge(React, {status: statusType, label});
  }, []);

  // View mode selector
  const renderViewSelector = useCallback(() => React.createElement('div', {
    style: {
      display: 'flex',
      marginBottom: '1rem',
      padding: '0.5rem',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px'
    }
  },
  React.createElement('button', {
    onClick: () => setViewMode('overview'),
    style: {
      padding: '0.5rem 1rem',
      backgroundColor: viewMode === 'overview' ? '#007bff' : '#e9ecef',
      color: viewMode === 'overview' ? 'white' : '#495057',
      border: '1px solid #ddd',
      borderRadius: '4px 0 0 4px',
      cursor: 'pointer',
      fontWeight: viewMode === 'overview' ? 'bold' : 'normal'
    }
  }, 'System Overview'),
  React.createElement('button', {
    onClick: () => setViewMode('performance'),
    style: {
      padding: '0.5rem 1rem',
      backgroundColor: viewMode === 'performance' ? '#007bff' : '#e9ecef',
      color: viewMode === 'performance' ? 'white' : '#495057',
      border: '1px solid #ddd',
      borderRadius: '0 4px 4px 0',
      cursor: 'pointer',
      fontWeight: viewMode === 'performance' ? 'bold' : 'normal'
    }
  }, 'Performance Insights')
  ), [viewMode]);

  // Create metric cards (overview view)
  const metricCards = useMemo(() => React.createElement('div', {
    style: {display: 'flex', flexWrap: 'wrap', marginBottom: '1rem'}
  },
  renderMetricCard('System Status', metrics.wsConnected ? 'Operational' : 'Offline', 'WebSocket Connection', metrics.wsConnected ? '#28a745' : '#dc3545'),
  renderMetricCard('Active Concepts', metrics.totalConcepts, 'Current concept count'),
  renderMetricCard('Active Tasks', metrics.totalTasks, 'Total tasks in system'),
  renderMetricCard('Running Demos', metrics.runningDemos, 'Currently executing demos')
  ), [metrics, renderMetricCard]);

  // Task distribution chart using utility
  const taskDistribution = useMemo(() => React.createElement('div', {
    style: {marginBottom: '1rem'}
  },
  React.createElement('h4', {style: {margin: '0 0 0.5rem 0', fontSize: '1rem'}}, 'Task Distribution'),
  createDistributionBar(React, {
    segments: [
      {
        percentage: (metrics.beliefs / Math.max(metrics.totalTasks, 1)) * 100,
        color: '#28a745',
        label: metrics.beliefs > 0 ? `Beliefs: ${metrics.beliefs}` : null
      },
      {
        percentage: (metrics.questions / Math.max(metrics.totalTasks, 1)) * 100,
        color: '#007bff',
        label: metrics.questions > 0 ? `Questions: ${metrics.questions}` : null
      },
      {
        percentage: (metrics.goals / Math.max(metrics.totalTasks, 1)) * 100,
        color: '#ffc107',
        label: metrics.goals > 0 ? `Goals: ${metrics.goals}` : null
      }
    ]
  })
  ), [metrics]);

  // Demo status summary
  const demoSummary = useMemo(() => React.createElement('div', {
    style: {marginBottom: '1rem'}
  },
  React.createElement('h4', {style: {margin: '0 0 0.5rem 0', fontSize: '1rem'}}, 'Demo Status'),
  React.createElement('div', {
    style: {display: 'flex', alignItems: 'center', gap: '1rem'}
  },
  renderStatusIndicator(metrics.runningDemos > 0, `${metrics.runningDemos} Running`),
  renderStatusIndicator(metrics.completedDemos > 0, `${metrics.completedDemos} Completed`),
  renderStatusIndicator(metrics.errorDemos > 0, `${metrics.errorDemos} Errors`)
  )
  ), [metrics, renderStatusIndicator]);

  // System stats
  const systemStats = useMemo(() => React.createElement('div', {
    style: {marginBottom: '1rem'}
  },
  React.createElement('h4', {style: {margin: '0 0 0.5rem 0', fontSize: '1rem'}}, 'System Stats'),
  React.createElement('div', {
    style: {display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}
  },
  renderMetricCard('Tasks Processed', metrics.systemStats.tasksProcessed, 'Total tasks processed'),
  renderMetricCard('Cycles Completed', metrics.systemStats.cyclesCompleted, 'Reasoning cycles'),
  renderMetricCard('Memory Usage', metrics.systemStats.memoryUsage.toFixed(2), 'System memory units')
  )
  ), [metrics, renderMetricCard]);

  // Performance comparison view
  const performanceView = useMemo(() => React.createElement('div', null,
    React.createElement('h4', {
      style: {
        margin: '0 0 1rem 0',
        fontSize: '1rem',
        color: '#007bff'
      }
    }, 'Intelligence Performance Insights'),

    // Comparison chart
    React.createElement('div', {
      style: {
        marginBottom: '1rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px'
      }
    },
    React.createElement('h5', {
      style: {
        margin: '0 0 0.5rem 0',
        fontSize: '0.9rem'
      }
    }, 'Solution Types Distribution'),
    createDistributionBar(React, {
      style: {marginBottom: '0.5rem'},
      segments: [
        {
          percentage: metrics.narsOnlyPercentage,
          color: getPerformanceMetricColor('nars'),
          label: metrics.systemStats.narsOnlySolutions > 0 ?
            `NARS Only: ${formatPercentage(metrics.narsOnlyPercentage)}` : null
        },
        {
          percentage: metrics.lmAssistedPercentage,
          color: getPerformanceMetricColor('lm'),
          label: metrics.systemStats.lmAssistedSolutions > 0 ?
            `LM Assisted: ${formatPercentage(metrics.lmAssistedPercentage)}` : null
        },
        {
          percentage: metrics.hybridPercentage,
          color: getPerformanceMetricColor('hybrid'),
          label: metrics.systemStats.hybridSolutions > 0 ?
            `Hybrid: ${formatPercentage(metrics.hybridPercentage)}` : null
        }
      ]
    }),
    React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        fontSize: '0.9rem'
      }
    },
    React.createElement('div', {
      style: {
        padding: '0.5rem',
        border: `1px solid ${getPerformanceMetricColor('nars')}`,
        borderRadius: '4px'
      }
    },
    React.createElement('div', {
      style: {
        fontWeight: 'bold',
        color: getPerformanceMetricColor('nars')
      }
    }, 'NARS Only Solutions'),
    React.createElement('div', null, `Count: ${metrics.systemStats.narsOnlySolutions}`)
    ),
    React.createElement('div', {
      style: {
        padding: '0.5rem',
        border: `1px solid ${getPerformanceMetricColor('lm')}`,
        borderRadius: '4px'
      }
    },
    React.createElement('div', {
      style: {
        fontWeight: 'bold',
        color: getPerformanceMetricColor('lm')
      }
    }, 'LM Assisted Solutions'),
    React.createElement('div', null, `Count: ${metrics.systemStats.lmAssistedSolutions}`)
    ),
    React.createElement('div', {
      style: {
        padding: '0.5rem',
        border: `1px solid ${getPerformanceMetricColor('hybrid')}`,
        borderRadius: '4px'
      }
    },
    React.createElement('div', {
      style: {
        fontWeight: 'bold',
        color: getPerformanceMetricColor('hybrid')
      }
    }, 'Hybrid Solutions'),
    React.createElement('div', null, `Count: ${metrics.systemStats.hybridSolutions}`)
    )
    )
    ),

    // Performance metrics
    React.createElement('div', {style: {marginBottom: '1rem'}},
      React.createElement('h5', {style: {margin: '0 0 0.5rem 0', fontSize: '0.9rem'}}, 'Performance Metrics'),
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }
      },
      renderMetricCard('NARS Efficiency', formatPercentage(metrics.narsOnlyPercentage), 'Pure NARS reasoning effectiveness'),
      renderMetricCard('LM Impact', formatPercentage(metrics.lmAssistedPercentage), 'LM assistance utilization'),
      renderMetricCard('Hybrid Value', formatPercentage(metrics.hybridPercentage), 'Combined intelligence effectiveness'),
      renderMetricCard('Solution Quality', `${(metrics.systemStats.solutionQuality || 0).toFixed(2)}`, 'Average solution quality score', '#17a2b8')
      )
    )
  ), [metrics, renderMetricCard]);

  // Build items based on view mode
  const items = useMemo(() => {
    const baseItems = [
      {type: 'viewSelector', content: renderViewSelector()}
    ];

    if (viewMode === 'overview') {
      baseItems.push(
        {type: 'header', content: 'System Dashboard'},
        {type: 'metrics', content: metricCards},
        {type: 'taskDistribution', content: taskDistribution},
        {type: 'demoSummary', content: demoSummary},
        {type: 'systemStats', content: systemStats}
      );
    } else { // performance view
      baseItems.push(
        {type: 'header', content: 'Performance Insights'},
        {type: 'performance', content: performanceView}
      );
    }

    return baseItems;
  }, [viewMode, renderViewSelector, metricCards, taskDistribution, demoSummary, systemStats, performanceView]);

  const renderDashboardItem = useCallback((item) => {
    switch (item.type) {
    case 'viewSelector':
      return item.content;
    case 'header':
      return React.createElement('div', {
        style: {
          fontWeight: 'bold',
          fontSize: '1.2rem',
          margin: '0 0 1rem 0',
          padding: '0.5rem 0',
          borderBottom: '2px solid #007bff',
          color: '#333'
        }
      }, item.content);
    default:
      return item.content;
    }
  }, []);

  return React.createElement(GenericPanel, {
    title: 'Dashboard',
    maxHeight: 'calc(100% - 2rem)',
    items,
    renderItem: renderDashboardItem,
    emptyMessage: viewMode === 'performance'
      ? 'Performance metrics will be populated as the hybrid system processes inputs and generates solutions.'
      : 'System dashboard will display metrics once the reasoning engine is active.'
  });
};

export default DashboardPanel;