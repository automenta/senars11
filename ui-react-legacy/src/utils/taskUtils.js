const taskColorConfig = {
    'question': {bg: '#e7f3ff', border: '#b8daff'},
    'goal': {bg: '#fff3cd', border: '#ffeaa7'},
    'belief': {bg: '#e8f5e8', border: '#a3d9a5'}
};

const getTaskColors = (taskType) => {
    if (!taskType) return {bg: '#ffffff', border: '#ddd'};
    const lowerType = taskType.toLowerCase();
    return taskColorConfig[lowerType] || {bg: '#ffffff', border: '#ddd'};
};

export const getTaskColor = (taskType) => getTaskColors(taskType).bg;

export const getTaskBorderColor = (taskType) => getTaskColors(taskType).border;

export const getRelationshipColor = (relationshipType) => {
    const colorMap = {
        'dependency': '#28a745',
        'influences': '#007bff',
        'default': '#ffc107'
    };

    return colorMap[relationshipType] || colorMap.default;
};

export const getTaskText = (taskTerm, maxLength = 10) => {
    return taskTerm && taskTerm.length > maxLength
        ? taskTerm.substring(0, maxLength) + '...'
        : taskTerm || 'Task';
};

export const createTaskDisplayElement = (React, task, options = {}) => {
    const {
        showTruth = true,
        showBudget = true,
        showTime = true,
        onClick = null,
        isExpanded = false,
        className = '',
        includeExpandToggle = true
    } = options;

    const {bg: taskColor, border: taskBorderColor} = getTaskColors(task.type);

    const content = [
        React.createElement('div', {
                style: {
                    fontWeight: 'bold',
                    display: 'flex',
                    justifyContent: 'space-between',
                    cursor: onClick ? 'pointer' : 'default'
                },
                onClick: onClick
            },
            React.createElement('span', null, task.term || 'No term'),
            React.createElement('div', {style: {display: 'flex', gap: '0.5rem'}},
                React.createElement('span', {style: {fontSize: '0.75rem', color: '#666'}}, task.type || 'Unknown')
            )
        )
    ];

    if (isExpanded) {
        const expandedContent = [];

        if (showTruth && task.truth) {
            expandedContent.push(
                React.createElement('div', {style: {fontSize: '0.8rem', marginTop: '0.25rem'}},
                    `Truth: ${JSON.stringify(task.truth)}`
                )
            );
        }

        if (showBudget && task.budget) {
            expandedContent.push(
                React.createElement('div', {style: {fontSize: '0.8rem'}},
                    `Budget: Priority ${task.budget.priority?.toFixed(3) || 0}, Durability ${task.budget.durability?.toFixed(3) || 0}`
                )
            );
        }

        if (showTime && task.occurrenceTime) {
            expandedContent.push(
                React.createElement('div', {style: {fontSize: '0.7rem', color: '#666', marginTop: '0.25rem'}},
                    `Time: ${new Date(task.occurrenceTime).toLocaleTimeString()}`
                )
            );
        }

        content.push(...expandedContent);
    }

    return React.createElement('div',
        {
            className: className,
            style: {
                padding: '0.5rem',
                margin: '0.25rem 0',
                backgroundColor: taskColor,
                border: `1px solid ${taskBorderColor}`,
                borderRadius: '4px',
                fontSize: '0.85rem'
            }
        },
        ...content
    );
};

export const commonFilterOptions = [
    {value: 'all', label: 'All Events'},
    {value: 'reasoningStep', label: 'Reasoning Steps'},
    {value: 'task', label: 'Tasks'}
];

export const createFilterControls = (React, props) => {
    const {
        filterType,
        setFilterType,
        filterText,
        setFilterText,
        exportFormat,
        setExportFormat,
        exportData,
        filterOptions = commonFilterOptions,
        showExport = true
    } = props;

    const containerStyle = {
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '0.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        flexWrap: 'wrap'
    };

    const columnStyle = {flex: 1, minWidth: '150px'};

    const labelStyle = {display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem'};

    const inputStyle = {
        width: '100%',
        padding: '0.25rem',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '0.9rem'
    };

    const exportColumnStyle = {flex: 0.5, minWidth: '100px', display: 'flex', alignItems: 'flex-end'};

    const exportButtonStyle = {
        width: '100%',
        padding: '0.5rem',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '0.9rem',
        cursor: 'pointer'
    };

    return React.createElement('div', {style: containerStyle},
        React.createElement('div', {style: columnStyle},
            React.createElement('label', {style: labelStyle}, 'Filter by Type:'),
            React.createElement('select', {
                    value: filterType,
                    onChange: (e) => setFilterType(e.target.value),
                    style: inputStyle
                },
                filterOptions.map(opt =>
                    React.createElement('option', {key: opt.value, value: opt.value}, opt.label)
                )
            )
        ),
        React.createElement('div', {style: columnStyle},
            React.createElement('label', {style: labelStyle}, 'Search:'),
            React.createElement('input', {
                type: 'text',
                value: filterText,
                onChange: (e) => setFilterText(e.target.value),
                placeholder: 'Search in events...',
                style: inputStyle
            })
        ),
        showExport && React.createElement('div', {style: columnStyle},
            React.createElement('label', {style: labelStyle}, 'Export Format:'),
            React.createElement('select', {
                    value: exportFormat,
                    onChange: (e) => setExportFormat(e.target.value),
                    style: inputStyle
                },
                React.createElement('option', {value: 'json'}, 'JSON'),
                React.createElement('option', {value: 'csv'}, 'CSV'),
                React.createElement('option', {value: 'text'}, 'Text')
            )
        ),
        showExport && React.createElement('div', {style: exportColumnStyle},
            React.createElement('button', {
                onClick: exportData,
                style: exportButtonStyle
            }, 'Export')
        )
    );
};