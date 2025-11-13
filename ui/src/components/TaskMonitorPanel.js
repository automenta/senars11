import React, {memo, useCallback, useMemo, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import {formatBudget, formatTruth} from '../utils/formatters.js';
import {DataPanel} from './DataPanel.js';
import TaskRelationshipGraph from './TaskRelationshipGraph.js';
import TaskFlowDiagram from './TaskFlowDiagram.js';
import {themeUtils} from '../utils/themeUtils.js';

const TaskMonitorPanel = memo(() => {
  const [expandedTask, setExpandedTask] = useState(null);
  const [showTransformations, setShowTransformations] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showRelationships, setShowRelationships] = useState(false);
  const [showFlowDiagram, setShowFlowDiagram] = useState(false);

  const tasks = useUiStore(state => state.tasks);
  const reasoningSteps = useUiStore(state => state.reasoningSteps);

  const getTaskTransformations = useCallback((task) => {
    if (!reasoningSteps?.length) return [];

    return reasoningSteps.filter(step => {
      const searchTerms = [task.term, task.id].filter(Boolean);
      return searchTerms.some(term =>
        step.input?.includes(term) ||
                step.result?.includes(term) ||
                step.description?.includes(term)
      );
    });
  }, [reasoningSteps]);

  const getTaskStyle = useCallback((taskType) => {
    const bgColors = {
      'question': '#e7f3ff',
      'QUESTION': '#e7f3ff',
      'goal': '#fff3cd',
      'GOAL': '#fff3cd',
      'belief': '#e8f5e8',
      'BELIEF': '#e8f5e8'
    };
    const borderColors = {
      'question': '#b8daff',
      'QUESTION': '#b8daff',
      'goal': '#ffeaa7',
      'GOAL': '#ffeaa7',
      'belief': '#a3d9a5',
      'BELIEF': '#a3d9a5'
    };

    return {
      backgroundColor: bgColors[taskType] || 'white',
      border: `1px solid ${borderColors[taskType] || '#ddd'}`
    };
  }, []);

  const renderTransformations = useCallback((transformations) => {
    if (!transformations?.length) return null;
    return React.createElement('div', {
      style: {
        marginTop: '0.5rem',
        padding: '0.5rem',
        backgroundColor: '#f9f9f9',
        border: '1px solid #eee',
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
      }
    },
    React.createElement('div', {
      style: {
        fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
        marginBottom: '0.25rem',
        color: themeUtils.get('COLORS.PRIMARY')
      }
    }, 'Transformations:'),
    transformations.map((transform) =>
      React.createElement('div', {
        key: transform.id || transform.description,
        style: {
          padding: '0.25rem 0',
          fontSize: themeUtils.get('FONTS.SIZE.XS'),
          borderLeft: `2px solid ${themeUtils.get('COLORS.PRIMARY')}`,
          paddingLeft: '0.5rem'
        }
      },
      React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.MEDIUM')}}, transform.description || 'Transformation'),
      transform.result && React.createElement('div', {
        style: {
          fontStyle: 'italic',
          fontSize: themeUtils.get('FONTS.SIZE.XXS')
        }
      }, `Result: ${transform.result}`)
      )
    )
    );
  }, []);

  const renderDependencies = useCallback((dependencies) => {
    if (!dependencies || !Array.isArray(dependencies) || !dependencies.length) return null;
    return React.createElement('div', {
      style: {
        marginTop: '0.5rem',
        padding: '0.5rem',
        backgroundColor: '#f0f8f0',
        border: '1px solid #c3e6c3',
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
      }
    },
    React.createElement('div', {
      style: {
        fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
        marginBottom: '0.25rem',
        color: '#155724'
      }
    }, 'Dependencies:'),
    React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.XS')}}, dependencies.join(', '))
    );
  }, []);

  const renderTask = useCallback((task) => {
    if (filterType !== 'all' && filterType !== task.type?.toLowerCase()) return null;

    const isExpanded = expandedTask === task.id;
    const transformations = getTaskTransformations(task);
    const hasTransformations = transformations.length > 0;

    return React.createElement('div',
      {
        style: {
          padding: '0.5rem',
          margin: '0.25rem 0',
          ...getTaskStyle(task.type),
          borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
          fontSize: themeUtils.get('FONTS.SIZE.SM')
        }
      },
      React.createElement('div', {
        style: {
          fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
          display: 'flex',
          justifyContent: 'space-between',
          cursor: 'pointer'
        },
        onClick: () => setExpandedTask(isExpanded ? null : task.id)
      },
      React.createElement('span', null, task.term || 'No term'),
      React.createElement('div', {style: {display: 'flex', gap: '0.5rem'}},
        React.createElement('span', {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.XS'),
            color: themeUtils.get('TEXT.SECONDARY')
          }
        }, task.type || 'Unknown'),
        hasTransformations && React.createElement('span', {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.XS'),
            color: themeUtils.get('COLORS.PRIMARY')
          }
        }, `(${transformations.length} transformations)`)
      )
      ),
      isExpanded && React.createElement('div', {style: {marginTop: '0.25rem'}},
        task.truth && React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.SM')}},
          `Truth: ${formatTruth(task.truth)}`
        ),
        task.budget && React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.SM')}},
          `Budget: ${formatBudget(task.budget)}`
        ),
        task.occurrenceTime && React.createElement('div', {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.XXS'),
            color: themeUtils.get('TEXT.SECONDARY'),
            marginTop: '0.25rem'
          }
        },
        `Time: ${new Date(task.occurrenceTime).toLocaleTimeString()}`
        ),
        showTransformations && hasTransformations && renderTransformations(transformations),
        renderDependencies(task.dependencies)
      )
    );
  }, [expandedTask, showTransformations, getTaskTransformations, filterType, getTaskStyle, formatTruth, formatBudget, renderTransformations, renderDependencies]);

  const renderReasoningStep = useCallback((step) =>
    React.createElement('div',
      {
        style: {
          padding: '0.5rem',
          margin: '0.25rem 0',
          backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
          border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
          borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
          fontSize: themeUtils.get('FONTS.SIZE.SM')
        }
      },
      step.step && React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}}, `Step ${step.step}`),
      step.description && React.createElement('div', null, step.description),
      step.result && React.createElement('div', {style: {marginTop: '0.25rem', fontStyle: 'italic'}},
        `Result: ${step.result}`
      ),
      step.timestamp && React.createElement('div', {
        style: {
          fontSize: themeUtils.get('FONTS.SIZE.XXS'),
          color: themeUtils.get('TEXT.SECONDARY'),
          marginTop: '0.25rem'
        }
      },
      `Time: ${new Date(step.timestamp).toLocaleTimeString()}`
      )
    ), []);

  const renderControlBar = useCallback(() =>
    React.createElement('div',
      {
        style: {
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          padding: '0.5rem',
          backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
          borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
          flexWrap: 'wrap'
        }
      },
      React.createElement('div', {style: {flex: 1, minWidth: '150px'}},
        React.createElement('label', {
          style: {
            display: 'block',
            fontSize: themeUtils.get('FONTS.SIZE.XS'),
            marginBottom: '0.25rem'
          }
        }, 'Filter by Type:'),
        React.createElement('select', {
          value: filterType,
          onChange: (e) => setFilterType(e.target.value),
          style: {
            width: '100%',
            padding: '0.25rem',
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            fontSize: themeUtils.get('FONTS.SIZE.BASE')
          }
        },
        React.createElement('option', {value: 'all'}, 'All Tasks'),
        React.createElement('option', {value: 'question'}, 'Questions'),
        React.createElement('option', {value: 'goal'}, 'Goals'),
        React.createElement('option', {value: 'belief'}, 'Beliefs')
        )
      ),
      React.createElement('div', {style: {flex: 1, display: 'flex', alignItems: 'center', minWidth: '150px'}},
        React.createElement('label', {style: {display: 'flex', alignItems: 'center', gap: '0.5rem'}},
          React.createElement('input', {
            type: 'checkbox',
            checked: showTransformations,
            onChange: (e) => setShowTransformations(e.target.checked)
          }),
          React.createElement('span', {style: {fontSize: themeUtils.get('FONTS.SIZE.BASE')}}, 'Show Transformations')
        )
      ),
      React.createElement('div', {style: {flex: 1, display: 'flex', alignItems: 'center', minWidth: '150px'}},
        React.createElement('label', {style: {display: 'flex', alignItems: 'center', gap: '0.5rem'}},
          React.createElement('input', {
            type: 'checkbox',
            checked: showRelationships,
            onChange: (e) => setShowRelationships(e.target.checked)
          }),
          React.createElement('span', {style: {fontSize: themeUtils.get('FONTS.SIZE.BASE')}}, 'Show Relationships')
        )
      ),
      React.createElement('div', {style: {flex: 1, display: 'flex', alignItems: 'center', minWidth: '150px'}},
        React.createElement('label', {style: {display: 'flex', alignItems: 'center', gap: '0.5rem'}},
          React.createElement('input', {
            type: 'checkbox',
            checked: showFlowDiagram,
            onChange: (e) => setShowFlowDiagram(e.target.checked)
          }),
          React.createElement('span', {style: {fontSize: themeUtils.get('FONTS.SIZE.BASE')}}, 'Show Flow Diagram')
        )
      )
    ), [filterType, showTransformations, showRelationships, showFlowDiagram]);

  const items = useMemo(() => {
    const result = [
      {type: 'controls', controlBar: renderControlBar()}
    ];

    if (showFlowDiagram) {
      result.push({type: 'flowDiagram', content: React.createElement(TaskFlowDiagram)});
    } else if (showRelationships) {
      result.push({type: 'relationships', content: React.createElement(TaskRelationshipGraph)});
    } else {
      result.push({type: 'header', content: 'Recent Tasks'});
      result.push(...tasks.map(t => ({type: 'task', data: t})));
      result.push({type: 'header', content: 'Recent Reasoning Steps'});
      result.push(...reasoningSteps.map(s => ({type: 'reasoningStep', data: s})));
    }

    return result;
  }, [tasks, reasoningSteps, renderControlBar, showRelationships, showFlowDiagram]);

  const renderMonitorItem = useCallback((item) => {
    if (item.type === 'controls') return item.controlBar;
    if (item.type === 'flowDiagram') return React.createElement('div', {style: {marginBottom: '1rem'}}, item.content);
    if (item.type === 'relationships') return React.createElement('div', {style: {marginBottom: '1rem'}}, item.content);
    if (item.type === 'header') {
      return React.createElement('div', {
        style: {
          fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
          fontSize: themeUtils.get('FONTS.SIZE.BASE'),
          margin: '1rem 0 0.5rem 0',
          padding: '0.5rem 0',
          borderBottom: `2px solid ${themeUtils.get('COLORS.PRIMARY')}`,
          color: themeUtils.get('TEXT.PRIMARY')
        }
      }, item.content);
    }
    if (item.type === 'task') return renderTask(item.data);
    if (item.type === 'reasoningStep') return renderReasoningStep(item.data);
    return null;
  }, [renderTask, renderReasoningStep]);

  return React.createElement(DataPanel, {
    title: 'Task Monitor',
    dataSource: () => items,
    renderItem: renderMonitorItem,
    config: {
      itemLabel: 'items',
      showItemCount: false,
      emptyMessage: showFlowDiagram
        ? 'Task flow diagram will be populated as the reasoning engine processes inputs.'
        : showRelationships
          ? 'Task relationship graph will be populated as the reasoning engine processes inputs.'
          : 'Task information will be populated as the reasoning engine processes inputs.',
      containerHeight: 500
    }
  });
});

export default TaskMonitorPanel;