import React, {useCallback, useMemo, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import {themeUtils} from '../utils/themeUtils.js';

const ConceptRelationshipPanel = () => {
    const concepts = useUiStore(state => state.concepts);
    const tasks = useUiStore(state => state.tasks);
    const [selectedConcept, setSelectedConcept] = useState(null);

    // Process concepts to identify relationships
    const relationships = useMemo(() => {
        const relationships = [];
        const conceptTerms = concepts.map(c => c.term);

        // Identify potential relationships in tasks
        tasks.forEach(task => {
            if (task.term) {
                // Simple relationship extraction - look for compound terms
                if (task.term.includes(' --> ') || task.term.includes(' <-> ') || task.term.includes(' & ')) {
                    const parts = task.term.replace(/[()]/g, '').split(/ --> | <-> | & /);
                    for (let i = 0; i < parts.length - 1; i++) {
                        const source = parts[i].replace(/[<>]/g, '').trim();
                        const target = parts[i + 1].replace(/[<>]/g, '').trim();

                        if (conceptTerms.includes(source) && conceptTerms.includes(target)) {
                            relationships.push({
                                source,
                                target,
                                type: task.term.includes(' --> ') ? 'inheritance' :
                                    task.term.includes(' <-> ') ? 'similarity' : 'conjunction',
                                strength: task.truth?.frequency || 0.5,
                                task: task.term
                            });
                        }
                    }
                }
            }
        });

        return relationships;
    }, [concepts, tasks]);

    // Render concept details when one is selected
    const renderConceptDetails = useCallback(() => {
        if (!selectedConcept) return null;

        const concept = concepts.find(c => c.term === selectedConcept);
        if (!concept) return null;

        return React.createElement('div',
            {
                style: {
                    padding: '1rem',
                    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
                    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                    borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                    marginTop: '1rem'
                }
            },
            React.createElement('h4', {style: {margin: '0 0 0.5rem 0'}}, concept.term),
            React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.BASE')}}, `Priority: ${concept.priority?.toFixed(3)}`),
            React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.BASE')}}, `Tasks: ${concept.taskCount || 0}`),
            React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.BASE')}}, `Beliefs: ${concept.beliefCount || 0}`),
            React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.BASE')}}, `Questions: ${concept.questionCount || 0}`)
        );
    }, [selectedConcept, concepts]);

    // Render relationships table
    const renderRelationships = useCallback(() => {
        if (relationships.length === 0) {
            return React.createElement('div',
                {style: {padding: '1rem', fontStyle: 'italic', color: themeUtils.get('TEXT.SECONDARY')}},
                'No relationships found between concepts.'
            );
        }

        return React.createElement('div', null,
            React.createElement('table',
                {
                    style: {
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: themeUtils.get('FONTS.SIZE.SM')
                    }
                },
                React.createElement('thead', null,
                    React.createElement('tr',
                        {style: {backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY')}},
                        React.createElement('th', {style: {padding: '0.5rem', border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`}}, 'Source'),
                        React.createElement('th', {style: {padding: '0.5rem', border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`}}, 'Type'),
                        React.createElement('th', {style: {padding: '0.5rem', border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`}}, 'Target'),
                        React.createElement('th', {
                            style: {
                                padding: '0.5rem',
                                border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
                            }
                        }, 'Strength'),
                        React.createElement('th', {style: {padding: '0.5rem', border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`}}, 'Task')
                    )
                ),
                React.createElement('tbody', null,
                    relationships.map((rel) =>
                        React.createElement('tr',
                            {key: `${rel.source}-${rel.target}-${rel.type}`, style: {backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY')}},
                            React.createElement('td',
                                {
                                    style: {padding: '0.5rem', border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`, cursor: 'pointer'},
                                    onClick: () => setSelectedConcept(rel.source)
                                },
                                rel.source
                            ),
                            React.createElement('td', {
                                style: {
                                    padding: '0.5rem',
                                    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
                                }
                            }, rel.type),
                            React.createElement('td',
                                {
                                    style: {padding: '0.5rem', border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`, cursor: 'pointer'},
                                    onClick: () => setSelectedConcept(rel.target)
                                },
                                rel.target
                            ),
                            React.createElement('td', {
                                style: {
                                    padding: '0.5rem',
                                    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
                                }
                            }, rel.strength?.toFixed(2)),
                            React.createElement('td', {
                                    style: {
                                        padding: '0.5rem',
                                        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                                        maxWidth: '150px'
                                    }
                                },
                                React.createElement('div', {
                                    style: {
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }
                                }, rel.task)
                            )
                        )
                    )
                )
            )
        );
    }, [relationships, setSelectedConcept]);

    // Render concept list
    const renderConceptList = useCallback(() => {
        if (concepts.length === 0) {
            return React.createElement('div',
                {style: {padding: '1rem', fontStyle: 'italic', color: themeUtils.get('TEXT.SECONDARY')}},
                'No concepts available.'
            );
        }

        return React.createElement('div', null,
            React.createElement('h4', {style: {margin: '0 0 0.5rem 0', fontSize: themeUtils.get('FONTS.SIZE.BASE')}}, 'Available Concepts'),
            React.createElement('div',
                {style: {display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}},
                concepts.map((concept) =>
                    React.createElement('span',
                        {
                            key: concept.term,
                            onClick: () => setSelectedConcept(concept.term),
                            style: {
                                padding: '0.25rem 0.5rem',
                                backgroundColor: selectedConcept === concept.term ? themeUtils.get('COLORS.PRIMARY') : '#e9ecef',
                                color: selectedConcept === concept.term ? 'white' : '#495057',
                                border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: themeUtils.get('FONTS.SIZE.SM')
                            }
                        },
                        `${concept.term} (${(concept.priority || 0).toFixed(2)})`
                    )
                )
            )
        );
    }, [concepts, selectedConcept]);

    const items = [
        {type: 'header', content: 'Concept Relationships'},
        {type: 'concepts', content: renderConceptList()},
        {type: 'relationships', content: renderRelationships()},
        {type: 'details', content: renderConceptDetails()}
    ];

    const renderRelationshipItem = useCallback((item) => {
        if (item.type === 'header') {
            return React.createElement('div', {
                style: {
                    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                    fontSize: themeUtils.get('FONTS.SIZE.BASE'),
                    margin: '0 0 1rem 0',
                    padding: '0.5rem 0',
                    borderBottom: `2px solid ${themeUtils.get('COLORS.PRIMARY')}`,
                    color: themeUtils.get('TEXT.PRIMARY')
                }
            }, item.content);
        } else {
            return item.content;
        }
    }, []);

    return React.createElement(GenericPanel, {
        title: 'Concept Relationships',
        maxHeight: 'calc(100% - 2rem)',
        items,
        renderItem: renderRelationshipItem,
        emptyMessage: 'Concept relationships will be displayed here once the system has processed inputs.'
    });
};

export default ConceptRelationshipPanel;