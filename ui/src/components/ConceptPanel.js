import React, {memo} from 'react';
import {DataPanel} from './DataPanel.js';
import {themeUtils} from '../utils/themeUtils.js';
import {
    calculatePriorityChange,
    getPriorityChangeColor
} from '../utils/conceptUtils.js';

const ConceptPanel = memo(() => {
    const renderConcept = (concept) => {
        const priorityChange = calculatePriorityChange(concept);
        const priorityChangeColor = getPriorityChangeColor(priorityChange);
        
        return React.createElement('div',
            {
                key: concept.term,
                style: {
                    padding: '0.75rem',
                    borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                    backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
                    borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                    marginBottom: '0.25rem'
                }
            },
            React.createElement('div', {
                style: {
                    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                    color: themeUtils.get('TEXT.PRIMARY'),
                    display: 'flex',
                    justifyContent: 'space-between'
                }
            },
                React.createElement('span', null, concept.term),
                React.createElement('span', {style: {fontSize: '0.8rem', color: priorityChangeColor}},
                    `${priorityChange >= 0 ? '+' : ''}${priorityChange.toFixed(3)}`
                )
            ),
            React.createElement('div', {
                    style: {
                        fontSize: themeUtils.get('FONTS.SIZE.SM'),
                        color: themeUtils.get('TEXT.SECONDARY'),
                        marginTop: '0.25rem'
                    }
                },
                `Priority: ${(concept.priority || 0).toFixed(3)} | Tasks: ${concept.taskCount || 0} | Beliefs: ${concept.beliefCount || 0}`
            ),
            concept.lastAccess && React.createElement('div', {
                    style: {
                        fontSize: themeUtils.get('FONTS.SIZE.SM'),
                        color: themeUtils.get('TEXT.MUTED'),
                        marginTop: '0.125rem'
                    }
                },
                `Last access: ${new Date(concept.lastAccess).toLocaleTimeString()}`
            )
        );
    };

    return React.createElement(DataPanel, {
        title: 'Concepts',
        dataSource: (state) => state.concepts,
        renderItem: renderConcept,
        search: {
            enabled: true,
            placeholder: 'Search concepts...',
            fields: ['term']
        },
        sort: {
            enabled: true,
            options: [
                {key: 'priority', label: 'Priority'},
                {key: 'taskCount', label: 'Task Count'},
                {key: 'beliefCount', label: 'Belief Count'},
                {key: 'term', label: 'Term'}
            ],
            defaultField: 'priority'
        },
        virtualization: {
            enabled: true,
            itemHeight: 80
        },
        config: {
            itemLabel: 'concepts',
            showItemCount: true,
            emptyMessage: 'No concepts to display',
            containerHeight: 400
        }
    });
});

export default ConceptPanel;