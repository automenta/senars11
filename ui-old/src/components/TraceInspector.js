/**
 * TraceInspector Component
 * Implements the trace inspection functionality specified in PLAN.repl.md
 * Allows users to inspect reasoning steps, filter by type, and view detailed information
 *
 * Features:
 * - Filtering by trace type (inference, deduction, etc.)
 * - Search functionality for traces
 * - Detailed view of selected trace
 * - Visual indicators for priority levels
 * - Performance optimization with limited display
 */
import React, {memo, useMemo, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import {themeUtils} from '../utils/themeUtils.js';
import {DataPanel} from './DataPanel.js';

const TraceInspector = memo(() => {
    const reasoningSteps = useUiStore(state => state.reasoningSteps);
    const [selectedStep, setSelectedStep] = useState(null);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter reasoning steps based on user selection with memoization for performance
    const filteredSteps = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return reasoningSteps.filter(step => {
            if (filter !== 'all' && step.type !== filter) return false;
            if (searchTerm &&
                !step.input?.toLowerCase().includes(lowerSearchTerm) &&
                !step.output?.toLowerCase().includes(lowerSearchTerm)) {
                return false;
            }
            return true;
        }).slice(0, 100); // Limit to last 100 steps for performance
    }, [reasoningSteps, filter, searchTerm]); // Only recompute when dependencies change

    // Type filter options for different reasoning types
    const typeFilters = [
        {id: 'all', label: 'All'},
        {id: 'inference', label: 'Inference'},
        {id: 'deduction', label: 'Deduction'},
        {id: 'induction', label: 'Induction'},
        {id: 'abduction', label: 'Abduction'},
        {id: 'comparison', label: 'Comparison'}
    ];

    /**
     * Renders a trace entry with visual indicators for priority
     * @param {Object} step - The reasoning step to render
     * @param {number} index - The index of the step
     * @returns {JSX.Element} The trace entry element
     */
    const renderTraceEntry = (step, index) => {
        const isSelected = selectedStep?.id === step.id;
        const baseStyle = {
            padding: '0.75rem',
            margin: '0.25rem 0',
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            cursor: 'pointer',
            border: isSelected ? `2px solid ${themeUtils.get('COLORS.PRIMARY')}` : '1px solid ' + themeUtils.get('BORDERS.COLOR'),
            backgroundColor: isSelected ? themeUtils.get('BACKGROUNDS.SECONDARY') : themeUtils.get('BACKGROUNDS.PRIMARY')
        };

        // Color-code based on priority
        const style = {
            ...baseStyle,
            ...(step.priority > 0.8 ? {borderLeft: '4px solid #28a745'} :
                step.priority > 0.6 ? {borderLeft: '4px solid #ffc107'} :
                    {borderLeft: '4px solid #dc3545'})
        };

        return React.createElement('div',
            {
                key: step.id || index,
                onClick: () => setSelectedStep(step),
                style: style
            },
            React.createElement('div', {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.25rem'
                    }
                },
                React.createElement('div', {
                    style: {
                        fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                        fontSize: themeUtils.get('FONTS.SIZE.SM')
                    }
                }, step.rule || step.type || 'Unknown'),
                React.createElement('div', {
                    style: {
                        fontSize: themeUtils.get('FONTS.SIZE.XS'),
                        color: themeUtils.get('TEXT.SECONDARY')
                    }
                }, new Date(step.timestamp || Date.now()).toLocaleTimeString())
            ),
            React.createElement('div', {
                style: {
                    fontFamily: 'monospace',
                    fontSize: themeUtils.get('FONTS.SIZE.XS'),
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }
            }, step.input || step.content || 'No input'),
            React.createElement('div', {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '0.25rem'
                    }
                },
                React.createElement('span', {
                    style: {
                        fontSize: themeUtils.get('FONTS.SIZE.XS'),
                        color: themeUtils.get('TEXT.SECONDARY')
                    }
                }, `Conf: ${(step.confidence || 0).toFixed(2)} Pr: ${(step.priority || 0).toFixed(2)}`),
                React.createElement('span', {
                    style: {
                        fontSize: themeUtils.get('FONTS.SIZE.XS'),
                        color: themeUtils.get('TEXT.SECONDARY')
                    }
                }, `Cyc: ${step.cycle || 'N/A'}`)
            )
        );
    };

    /**
     * Renders detailed information about the selected reasoning step
     * @returns {JSX.Element} The detailed view element
     */
    const renderStepDetails = () => {
        if (!selectedStep) {
            return React.createElement('div',
                {
                    style: {
                        padding: '1rem',
                        textAlign: 'center',
                        color: themeUtils.get('TEXT.SECONDARY'),
                        fontStyle: 'italic'
                    }
                },
                'Select a reasoning step to inspect details'
            );
        }

        return React.createElement('div',
            {
                style: {
                    padding: '1rem',
                    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                    borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY')
                }
            },
            React.createElement('h3', {
                style: {
                    margin: '0 0 1rem 0',
                    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')
                }
            }, 'Step Details'),
            React.createElement('div', {
                    style: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1rem'
                    }
                },
                React.createElement('div', null,
                    React.createElement('div', {
                        style: {
                            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                            marginBottom: '0.25rem'
                        }
                    }, 'Input'),
                    React.createElement('div', {
                        style: {
                            fontFamily: 'monospace',
                            fontSize: themeUtils.get('FONTS.SIZE.SM'),
                            wordBreak: 'break-word'
                        }
                    }, selectedStep.input || 'N/A')
                ),
                React.createElement('div', null,
                    React.createElement('div', {
                        style: {
                            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                            marginBottom: '0.25rem'
                        }
                    }, 'Output'),
                    React.createElement('div', {
                        style: {
                            fontFamily: 'monospace',
                            fontSize: themeUtils.get('FONTS.SIZE.SM'),
                            wordBreak: 'break-word'
                        }
                    }, selectedStep.output || 'N/A')
                ),
                React.createElement('div', null,
                    React.createElement('div', {
                        style: {
                            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                            marginBottom: '0.25rem'
                        }
                    }, 'Rule'),
                    React.createElement('div', {
                        style: {
                            fontSize: themeUtils.get('FONTS.SIZE.SM')
                        }
                    }, selectedStep.rule || 'N/A')
                ),
                React.createElement('div', null,
                    React.createElement('div', {
                        style: {
                            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                            marginBottom: '0.25rem'
                        }
                    }, 'Priority'),
                    React.createElement('div', {
                        style: {
                            fontSize: themeUtils.get('FONTS.SIZE.SM')
                        }
                    }, (selectedStep.priority || 0).toFixed(3))
                )
            ),
            React.createElement('div', {
                    style: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '1rem'
                    }
                },
                React.createElement('div', null,
                    React.createElement('div', {
                        style: {
                            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                            marginBottom: '0.25rem'
                        }
                    }, 'Confidence'),
                    React.createElement('div', {
                        style: {
                            fontSize: themeUtils.get('FONTS.SIZE.SM')
                        }
                    }, (selectedStep.confidence || 0).toFixed(3))
                ),
                React.createElement('div', null,
                    React.createElement('div', {
                        style: {
                            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                            marginBottom: '0.25rem'
                        }
                    }, 'Cycle'),
                    React.createElement('div', {
                        style: {
                            fontSize: themeUtils.get('FONTS.SIZE.SM')
                        }
                    }, selectedStep.cycle || 'N/A')
                ),
                React.createElement('div', null,
                    React.createElement('div', {
                        style: {
                            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                            marginBottom: '0.25rem'
                        }
                    }, 'Timestamp'),
                    React.createElement('div', {
                        style: {
                            fontSize: themeUtils.get('FONTS.SIZE.SM')
                        }
                    }, new Date(selectedStep.timestamp || Date.now()).toLocaleString())
                )
            )
        );
    };

    // Filter controls with search functionality
    const filterControls = React.createElement('div', {
            style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '1rem',
                padding: '0.5rem',
                backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
            }
        },
        React.createElement('select',
            {
                value: filter,
                onChange: (e) => setFilter(e.target.value),
                style: {
                    padding: '0.25rem 0.5rem',
                    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                    borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                    fontSize: themeUtils.get('FONTS.SIZE.SM')
                }
            },
            ...typeFilters.map(filterOption =>
                React.createElement('option', {key: filterOption.id, value: filterOption.id}, filterOption.label)
            )
        ),
        React.createElement('input',
            {
                type: 'text',
                placeholder: 'Search traces...',
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                style: {
                    padding: '0.25rem 0.5rem',
                    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                    borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                    fontSize: themeUtils.get('FONTS.SIZE.SM'),
                    flex: 1
                }
            }
        )
    );

    // Stats header showing trace counts
    const statsHeader = React.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
                padding: '0.25rem 0'
            }
        },
        React.createElement('div', {
            style: {
                fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')
            }
        }, `Traces: ${filteredSteps.length} / ${reasoningSteps.length}`),
        React.createElement('button',
            {
                onClick: () => setSelectedStep(null),
                disabled: !selectedStep,
                style: {
                    padding: '0.25rem 0.5rem',
                    backgroundColor: selectedStep ? themeUtils.get('COLORS.DANGER') : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                    cursor: selectedStep ? 'pointer' : 'not-allowed'
                }
            },
            'Clear Selection'
        )
    );

    return React.createElement(DataPanel, {
        title: 'Trace Inspector',
        dataSource: () => [
            {type: 'controls', content: filterControls},
            {type: 'header', content: statsHeader},
            {type: 'list', content: filteredSteps.map(renderTraceEntry)},
            {type: 'details', content: renderStepDetails()}
        ],
        renderItem: (item) => {
            if (item.type === 'controls') return item.content;
            if (item.type === 'header') return item.content;
            if (item.type === 'list') {
                if (item.content.length === 0) {
                    return React.createElement('div', {
                        style: {
                            padding: '1rem',
                            textAlign: 'center',
                            color: themeUtils.get('TEXT.SECONDARY'),
                            fontStyle: 'italic'
                        }
                    }, 'No traces found matching current filters');
                }
                return React.createElement('div', {
                    style: {
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginBottom: '1rem',
                        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                        borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
                    }
                }, ...item.content);
            }
            if (item.type === 'details') return item.content;
            return null;
        },
        config: {
            itemLabel: 'traces',
            showItemCount: false,
            containerHeight: 500
        }
    });
});

export default TraceInspector;