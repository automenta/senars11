import React, {useState} from 'react';
import {Box, Text} from 'ink';

export const LogViewer = ({logs = []}) => {
    const [filter, setFilter] = useState('all'); // 'all', 'error', 'warn', 'info', 'debug'
    const [showTimestamp, setShowTimestamp] = useState(true);
    const [maxScrollback, setMaxScrollback] = useState(1000);

    // Filter logs based on the selected filter
    const filteredLogs = React.useMemo(() => {
        let result = logs;

        // Apply scrollback limit
        if (result.length > maxScrollback) {
            result = result.slice(-maxScrollback);
        }

        // Apply filter
        if (filter !== 'all') {
            result = result.filter(log => {
                const message = log.message.toLowerCase();
                switch (filter) {
                    case 'error':
                        return message.includes('error') || message.includes('❌');
                    case 'warn':
                        return message.includes('warn') || message.includes('⚠️');
                    case 'info':
                        return message.includes('info') || message.includes('ℹ️');
                    case 'debug':
                        return message.includes('debug') || message.includes('🔬');
                    default:
                        return true;
                }
            });
        }

        return result;
    }, [logs, filter, maxScrollback]);

    // Format log entry with color coding
    const formatLogEntry = (log, index) => {
        let color = 'white';
        let symbol = 'ℹ️';

        const message = log.message.toLowerCase();
        if (message.includes('error') || message.includes('❌')) {
            color = 'red';
            symbol = '❌';
        } else if (message.includes('warn') || message.includes('⚠️')) {
            color = 'yellow';
            symbol = '⚠️';
        } else if (message.includes('debug') || message.includes('🔬')) {
            color = 'blue';
            symbol = '🔬';
        } else if (message.includes('success') || message.includes('✅')) {
            color = 'green';
            symbol = '✅';
        }

        const timestamp = showTimestamp ? `[${new Date(log.timestamp || Date.now()).toLocaleTimeString()}] ` : '';

        return React.createElement(
            Text,
            {key: log.id || `log-${index}`, color},
            `${timestamp}${symbol} ${log.message}`
        );
    };

    return React.createElement(
        Box,
        {flexDirection: 'column', padding: 1, flexGrow: 1, borderStyle: 'round'},
        React.createElement(
            Box,
            {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1},
            React.createElement(Text, {bold: true, color: 'cyan'}, `Logs (${filteredLogs.length})`),
            React.createElement(
                Box,
                {flexDirection: 'row'},
                React.createElement(Text, {color: filter === 'all' ? 'yellow' : 'gray'}, '[A]'),
                React.createElement(Text, {marginLeft: 1, color: filter === 'error' ? 'red' : 'gray'}, '[E]'),
                React.createElement(Text, {marginLeft: 1, color: filter === 'warn' ? 'yellow' : 'gray'}, '[W]'),
                React.createElement(Text, {marginLeft: 1, color: filter === 'info' ? 'cyan' : 'gray'}, '[I]'),
                React.createElement(Text, {marginLeft: 1, color: filter === 'debug' ? 'blue' : 'gray'}, '[D]')
            )
        ),
        ...filteredLogs.map((log, index) => formatLogEntry(log, index)),
        React.createElement(
            Box,
            {marginTop: 1, flexDirection: 'row', justifyContent: 'space-between'},
            React.createElement(Text, {color: 'gray', size: 11}, `Max: ${maxScrollback}`),
            React.createElement(Text, {
                color: 'gray',
                size: 11
            }, `${Math.min(100, Math.round((logs.length / maxScrollback) * 100))}%`)
        )
    );
};
