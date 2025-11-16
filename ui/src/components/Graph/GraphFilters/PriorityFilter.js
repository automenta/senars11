import React from 'react';

const PriorityFilter = ({
                            priorityRange,
                            onPriorityChange
                        }) => {
    return React.createElement('div', {
            style: {
                padding: '10px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #ddd',
                marginBottom: '10px'
            }
        },
        React.createElement('h4', null, 'Priority Filter'),
        React.createElement('div', null,
            React.createElement('label', null,
                `Min: ${priorityRange.min.toFixed(2)}`
            ),
            React.createElement('input', {
                type: "range",
                min: "0",
                max: "1",
                step: "0.01",
                value: priorityRange.min,
                onChange: (e) => onPriorityChange({...priorityRange, min: parseFloat(e.target.value)}),
                style: {width: '100%', marginBottom: '5px'}
            })
        ),
        React.createElement('div', null,
            React.createElement('label', null,
                `Max: ${priorityRange.max.toFixed(2)}`
            ),
            React.createElement('input', {
                type: "range",
                min: "0",
                max: "1",
                step: "0.01",
                value: priorityRange.max,
                onChange: (e) => onPriorityChange({...priorityRange, max: parseFloat(e.target.value)}),
                style: {width: '100%'}
            })
        )
    );
};

export default PriorityFilter;