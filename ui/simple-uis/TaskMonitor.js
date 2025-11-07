import React from 'react';
import useUiStore from '../src/stores/uiStore';

const TaskMonitor = () => {
    const tasks = useUiStore(state => state.tasks);

    // Group tasks by type
    const beliefs = tasks.filter(task => task.type === 'belief');
    const questions = tasks.filter(task => task.type === 'question');
    const goals = tasks.filter(task => task.type === 'goal');

    // Style constants
    const containerStyle = {
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '1000px',
        margin: '0 auto',
        border: '2px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    };

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
    };

    const sectionHeaderStyle = type => ({
        color: type === 'beliefs' ? '#0c5460' : type === 'questions' ? '#600c54' : '#54600c',
        borderBottom:
            type === 'beliefs'
                ? '2px solid #bee5eb'
                : type === 'questions'
                    ? '2px solid #e5bee5'
                    : '2px solid #e5ebbe',
        paddingBottom: '5px',
        marginBottom: '15px',
    });

    const emptySectionStyle = {
        padding: '20px',
        textAlign: 'center',
        color: '#6c757d',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        fontStyle: 'italic',
        minHeight: '100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const taskCardStyle = {
        padding: '12px',
        marginBottom: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#fff',
        fontFamily: 'monospace',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    };

    const taskTypeBadgeStyle = type => ({
        padding: '4px 10px',
        borderRadius: '12px',
        backgroundColor:
            type === 'belief'
                ? '#d1ecf1'
                : type === 'question'
                    ? '#f1d1ec'
                    : type === 'goal'
                        ? '#ecf1d1'
                        : '#e2e3e5',
        color:
            type === 'belief'
                ? '#0c5460'
                : type === 'question'
                    ? '#600c54'
                    : type === 'goal'
                        ? '#54600c'
                        : '#383d41',
        fontSize: '0.85em',
        fontWeight: 'bold',
        alignSelf: 'flex-start',
    });

    const taskContentStyle = {
        flex: 1,
        wordBreak: 'break-word',
    };

    const taskMetaStyle = {
        marginTop: '6px',
        fontSize: '0.85em',
        color: '#6c757d',
    };

    const totalTasksStyle = {
        marginTop: '25px',
        padding: '15px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '1.1em',
    };

    const renderTask = (task, index) =>
        React.createElement(
            'div',
            {
                key: task.id || index,
                style: taskCardStyle,
                'data-testid': `task-card-${task.id || index}`,
            },
            React.createElement(
                'div',
                {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                    },
                },
                React.createElement(
                    'div',
                    {style: taskContentStyle, 'data-testid': 'task-content'},
                    React.createElement('strong', null, 'Content:'),
                    ' ',
                    task.content || task.term
                ),
                React.createElement(
                    'div',
                    {
                        style: taskTypeBadgeStyle(task.type),
                        'data-testid': 'task-type-badge',
                    },
                    task.type?.toUpperCase()
                )
            ),
            task.priority !== undefined &&
            React.createElement(
                'div',
                {style: taskMetaStyle, 'data-testid': 'task-priority'},
                React.createElement('strong', null, 'Priority:'),
                ' ',
                task.priority?.toFixed(3) || 'N/A',
                ' | ',
                React.createElement('strong', null, ' Time:'),
                ' ',
                new Date(task.creationTime || task.timestamp).toLocaleTimeString()
            ),
            task.truth &&
            React.createElement(
                'div',
                {style: taskMetaStyle, 'data-testid': 'task-truth'},
                React.createElement('strong', null, 'Truth:'),
                ' ',
                'Freq: ',
                task.truth.frequency?.toFixed(3) || 'N/A',
                ', Conf: ',
                task.truth.confidence?.toFixed(3) || 'N/A'
            )
        );

    return React.createElement(
        'div',
        {style: containerStyle, 'data-testid': 'task-monitor-container'},
        React.createElement('h1', {'data-testid': 'task-monitor-title'}, 'Task Monitor'),
        React.createElement(
            'div',
            {style: gridStyle, 'data-testid': 'task-grid'},
            React.createElement(
                'div',
                {'data-testid': 'beliefs-section'},
                React.createElement(
                    'h2',
                    {style: sectionHeaderStyle('beliefs')},
                    'Beliefs ',
                    React.createElement(
                        'span',
                        {style: {fontSize: '0.8em', color: '#6c757d'}},
                        `(${beliefs.length})`
                    )
                ),
                beliefs.length === 0
                    ? React.createElement(
                        'div',
                        {
                            style: emptySectionStyle,
                            'data-testid': 'beliefs-empty',
                        },
                        'No beliefs in the system'
                    )
                    : React.createElement(
                        'div',
                        {
                            style: {maxHeight: '400px', overflowY: 'auto'},
                            'data-testid': 'beliefs-list',
                        },
                        beliefs.map((task, index) => renderTask(task, `belief-${index}`))
                    )
            ),
            React.createElement(
                'div',
                {'data-testid': 'questions-section'},
                React.createElement(
                    'h2',
                    {style: sectionHeaderStyle('questions')},
                    'Questions ',
                    React.createElement(
                        'span',
                        {style: {fontSize: '0.8em', color: '#6c757d'}},
                        `(${questions.length})`
                    )
                ),
                questions.length === 0
                    ? React.createElement(
                        'div',
                        {
                            style: emptySectionStyle,
                            'data-testid': 'questions-empty',
                        },
                        'No questions in the system'
                    )
                    : React.createElement(
                        'div',
                        {
                            style: {maxHeight: '400px', overflowY: 'auto'},
                            'data-testid': 'questions-list',
                        },
                        questions.map((task, index) => renderTask(task, `question-${index}`))
                    )
            ),
            React.createElement(
                'div',
                {'data-testid': 'goals-section'},
                React.createElement(
                    'h2',
                    {style: sectionHeaderStyle('goals')},
                    'Goals ',
                    React.createElement(
                        'span',
                        {style: {fontSize: '0.8em', color: '#6c757d'}},
                        `(${goals.length})`
                    )
                ),
                goals.length === 0
                    ? React.createElement(
                        'div',
                        {
                            style: emptySectionStyle,
                            'data-testid': 'goals-empty',
                        },
                        'No goals in the system'
                    )
                    : React.createElement(
                        'div',
                        {
                            style: {maxHeight: '400px', overflowY: 'auto'},
                            'data-testid': 'goals-list',
                        },
                        goals.map((task, index) => renderTask(task, `goal-${index}`))
                    )
            )
        ),
        tasks.length > 0 &&
        React.createElement(
            'div',
            {style: totalTasksStyle, 'data-testid': 'total-tasks'},
            React.createElement('strong', null, 'Total Tasks:'),
            ' ',
            tasks.length
        )
    );
};

export default TaskMonitor;
