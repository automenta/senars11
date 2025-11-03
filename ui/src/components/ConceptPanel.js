import React, {useCallback, useMemo, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import {listItemStyles, typography} from '../utils/styles.js';
import {
    calculatePriorityChange,
    formatConceptDetails,
    getPriorityChangeColor,
    sortConceptsByTime
} from '../utils/conceptUtils.js';

const ConceptPanel = () => {
    const [expandedConcept, setExpandedConcept] = useState(null);
    const [showTimeline, setShowTimeline] = useState(false);
    const concepts = useUiStore(state => state.concepts);

    const renderConcept = useCallback((concept, index) => {
        const isExpanded = expandedConcept === (concept.term || `concept-${index}`);

        const priorityChange = calculatePriorityChange(concept);
        const priorityChangeColor = getPriorityChangeColor(priorityChange);
        const details = formatConceptDetails(concept);

        return React.createElement('div',
            {
                key: concept.term || index,
                style: listItemStyles.base
            },
            React.createElement('div',
                {
                    style: {
                        ...typography.subtitle,
                        display: 'flex',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                    },
                    onClick: () => setExpandedConcept(isExpanded ? null : (concept.term || `concept-${index}`))
                },
                React.createElement('span', null, concept.term),
                React.createElement('span', {style: {fontSize: '0.8rem', color: priorityChangeColor}},
                    `${priorityChange >= 0 ? '+' : ''}${priorityChange.toFixed(3)}`
                )
            ),
            React.createElement('div', null,
                `Priority: ${concept.priority.toFixed(3)} | Tasks: ${concept.taskCount || 0} | Beliefs: ${concept.beliefCount || 0}`
            ),
            React.createElement('div', {style: typography.small},
                `Last access: ${new Date(concept.lastAccess).toLocaleTimeString()}`
            ),
            isExpanded && React.createElement('div', {
                    style: {
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px'
                    }
                },
                React.createElement('div', {style: {fontWeight: 'bold', marginBottom: '0.25rem'}}, 'Evolution Details:'),
                ...details.map((detail, idx) => React.createElement('div', {key: idx}, detail))
            )
        );
    }, [expandedConcept]);

    const renderControlBar = useCallback(() =>
        React.createElement('div',
            {
                style: {
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1rem',
                    padding: '0.5rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                }
            },
            React.createElement('div', {style: {flex: 1, display: 'flex', alignItems: 'center'}},
                React.createElement('label', {style: {display: 'flex', alignItems: 'center', gap: '0.5rem'}},
                    React.createElement('input', {
                        type: 'checkbox',
                        checked: showTimeline,
                        onChange: (e) => setShowTimeline(e.target.checked)
                    }),
                    React.createElement('span', {style: {fontSize: '0.9rem'}}, 'Show Evolution Timeline')
                )
            )
        ), [showTimeline]);

    const renderTimelineView = useCallback(() => {
        if (concepts.length === 0) {
            return React.createElement('div', {style: {textAlign: 'center', padding: '2rem', color: '#666'}},
                'No concepts to display timeline'
            );
        }

        const timelineData = sortConceptsByTime(concepts);

        return React.createElement('div', null,
            React.createElement('div', {
                    style: {
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        marginBottom: '1rem',
                        color: '#007bff'
                    }
                },
                'Concept Evolution Timeline'
            ),
            React.createElement('div', {style: {display: 'flex', flexDirection: 'column', gap: '1rem'}},
                timelineData.map((item, index) =>
                    React.createElement('div',
                        {
                            key: item.term,
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.75rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
                            }
                        },
                        React.createElement('div', {style: {flex: '0 0 150px', fontWeight: 'bold'}}, item.term),
                        React.createElement('div', {style: {flex: 1}},
                            React.createElement('span', {style: {fontWeight: '500'}}, 'Priority:'),
                            React.createElement('span', {
                                style: {
                                    marginLeft: '0.5rem',
                                    color: '#007bff'
                                }
                            }, item.priority.toFixed(3))
                        ),
                        React.createElement('div', {style: {flex: 1}},
                            React.createElement('span', {style: {fontWeight: '500'}}, 'Tasks:'),
                            React.createElement('span', {style: {marginLeft: '0.5rem'}}, item.taskCount)
                        ),
                        React.createElement('div', {style: {flex: 1}},
                            React.createElement('span', {style: {fontWeight: '500'}}, 'Beliefs:'),
                            React.createElement('span', {style: {marginLeft: '0.5rem'}}, item.beliefCount)
                        ),
                        React.createElement('div', {style: {flex: '0 0 120px', fontSize: '0.8rem', color: '#666'}},
                            new Date(item.lastAccess).toLocaleTimeString()
                        )
                    )
                )
            )
        );
    }, [concepts]);

    const items = useMemo(() => {
        if (showTimeline) {
            return [
                {type: 'controls', controlBar: renderControlBar()},
                {type: 'timeline', content: renderTimelineView()}
            ];
        } else {
            return [
                {type: 'controls', controlBar: renderControlBar()},
                ...concepts.map(c => ({type: 'concept', data: c}))
            ];
        }
    }, [concepts, showTimeline, renderControlBar, renderTimelineView]);

    const renderItem = useCallback((item, index) => {
        if (item.type === 'controls') {
            return item.controlBar;
        } else if (item.type === 'timeline') {
            return item.content;
        } else if (item.type === 'concept') {
            return renderConcept(item.data, index);
        }
        return null;
    }, [renderConcept]);

    return React.createElement(GenericPanel, {
        maxHeight: 'calc(100% - 2rem)',
        items,
        renderItem
    });
};

export default ConceptPanel;