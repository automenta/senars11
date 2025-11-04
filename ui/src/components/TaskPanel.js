import React, {memo} from 'react';
import {formatBudget, formatTruth} from '../utils/formatters.js';
import {DataPanel} from './DataPanel.js';
import {themeUtils} from '../utils/themeUtils.js';

const TaskPanel = memo(() => {
    const renderTask = (task) =>
        React.createElement('div',
            {
                key: task.id,
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
                    color: themeUtils.get('TEXT.PRIMARY')
                }
            }, task.term || task.id),
            React.createElement('div', {
                    style: {
                        fontSize: themeUtils.get('FONTS.SIZE.SM'),
                        color: themeUtils.get('TEXT.SECONDARY'),
                        marginTop: '0.25rem'
                    }
                },
                `Type: ${task.type || 'N/A'} | Truth: ${formatTruth(task.truth)} | Budget: ${formatBudget(task.budget)}`
            ),
            task.occurrenceTime && React.createElement('div', {
                    style: {
                        fontSize: themeUtils.get('FONTS.SIZE.SM'),
                        color: themeUtils.get('TEXT.MUTED'),
                        marginTop: '0.125rem'
                    }
                },
                `Time: ${new Date(task.occurrenceTime).toLocaleTimeString()}`
            )
        );

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