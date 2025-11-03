import React, {useCallback, useMemo, useRef, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import {exportReasoningTraces} from '../utils/exportUtils.js';
import {commonFilterOptions, createFilterControls} from '../utils/taskUtils.js';
import {paginateData, processDataWithFilters} from '../utils/OptimizedDataProcessor.js';

const ReasoningTracePanel = () => {
    const [expandedTrace, setExpandedTrace] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [filterText, setFilterText] = useState('');
    const [exportFormat, setExportFormat] = useState('json');
    const [annotations, setAnnotations] = useState({});
    const [editingAnnotation, setEditingAnnotation] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [showAnnotations, setShowAnnotations] = useState(true);
    const [groupBy, setGroupBy] = useState('none'); // 'none', 'type', 'time'
    const traceRef = useRef(null);

    const reasoningSteps = useUiStore(state => state.reasoningSteps);
    const tasks = useUiStore(state => state.tasks);

    // Process and group data efficiently
    const processedData = useMemo(() => {
        const reasoningData = reasoningSteps.map((step, index) => ({
            id: `step-${index}`,
            type: 'reasoningStep',
            data: step,
            timestamp: step.timestamp || 0,
            description: step.description || 'No description',
            priority: step.priority || 0,
            rule: step.rule || 'unknown'
        }));

        const taskData = tasks
            .filter(task => task.creationTime)
            .map((task, index) => ({
                id: `task-${index + reasoningSteps.length}`,
                type: 'task',
                data: task,
                timestamp: task.creationTime,
                description: `Task: ${task.term || 'Unknown'} (${task.type || 'Unknown'})`,
                priority: task.budget?.priority || 0,
                taskType: task.type || 'unknown'
            }));

        const combinedData = [...reasoningData, ...taskData];

        return processDataWithFilters(combinedData, {
            filterType,
            filterText,
            typeField: 'type',
            searchFields: ['description', 'data.term', 'data.type', 'data.result', 'rule', 'taskType'],
            sortKey: 'timestamp',
            sortOrder: 'desc', // Show most recent first
            customFilters: [createPriorityFilter(0)] // Example of custom filter pattern
        });
    }, [reasoningSteps, tasks, filterType, filterText]);

    // Create parameterized priority filter function
    const createPriorityFilter = (minPriority = 0) => {
        return (item) => item.priority >= minPriority;
    };

    // Paginate the processed data
    const paginatedData = useMemo(() =>
            paginateData(processedData, currentPage, itemsPerPage),
        [processedData, currentPage, itemsPerPage]
    );

    const exportTraceData = useCallback(() => {
        exportReasoningTraces(processedData, filterType, filterText, exportFormat);
    }, [processedData, filterType, filterText, exportFormat]);

    // Text highlighting utility
    const highlightText = useCallback((text, searchTerm) => {
        if (!searchTerm || !text) return text;

        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, i) =>
            regex.test(part)
                ? React.createElement('span', {key: i, style: {backgroundColor: '#ffff00', fontWeight: 'bold'}}, part)
                : part
        );
    }, []);

    // Annotation management
    const updateAnnotation = useCallback((item, value) => {
        setAnnotations(prev => ({...prev, [item.id]: value}));
    }, []);

    const saveAnnotation = useCallback(() => setEditingAnnotation(null), []);

    const cancelAnnotation = useCallback((item) => {
        setAnnotations(prev => ({...prev, [item.id]: annotations[item.id] || ''}));
        setEditingAnnotation(null);
    }, [annotations]);

    const deleteAnnotation = useCallback((item) => {
        setAnnotations(prev => {
            const newAnnotations = {...prev};
            delete newAnnotations[item.id];
            return newAnnotations;
        });
    }, []);

    // Content creation functions
    const createReasoningContentElement = useCallback((step, searchTerm) =>
        React.createElement('div', {style: {marginBottom: '0.5rem'}},
            step.rule && React.createElement('div', {
                    style: {
                        color: '#004085',
                        fontWeight: '500',
                        marginBottom: '0.25rem'
                    }
                },
                `Rule: ${highlightText(step.rule, searchTerm)}`
            ),
            step.step !== undefined && React.createElement('div', {
                style: {
                    fontWeight: 'bold',
                    marginBottom: '0.25rem'
                }
            }, `Step ${step.step}`),
            step.description && React.createElement('div', {style: {marginBottom: '0.3rem'}}, highlightText(step.description, searchTerm)),
            step.result && React.createElement('div', {
                    style: {
                        fontWeight: '500',
                        marginTop: '0.5rem',
                        color: '#28a745'
                    }
                },
                `Result: ${highlightText(step.result, searchTerm)}`
            ),
            step.metadata && typeof step.metadata === 'object' && Object.keys(step.metadata).length > 0 &&
            React.createElement('div',
                {
                    style: {
                        fontSize: '0.8rem',
                        marginTop: '0.5rem',
                        color: '#666',
                        padding: '0.5rem',
                        border: '1px solid #eee',
                        borderRadius: '4px'
                    }
                },
                React.createElement('div', {style: {fontWeight: 'bold', marginBottom: '0.25rem'}}, 'Metadata:'),
                Object.entries(step.metadata).map(([key, value]) =>
                    React.createElement('div', {key, style: {wordBreak: 'break-word'}},
                        React.createElement('strong', null, `${key}: `),
                        highlightText(JSON.stringify(value), searchTerm)
                    )
                )
            )
        ), [highlightText]);

    const createTaskContentElement = useCallback((task, searchTerm) =>
        React.createElement('div', {style: {marginBottom: '0.5rem'}},
            task.term && React.createElement('div', {
                style: {
                    fontWeight: 'bold',
                    marginBottom: '0.25rem'
                }
            }, highlightText(task.term, searchTerm)),
            task.type && React.createElement('div', {
                    style: {
                        fontSize: '0.8rem',
                        color: '#666',
                        marginBottom: '0.25rem'
                    }
                },
                `Type: ${highlightText(task.type, searchTerm)}`
            ),
            task.truth && React.createElement('div', {style: {marginBottom: '0.25rem'}},
                React.createElement('strong', null, 'Truth: '),
                highlightText(JSON.stringify(task.truth), searchTerm)
            ),
            task.budget && React.createElement('div', {style: {fontSize: '0.8rem', marginBottom: '0.25rem'}},
                React.createElement('strong', null, 'Priority: '),
                highlightText((task.budget.priority || 0).toFixed(3), searchTerm)
            ),
            task.budget && task.budget.durability && React.createElement('div', {style: {fontSize: '0.8rem'}},
                React.createElement('strong', null, 'Durability: '),
                highlightText((task.budget.durability || 0).toFixed(3), searchTerm)
            )
        ), [highlightText]);

    // Annotation components
    const createAnnotationEditor = useCallback((item) => {
        const handleAnnotationChange = (e) => updateAnnotation(item, e.target.value);

        return React.createElement('div', {
                style: {
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }
            },
            React.createElement('div', {
                    style: {
                        marginBottom: '0.5rem',
                        fontWeight: 'bold',
                        color: '#856404',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                    }
                },
                React.createElement('span', null, '📝'),
                React.createElement('span', null, 'Add Annotation:')
            ),
            React.createElement('textarea', {
                value: annotations[item.id] || '',
                onChange: handleAnnotationChange,
                placeholder: 'Explain this reasoning moment...',
                style: {
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    minHeight: '60px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                }
            }),
            React.createElement('div', {style: {display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}},
                React.createElement('button', {
                        onClick: saveAnnotation,
                        style: {
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }
                    },
                    React.createElement('span', null, '✅'),
                    React.createElement('span', null, 'Save')
                ),
                React.createElement('button', {
                        onClick: () => cancelAnnotation(item),
                        style: {
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }
                    },
                    React.createElement('span', null, '❌'),
                    React.createElement('span', null, 'Cancel')
                )
            )
        );
    }, [annotations, updateAnnotation, saveAnnotation, cancelAnnotation]);

    const createAnnotationDisplay = useCallback((item) =>
        React.createElement('div', {
                style: {
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }
            },
            React.createElement('div', {
                    style: {
                        fontWeight: 'bold',
                        color: '#856404',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                    }
                },
                React.createElement('span', null, '📝'),
                React.createElement('span', null, 'Annotation:')
            ),
            React.createElement('div', {
                style: {
                    fontSize: '0.9rem',
                    lineHeight: '1.4',
                    whiteSpace: 'pre-wrap'
                }
            }, annotations[item.id]),
            React.createElement('div', {
                    style: {
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.5rem',
                        marginTop: '0.5rem'
                    }
                },
                React.createElement('button', {
                        onClick: (e) => {
                            e.stopPropagation();
                            setEditingAnnotation(item.id);
                        },
                        style: {
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }
                    },
                    React.createElement('span', null, '✏️'),
                    React.createElement('span', null, 'Edit')
                ),
                React.createElement('button', {
                        onClick: (e) => {
                            e.stopPropagation();
                            deleteAnnotation(item);
                        },
                        style: {
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }
                    },
                    React.createElement('span', null, '🗑️'),
                    React.createElement('span', null, 'Delete')
                )
            )
        ), [annotations, deleteAnnotation]);

    // Individual trace item renderer
    const renderTraceItem = useCallback((item) => {
        const isExpanded = expandedTrace === item.id;
        const hasAnnotation = annotations[item.id];
        const isAnnotating = editingAnnotation === item.id;

        const contentElement = item.type === 'reasoningStep'
            ? createReasoningContentElement(item.data, filterText)
            : createTaskContentElement(item.data, filterText);

        const annotationEditor = isAnnotating ? createAnnotationEditor(item) : null;
        const annotationDisplay = hasAnnotation && !isAnnotating ? createAnnotationDisplay(item) : null;

        return React.createElement('div',
            {
                key: item.id,
                ref: item.id === expandedTrace ? traceRef : null, // Scroll to expanded item
                style: {
                    padding: '0.75rem',
                    margin: '0.5rem 0',
                    backgroundColor: item.type === 'reasoningStep' ? '#f8f9ff' : '#f0f8f0',
                    border: `1px solid ${item.type === 'reasoningStep' ? '#b8daff' : '#c3e6c3'}`,
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'box-shadow 0.2s ease'
                }
            },
            React.createElement('div',
                {
                    style: {display: 'flex', justifyContent: 'space-between', cursor: 'pointer', alignItems: 'center'},
                    onClick: () => setExpandedTrace(isExpanded ? null : item.id)
                },
                React.createElement('div', {style: {display: 'flex', alignItems: 'center', gap: '0.5rem'}},
                    React.createElement('span',
                        {style: {fontWeight: 'bold', color: item.type === 'reasoningStep' ? '#004085' : '#155724'}},
                        `${item.type === 'reasoningStep' ? '🧠 Reasoning' : '📝 Task'}`
                    )
                ),
                React.createElement('div', {
                        style: {
                            fontSize: '0.75rem',
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }
                    },
                    React.createElement('span', null, new Date(item.timestamp).toLocaleTimeString()),
                    React.createElement('span', {
                        style: {
                            color: '#007bff',
                            fontWeight: 'bold'
                        }
                    }, `P:${item.priority.toFixed(2)}`)
                ),
                React.createElement('div', {style: {display: 'flex', gap: '0.25rem'}},
                    hasAnnotation && React.createElement('span', {style: {color: '#ffc107', fontSize: '0.8rem'}}, '📝'),
                    React.createElement('button', {
                        onClick: (e) => {
                            e.stopPropagation();
                            setEditingAnnotation(item.id);
                        },
                        style: {
                            padding: '0.25rem',
                            backgroundColor: hasAnnotation ? '#ffc107' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    }, hasAnnotation ? '✏️' : '📝')
                )
            ),
            isExpanded && contentElement,
            !isExpanded && React.createElement('div',
                {style: {fontSize: '0.85rem', marginTop: '0.25rem', color: '#495057', lineHeight: '1.4'}},
                highlightText(item.description, filterText)
            ),
            isExpanded && showAnnotations && annotationEditor,
            isExpanded && showAnnotations && annotationDisplay
        );
    }, [expandedTrace, filterText, highlightText, annotations, editingAnnotation, showAnnotations, createReasoningContentElement, createTaskContentElement, createAnnotationEditor, createAnnotationDisplay]);

    // Enhanced control bar with pagination
    const renderControlBar = useCallback(() => {
        return React.createElement('div', {style: {marginBottom: '1rem'}},
            // Filter controls
            createFilterControls(React, {
                filterType,
                setFilterType,
                filterText,
                setFilterText,
                exportFormat,
                setExportFormat,
                exportData: exportTraceData,
                filterOptions: [
                    ...commonFilterOptions,
                    {value: 'reasoningStep', label: 'Reasoning Steps'},
                    {value: 'task', label: 'Tasks'},
                    {value: 'task-belief', label: 'Belief Tasks'},
                    {value: 'task-goal', label: 'Goal Tasks'},
                    {value: 'task-question', label: 'Question Tasks'}
                ]
            }),

            // Additional controls
            React.createElement('div', {
                    style: {
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px'
                    }
                },
                // Pagination controls
                React.createElement('div', {style: {display: 'flex', alignItems: 'center', gap: '0.5rem'}},
                    React.createElement('span', {style: {fontSize: '0.8rem'}}, 'Items per page:'),
                    React.createElement('select', {
                            value: itemsPerPage,
                            onChange: (e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1); // Reset to first page
                            },
                            style: {padding: '0.25rem', fontSize: '0.8rem'}
                        },
                        [10, 20, 50, 100].map(size =>
                            React.createElement('option', {key: size, value: size}, size)
                        )
                    )
                ),

                // Page navigation
                React.createElement('div', {style: {display: 'flex', alignItems: 'center', gap: '0.5rem'}},
                    React.createElement('button', {
                        onClick: () => setCurrentPage(prev => Math.max(1, prev - 1)),
                        disabled: currentPage === 1,
                        style: {
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.8rem',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1
                        }
                    }, '← Prev'),

                    React.createElement('span', {style: {fontSize: '0.8rem'}},
                        `Page ${currentPage} of ${paginatedData.totalPages} (${paginatedData.total} items)`
                    ),

                    React.createElement('button', {
                        onClick: () => setCurrentPage(prev => Math.min(paginatedData.totalPages, prev + 1)),
                        disabled: currentPage === paginatedData.totalPages,
                        style: {
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.8rem',
                            cursor: currentPage === paginatedData.totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === paginatedData.totalPages ? 0.5 : 1
                        }
                    }, 'Next →')
                ),

                // View options
                React.createElement('div', {style: {display: 'flex', alignItems: 'center', gap: '0.5rem'}},
                    React.createElement('label', {style: {fontSize: '0.8rem'}},
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: showAnnotations,
                            onChange: () => setShowAnnotations(prev => !prev),
                            style: {marginRight: '0.25rem'}
                        }),
                        'Show Annotations'
                    )
                )
            )
        );
    }, [filterType, setFilterType, filterText, setFilterText, exportFormat, setExportFormat, exportTraceData, itemsPerPage, currentPage, paginatedData, showAnnotations]);

    // Scroll to expanded item when it changes
    React.useEffect(() => {
        if (expandedTrace && traceRef.current) {
            traceRef.current.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
    }, [expandedTrace]);

    return React.createElement(GenericPanel, {
        title: `🧠 Reasoning Trace (${processedData.length} events)`,
        maxHeight: 'calc(100% - 2rem)',
        items: [
            {type: 'controls', component: renderControlBar()},
            ...paginatedData.data.map(item => ({type: 'traceItem', data: item}))
        ],
        renderItem: (item) => {
            if (item.type === 'controls') {
                return item.component;
            } else if (item.type === 'traceItem') {
                return renderTraceItem(item.data);
            }
            return null;
        },
        emptyMessage: React.createElement('div', {style: {textAlign: 'center', padding: '2rem', color: '#6c757d'}},
            React.createElement('div', {style: {fontSize: '2rem', marginBottom: '1rem'}}, '🧠'),
            React.createElement('div', {
                style: {
                    fontWeight: 'bold',
                    marginBottom: '0.5rem'
                }
            }, 'No reasoning events yet'),
            React.createElement('div', null, 'Reasoning trace will be populated as the system processes inputs and performs reasoning.')
        )
    });
};

export default ReasoningTracePanel;