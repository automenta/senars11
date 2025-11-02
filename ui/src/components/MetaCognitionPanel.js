import React, { useState, useCallback, useMemo } from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

const MetaCognitionPanel = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'analysis', 'corrections', 'queries'
  const [metaQuery, setMetaQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const nar = useUiStore(state => state.nar);
  const reasoningState = useUiStore(state => state.reasoningState);
  const metaCognitiveResults = useUiStore(state => state.metaCognitiveResults);
  
  // Perform meta-cognitive analysis
  const performMetaAnalysis = useCallback(async () => {
    if (nar && typeof nar.performMetaCognitiveReasoning === 'function') {
      try {
        const result = await nar.performMetaCognitiveReasoning();
        useUiStore.getState().addNotification({
          type: 'info',
          title: 'Meta-Cognitive Analysis Complete',
          message: `Found ${result?.suggestions?.length || 0} insights`
        });
      } catch (error) {
        useUiStore.getState().addNotification({
          type: 'error',
          title: 'Meta-Cognitive Analysis Failed',
          message: error.message
        });
      }
    }
  }, [nar]);

  // Perform self-correction
  const performSelfCorrection = useCallback(async () => {
    if (nar && typeof nar.performSelfCorrection === 'function') {
      try {
        const result = await nar.performSelfCorrection();
        useUiStore.getState().addNotification({
          type: 'info',
          title: 'Self-Correction Complete',
          message: `Applied ${result?.corrections?.length || 0} corrections`
        });
      } catch (error) {
        useUiStore.getState().addNotification({
          type: 'error',
          title: 'Self-Correction Failed',
          message: error.message
        });
      }
    }
  }, [nar]);

  // Query system state
  const querySystemState = useCallback(async () => {
    if (!metaQuery.trim() || !nar || typeof nar.querySystemState !== 'function') return;
    
    try {
      const result = await nar.querySystemState(metaQuery);
      useUiStore.getState().addNotification({
        type: 'info',
        title: 'System Query Complete',
        message: 'Query results available'
      });
    } catch (error) {
      useUiStore.getState().addNotification({
        type: 'error',
        title: 'System Query Failed',
        message: error.message
      });
    }
  }, [metaQuery, nar]);

  // Render overview tab
  const renderOverviewTab = useCallback(() => {
    const state = reasoningState || {};
    
    return React.createElement('div', { style: { padding: '1rem' } },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' } },
        React.createElement('div', { style: { padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6' } },
          React.createElement('div', { style: { fontSize: '2rem', marginBottom: '0.5rem', color: '#007bff' } }, '🔄'),
          React.createElement('div', { style: { fontWeight: 'bold', fontSize: '1.2rem' } }, state.isRunning ? 'Running' : 'Stopped'),
          React.createElement('div', { style: { fontSize: '0.8rem', color: '#666' } }, 'Status')
        ),
        React.createElement('div', { style: { padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6' } },
          React.createElement('div', { style: { fontSize: '2rem', marginBottom: '0.5rem', color: '#28a745' } }, '⚙️'),
          React.createElement('div', { style: { fontWeight: 'bold', fontSize: '1.2rem' } }, state.cycleCount || 0),
          React.createElement('div', { style: { fontSize: '0.8rem', color: '#666' } }, 'Cycles')
        ),
        React.createElement('div', { style: { padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6' } },
          React.createElement('div', { style: { fontSize: '2rem', marginBottom: '0.5rem', color: '#17a2b8' } }, '🧠'),
          React.createElement('div', { style: { fontWeight: 'bold', fontSize: '1.2rem' } }, (state.taskCount?.totalTasks) || 0),
          React.createElement('div', { style: { fontSize: '0.8rem', color: '#666' } }, 'Tasks')
        ),
        React.createElement('div', { style: { padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6' } },
          React.createElement('div', { style: { fontSize: '2rem', marginBottom: '0.5rem', color: '#ffc107' } }, '📊'),
          React.createElement('div', { style: { fontWeight: 'bold', fontSize: '1.2rem' } }, state.traceLength || 0),
          React.createElement('div', { style: { fontSize: '0.8rem', color: '#666' } }, 'Trace Events')
        )
      ),
      
      React.createElement('div', { style: { marginBottom: '1rem' } },
        React.createElement('h4', { style: { margin: '0 0 0.5rem', color: '#333' } }, 'Task Distribution'),
        React.createElement('div', { style: { display: 'flex', gap: '0.5rem' } },
          React.createElement('div', { style: { flex: 1, padding: '0.5rem', backgroundColor: '#e7f3ff', border: '1px solid #b8daff', borderRadius: '4px', textAlign: 'center' } },
            React.createElement('div', { style: { fontWeight: 'bold', fontSize: '1.1rem', color: '#004085' } }, state.taskCount?.beliefs || 0),
            React.createElement('div', { style: { fontSize: '0.8rem' } }, 'Beliefs')
          ),
          React.createElement('div', { style: { flex: 1, padding: '0.5rem', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px', textAlign: 'center' } },
            React.createElement('div', { style: { fontWeight: 'bold', fontSize: '1.1rem', color: '#856404' } }, state.taskCount?.goals || 0),
            React.createElement('div', { style: { fontSize: '0.8rem' } }, 'Goals')
          ),
          React.createElement('div', { style: { flex: 1, padding: '0.5rem', backgroundColor: '#e8f5e8', border: '1px solid #c3e6c3', borderRadius: '4px', textAlign: 'center' } },
            React.createElement('div', { style: { fontWeight: 'bold', fontSize: '1.1rem', color: '#155724' } }, state.taskCount?.questions || 0),
            React.createElement('div', { style: { fontSize: '0.8rem' } }, 'Questions')
          )
        )
      ),
      
      React.createElement('div', { style: { marginBottom: '1rem' } },
        React.createElement('h4', { style: { margin: '0 0 0.5rem', color: '#333' } }, 'System Stats'),
        React.createElement('div', { style: { padding: '0.75rem', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '0.9rem' } },
          React.createElement('div', null, 
            React.createElement('strong', null, 'Memory Concepts: '), 
            state.memoryStats?.conceptCount ?? 'N/A'
          ),
          React.createElement('div', null, 
            React.createElement('strong', null, 'Rule Count: '), 
            state.ruleStats?.totalRules ?? 'N/A'
          )
        )
      )
    );
  }, [reasoningState]);

  // Render analysis tab
  const renderAnalysisTab = useCallback(() => {
    const analysis = metaCognitiveResults || {};
    const suggestions = analysis.suggestions || [];
    
    return React.createElement('div', { style: { padding: '1rem' } },
      React.createElement('div', { style: { marginBottom: '1rem', display: 'flex', gap: '0.5rem' } },
        React.createElement('button', {
          onClick: performMetaAnalysis,
          style: {
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, 'Perform Analysis'),
        React.createElement('button', {
          onClick: setShowSuggestions,
          style: {
            padding: '0.5rem 1rem',
            backgroundColor: showSuggestions ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, showSuggestions ? 'Hide Suggestions' : 'Show Suggestions')
      ),
      
      showSuggestions && suggestions.length > 0 && React.createElement('div', null,
        React.createElement('h4', { style: { margin: '0 0 1rem', color: '#333' } }, 'Meta-Cognitive Insights'),
        suggestions.map((suggestion, idx) => 
          React.createElement('div', {
            key: idx,
            style: {
              padding: '0.75rem',
              margin: '0.5rem 0',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              backgroundColor: '#fff',
              fontSize: '0.9rem'
            }
          },
            React.createElement('div', { style: { fontWeight: 'bold', marginBottom: '0.25rem', color: '#007bff' } }, 
              suggestion.type
            ),
            React.createElement('div', null, suggestion.message),
            suggestion.ruleId && React.createElement('div', { style: { fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' } },
              `Rule ID: ${suggestion.ruleId}`
            )
          )
        )
      ),
      
      showSuggestions && suggestions.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '2rem', color: '#6c757d' } },
        React.createElement('div', { style: { fontSize: '2rem', marginBottom: '1rem' } }, '🔍'),
        React.createElement('div', { style: { fontWeight: 'bold', marginBottom: '0.5rem' } }, 'No Insights Found'),
        React.createElement('div', null, 'Perform meta-cognitive analysis to discover insights about the reasoning process.')
      )
    );
  }, [metaCognitiveResults, performMetaAnalysis, showSuggestions]);

  // Render corrections tab
  const renderCorrectionsTab = useCallback(() => {
    const corrections = useUiStore.getState().corrections || [];
    
    return React.createElement('div', { style: { padding: '1rem' } },
      React.createElement('div', { style: { marginBottom: '1rem' } },
        React.createElement('button', {
          onClick: performSelfCorrection,
          style: {
            padding: '0.5rem 1rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, 'Perform Self-Correction')
      ),
      
      corrections.length > 0 && React.createElement('div', null,
        React.createElement('h4', { style: { margin: '0 0 1rem', color: '#333' } }, 'Applied Corrections'),
        corrections.map((correction, idx) => 
          React.createElement('div', {
            key: idx,
            style: {
              padding: '0.75rem',
              margin: '0.5rem 0',
              border: '1px solid #c3e6c3',
              borderRadius: '4px',
              backgroundColor: '#e8f5e8',
              fontSize: '0.9rem'
            }
          },
            React.createElement('div', { style: { fontWeight: 'bold', marginBottom: '0.25rem', color: '#155724' } }, 
              correction.action
            ),
            React.createElement('div', null, correction.message),
            correction.ruleId && React.createElement('div', { style: { fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' } },
              `Rule ID: ${correction.ruleId}`
            )
          )
        )
      ),
      
      corrections.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '2rem', color: '#6c757d' } },
        React.createElement('div', { style: { fontSize: '2rem', marginBottom: '1rem' } }, '🔧'),
        React.createElement('div', { style: { fontWeight: 'bold', marginBottom: '0.5rem' } }, 'No Corrections Applied'),
        React.createElement('div', null, 'Perform self-correction to apply insights from meta-cognitive analysis.')
      )
    );
  }, [performSelfCorrection]);

  // Render queries tab
  const renderQueriesTab = useCallback(() => {
    return React.createElement('div', { style: { padding: '1rem' } },
      React.createElement('div', { style: { marginBottom: '1rem' } },
        React.createElement('div', { style: { marginBottom: '0.5rem' } },
          React.createElement('label', { style: { display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' } }, 'Query System State:'),
          React.createElement('input', {
            type: 'text',
            value: metaQuery,
            onChange: (e) => setMetaQuery(e.target.value),
            placeholder: 'Enter query about the reasoning system...',
            style: {
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }
          })
        ),
        React.createElement('button', {
          onClick: querySystemState,
          style: {
            padding: '0.5rem 1rem',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, 'Query')
      ),
      
      React.createElement('div', null,
        React.createElement('h4', { style: { margin: '0 0 1rem', color: '#333' } }, 'Query Examples'),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.5rem' } },
          React.createElement('button', {
            onClick: () => setMetaQuery('task distribution'),
            style: { padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', backgroundColor: '#f8f9fa' }
          }, 'Task Distribution'),
          React.createElement('button', {
            onClick: () => setMetaQuery('rules performance'),
            style: { padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', backgroundColor: '#f8f9fa' }
          }, 'Rule Performance'),
          React.createElement('button', {
            onClick: () => setMetaQuery('memory usage'),
            style: { padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', backgroundColor: '#f8f9fa' }
          }, 'Memory Usage'),
          React.createElement('button', {
            onClick: () => setMetaQuery('reasoning trace'),
            style: { padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', backgroundColor: '#f8f9fa' }
          }, 'Reasoning Trace'),
          React.createElement('button', {
            onClick: () => setMetaQuery('active concepts'),
            style: { padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', backgroundColor: '#f8f9fa' }
          }, 'Active Concepts'),
          React.createElement('button', {
            onClick: () => setMetaQuery('cycle performance'),
            style: { padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', backgroundColor: '#f8f9fa' }
          }, 'Cycle Performance')
        )
      )
    );
  }, [metaQuery, querySystemState]);

  // Render tab navigation
  const renderTabNavigation = useCallback(() => 
    React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid #dee2e6', marginBottom: '1rem' } },
      [
        { id: 'overview', label: 'Overview' },
        { id: 'analysis', label: 'Analysis' },
        { id: 'corrections', label: 'Corrections' },
        { id: 'queries', label: 'Queries' }
      ].map(tab => 
        React.createElement('button', {
          key: tab.id,
          onClick: () => setActiveTab(tab.id),
          style: {
            padding: '0.75rem 1rem',
            border: 'none',
            backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
            color: activeTab === tab.id ? 'white' : '#495057',
            cursor: 'pointer',
            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
            borderBottom: activeTab === tab.id ? '3px solid #007bff' : '3px solid transparent',
            transition: 'all 0.2s ease'
          }
        }, tab.label)
      )
    ), [activeTab]);

  // Map tabs to their content
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'overview': return renderOverviewTab();
      case 'analysis': return renderAnalysisTab();
      case 'corrections': return renderCorrectionsTab();
      case 'queries': return renderQueriesTab();
      default: return renderOverviewTab();
    }
  }, [activeTab, renderOverviewTab, renderAnalysisTab, renderCorrectionsTab, renderQueriesTab]);

  return React.createElement(GenericPanel, {
    title: '🧠 Meta-Cognitive Reasoning',
    maxHeight: 'calc(100% - 2rem)',
    items: [
      { type: 'navigation', component: renderTabNavigation() },
      { type: 'content', component: tabContent }
    ],
    renderItem: (item) => {
      if (item.type === 'navigation') return item.component;
      if (item.type === 'content') return item.component;
      return null;
    },
    emptyMessage: React.createElement('div', { style: { textAlign: 'center', padding: '2rem', color: '#6c757d' } },
      React.createElement('div', { style: { fontSize: '2rem', marginBottom: '1rem' } }, '🧠'),
      React.createElement('div', { style: { fontWeight: 'bold', marginBottom: '0.5rem' } }, 'Meta-Cognitive Reasoning'),
      React.createElement('div', null, 'System self-awareness and self-regulation capabilities')
    )
  });
};

export default MetaCognitionPanel;