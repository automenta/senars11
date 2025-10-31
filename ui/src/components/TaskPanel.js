import React, { memo } from 'react';
import useUiStore from '../stores/uiStore.js';
import {formatBudget, formatTruth} from '../utils/formatters.js';
import ListPanel from './ListPanel.js';
import { listItemStyles, typography } from '../utils/styles.js';

const TaskPanel = memo(() => {
    const tasks = useUiStore(state => state.tasks);

    const renderTask = (task, index) =>
        React.createElement('div',
            {
                key: task.id || index,
                style: listItemStyles.base
            },
            React.createElement('div', {style: typography.subtitle}, task.term),
            React.createElement('div', null,
                `Type: ${task.type} | Truth: ${formatTruth(task.truth)} | Budget: ${formatBudget(task.budget)}`
            ),
            task.occurrenceTime && React.createElement('div', {style: typography.small},
                `Time: ${new Date(task.occurrenceTime).toLocaleTimeString()}`
            )
        );

    const filterTask = (task, searchTerm) => {
        // Check if the search term matches any relevant field in the task
        const searchLower = searchTerm.toLowerCase();
        return (
            (task.term && task.term.toLowerCase().includes(searchLower)) ||
            (task.type && task.type.toLowerCase().includes(searchLower)) ||
            (task.id && task.id.toLowerCase().includes(searchLower))
        );
    };

    const sortOptions = [
        { key: 'priority', label: 'Priority' },
        { key: 'creationTime', label: 'Time' },
        { key: 'term', label: 'Term' },
        { key: 'type', label: 'Type' }
    ];

    return React.createElement(ListPanel, {
        title: 'Tasks',
        items: tasks,
        renderItem: renderTask,
        searchPlaceholder: 'Search tasks...',
        sortOptions: sortOptions,
        defaultSort: 'creationTime',
        filterFn: filterTask,
        emptyMessage: 'No tasks to display',
        useVirtualization: tasks.length > 100,  // Only use virtualization for large datasets
        itemHeight: 70  // Approximate height of each task item
    });
});

export default TaskPanel;