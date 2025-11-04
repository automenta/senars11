import React, {memo} from 'react';
import {DataPanel} from './DataPanel.js';
import DataItem from './DataItem.js';
import {themeUtils} from '../utils/themeUtils.js';
import {
    calculatePriorityChange,
    getPriorityChangeColor
} from '../utils/conceptUtils.js';

const ConceptPanel = memo(() => {
    const renderConcept = (concept) => {
        const priorityChange = calculatePriorityChange(concept);
        const priorityChangeColor = getPriorityChangeColor(priorityChange);
        
        return React.createElement(DataItem, {
            key: concept.term,
            title: concept.term,
            fields: [
                {
                    label: 'Priority Change',
                    value: priorityChange.toFixed(3),
                    render: (value) => React.createElement('span', {
                        style: { color: priorityChangeColor }
                    }, `${priorityChange >= 0 ? '+' : ''}${value}`)
                },
                { label: 'Priority', value: (concept.priority || 0).toFixed(3) },
                { label: 'Tasks', value: concept.taskCount || 0 },
                { label: 'Beliefs', value: concept.beliefCount || 0 },
                concept.lastAccess && {
                    label: 'Last Access',
                    value: new Date(concept.lastAccess).toLocaleTimeString()
                }
            ].filter(Boolean)
        });
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