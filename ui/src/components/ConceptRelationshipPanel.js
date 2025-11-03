import React, {useCallback, useMemo, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

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
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    marginTop: '1rem'
                }
            },
            React.createElement('h4', {style: {margin: '0 0 0.5rem 0'}}, concept.term),
            React.createElement('div', {style: {fontSize: '0.9rem'}}, `Priority: ${concept.priority?.toFixed(3)}`),
            React.createElement('div', {style: {fontSize: '0.9rem'}}, `Tasks: ${concept.taskCount || 0}`),
            React.createElement('div', {style: {fontSize: '0.9rem'}}, `Beliefs: ${concept.beliefCount || 0}`),
            React.createElement('div', {style: {fontSize: '0.9rem'}}, `Questions: ${concept.questionCount || 0}`)
        );
    }, [selectedConcept, concepts]);

    // Render relationships table
    const renderRelationships = useCallback(() => {
        if (relationships.length === 0) {
            return React.createElement('div',
                {style: {padding: '1rem', fontStyle: 'italic', color: '#6c757d'}},
                'No relationships found between concepts.'
            );
        }

        return React.createElement('div', null,
            React.createElement('table',
                {
                    style: {
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.85rem'
                    }
                },
                React.createElement('thead', null,
                    React.createElement('tr',
                        {style: {backgroundColor: '#f8f9fa'}},
                        React.createElement('th', {style: {padding: '0.5rem', border: '1px solid #dee2e6'}}, 'Source'),
                        React.createElement('th', {style: {padding: '0.5rem', border: '1px solid #dee2e6'}}, 'Type'),
                        React.createElement('th', {style: {padding: '0.5rem', border: '1px solid #dee2e6'}}, 'Target'),
                        React.createElement('th', {
                            style: {
                                padding: '0.5rem',
                                border: '1px solid #dee2e6'
                            }
                        }, 'Strength'),
                        React.createElement('th', {style: {padding: '0.5rem', border: '1px solid #dee2e6'}}, 'Task')
                    )
                ),
                React.createElement('tbody', null,
                    relationships.map((rel, index) =>
                        React.createElement('tr',
                            {key: index, style: {backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'}},
                            React.createElement('td',
                                {
                                    style: {padding: '0.5rem', border: '1px solid #dee2e6', cursor: 'pointer'},
                                    onClick: () => setSelectedConcept(rel.source)
                                },
                                rel.source
                            ),
                            React.createElement('td', {
                                style: {
                                    padding: '0.5rem',
                                    border: '1px solid #dee2e6'
                                }
                            }, rel.type),
                            React.createElement('td',
                                {
                                    style: {padding: '0.5rem', border: '1px solid #dee2e6', cursor: 'pointer'},
                                    onClick: () => setSelectedConcept(rel.target)
                                },
                                rel.target
                            ),
                            React.createElement('td', {
                                style: {
                                    padding: '0.5rem',
                                    border: '1px solid #dee2e6'
                                }
                            }, rel.strength?.toFixed(2)),
                            React.createElement('td', {
                                    style: {
                                        padding: '0.5rem',
                                        border: '1px solid #dee2e6',
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
                {style: {padding: '1rem', fontStyle: 'italic', color: '#6c757d'}},
                'No concepts available.'
            );
        }

        return React.createElement('div', null,
            React.createElement('h4', {style: {margin: '0 0 0.5rem 0', fontSize: '1rem'}}, 'Available Concepts'),
            React.createElement('div',
                {style: {display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}},
                concepts.map((concept, index) =>
                    React.createElement('span',
                        {
                            key: concept.term || index, // Use term as key if available, otherwise index
                            onClick: () => setSelectedConcept(concept.term),
                            style: {
                                padding: '0.25rem 0.5rem',
                                backgroundColor: selectedConcept === concept.term ? '#007bff' : '#e9ecef',
                                color: selectedConcept === concept.term ? 'white' : '#495057',
                                border: '1px solid #ced4da',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '0.8rem'
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

    const renderRelationshipItem = useCallback((item, index) => {
        if (item.type === 'header') {
            return React.createElement('div', {
                style: {
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    margin: '0 0 1rem 0',
                    padding: '0.5rem 0',
                    borderBottom: '2px solid #007bff',
                    color: '#333'
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