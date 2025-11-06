import React, {memo} from 'react';
import {formatBudget, formatTruth} from '../utils/formatters.js';
import {DataPanel} from './DataPanel.js';
import DataItem from './DataItem.js';

const TaskPanel = memo(() => {
    const renderTask = (task) =>
        React.createElement(DataItem, {
            key: task.id,
            title: task.term || task.id,
            fields: [
                {label: 'Type', value: task.type || 'N/A'},
                {label: 'Truth', value: formatTruth(task.truth)},
                {label: 'Budget', value: formatBudget(task.budget)},
                task.occurrenceTime && {label: 'Time', value: new Date(task.occurrenceTime).toLocaleTimeString()}
            ].filter(Boolean)
        });

    return React.createElement(DataPanel, {
        title: 'Tasks',
        dataSource: (state) => state.tasks,
        renderItem: renderTask,
        search: {
            enabled: true,
            placeholder: 'Search tasks...',
            fields: ['term', 'id', 'type']
        },
        sort: {
            enabled: true,
            options: [
                {key: 'budget.priority', label: 'Priority'},
                {key: 'creationTime', label: 'Time'},
                {key: 'term', label: 'Term'},
                {key: 'type', label: 'Type'}
            ],
            defaultField: 'creationTime'
        },
        virtualization: {
            enabled: true,
            itemHeight: 70
        },
        config: {
            itemLabel: 'tasks',
            showItemCount: true,
            emptyMessage: 'No tasks to display',
            containerHeight: 400
        }
    });
});

export default TaskPanel;