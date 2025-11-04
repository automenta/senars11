export const extractDisplayProperties = (item, propertyList = ['id', 'term', 'type', 'timestamp']) =>
    propertyList.reduce((acc, prop) => {
        if (item[prop] !== undefined) acc[prop] = item[prop];
        return acc;
    }, {});

export const createDataDisplayElement = (React, item, options = {}) => {
    const {
        displayType = 'default',
        onClick = null,
        isCompact = false,
        showDetails = true
    } = options;

    const elementStyle = getDisplayStyles(displayType, isCompact);
    const content = createDisplayContent(React, item, displayType, showDetails);

    return React.createElement('div', {
        key: item.id || item.term || Date.now(),
        style: elementStyle,
        onClick
    }, ...content);
};

const getDisplayStyles = (displayType, isCompact) => {
    const typeSpecificStyles = {
        reasoningStep: {backgroundColor: '#f8f9ff', border: '1px solid #b8daff'},
        task: {backgroundColor: '#f0f8f0', border: '1px solid #c3e6c3'},
        default: {}
    };

    return {
        padding: isCompact ? '0.25rem 0.5rem' : '0.5rem',
        margin: '0.25rem 0',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '0.85rem',
        ...(isCompact && {padding: '0.25rem', fontSize: '0.75rem'}),
        ...typeSpecificStyles[displayType] || typeSpecificStyles.default
    };
};

const createDisplayContent = (React, item, displayType, showDetails) => {
    switch (displayType) {
        case 'reasoningStep':
            return [
                React.createElement('div', {style: {fontWeight: 'bold'}}, item.description || 'No description'),
                showDetails && item.result && React.createElement('div', {
                        style: {
                            fontSize: '0.8rem',
                            marginTop: '0.25rem'
                        }
                    },
                    `Result: ${item.result.substring(0, 100)}${item.result.length > 100 ? '...' : ''}`
                )
            ].filter(Boolean);

        case 'task':
            return [
                React.createElement('div', {style: {fontWeight: 'bold'}}, item.term || 'No term'),
                item.type && React.createElement('div', {
                    style: {
                        fontSize: '0.7rem',
                        color: '#666'
                    }
                }, `Type: ${item.type}`),
                showDetails && item.truth && React.createElement('div', {style: {fontSize: '0.75rem'}},
                    `Truth: ${JSON.stringify(item.truth)}`
                )
            ].filter(Boolean);

        default:
            return [React.createElement('div', null, item.description || item.term || 'Item')];
    }
};

export const createDataSummary = (data, summaryFields = ['count', 'types', 'timeRange']) => {
    const summary = {};

    if (summaryFields.includes('count')) {
        summary.count = data.length;
    }

    if (summaryFields.includes('types') && data.length > 0) {
        summary.types = [...new Set(data.map(item => item.type || 'unknown'))];
    }

    if (summaryFields.includes('timeRange') && data.length > 0) {
        const timestamps = data
            .map(item => item.timestamp || item.creationTime || Date.now())
            .filter(time => time !== undefined && time !== null);

        if (timestamps.length > 0) {
            summary.timeRange = {
                start: Math.min(...timestamps),
                end: Math.max(...timestamps),
                duration: Math.max(...timestamps) - Math.min(...timestamps)
            };
        }
    }

    return summary;
};