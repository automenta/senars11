import React from 'react';
import {Box, Text} from 'ink';

export const StatusBar = ({status}) => {
    const {
        isRunning = false,
        cycle = 0,
        mode = 'idle',
        view = 'vertical-split',
        taskCount = 0,
        logCount = 0,
        alerts = 0,
        connectionState = 'local'
    } = status || {};

    // Determine connection indicator
    const connectionIndicator = connectionState === 'remote' ? '🌐' : '💻';
    const connectionText = connectionState === 'remote' ? 'REMOTE' : 'LOCAL';

    // Determine view indicator
    const viewText = view === 'vertical-split' ? 'Split' :
        view === 'log-only' ? 'Log Only' :
            view === 'dynamic-grouping' ? 'Grouping' : 'Unknown';

    // Determine running indicator
    const runningIndicator = isRunning ? '🚀' : '⏸️';

    // Determine alert indicator
    const alertIndicator = alerts > 0 ? '⚠️' : '✅';

    return React.createElement(
        Box,
        {
            paddingX: 1,
            backgroundColor: 'blue',
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between'
        },
        React.createElement(
            Box,
            {flexDirection: 'row'},
            React.createElement(Text, {
                color: 'white',
                bold: true
            }, `${runningIndicator} ${connectionIndicator} ${connectionText} | `),
            React.createElement(Text, {color: 'white'}, `View: ${viewText} | `),
            React.createElement(Text, {color: 'white'}, `Cycles: ${cycle} | `),
            React.createElement(Text, {color: 'white'}, `Tasks: ${taskCount} | `),
            React.createElement(Text, {color: 'white'}, `Logs: ${logCount} | `),
            React.createElement(Text, {
                color: alerts > 0 ? 'red' : 'white',
                bold: alerts > 0
            }, `${alertIndicator} Alerts: ${alerts}`)
        ),
        React.createElement(
            Box,
            {flexDirection: 'row'},
            React.createElement(Text, {color: 'yellow'}, 'F1-Help | '),
            React.createElement(Text, {color: 'yellow'}, 'Ctrl+L/T/G-Views | '),
            React.createElement(Text, {color: 'yellow'}, 'Ctrl+C-Exit')
        )
    );
};
