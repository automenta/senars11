import React from 'react';
import {Box, Text} from 'ink';

// Define log types and their visual representation
export const LOG_TYPES = {
    error: {color: 'red', symbol: '❌'},
    warn: {color: 'yellow', symbol: '⚠️'},
    warning: {color: 'yellow', symbol: '⚠️'},
    success: {color: 'green', symbol: '✅'},
    debug: {color: 'blue', symbol: '🔬'},
    info: {color: 'white', symbol: 'ℹ️'},
    agent: {color: 'cyan', symbol: '🤖'},
    tool: {color: 'magenta', symbol: '🔧'},
    result: {color: 'gray', symbol: '📎'},
};

// Format log entry with color coding
export const LogEntry = ({log}) => {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();

    // Check if it's a rich view model log
    if (log.title) {
        return React.createElement(
            Box,
            {flexDirection: 'column', marginBottom: 0},
            React.createElement(
                Box,
                {flexDirection: 'row'},
                React.createElement(Text, {
                    color: log.color,
                    bold: true
                }, `${log.icon || '•'} [${timestamp}] ${log.title}: `),
                React.createElement(Text, {color: log.color}, log.subtitle || '')
            ),
            log.details ? React.createElement(Text, {color: 'gray', dimColor: true, marginLeft: 2}, log.details) : null
        );
    }

    // Legacy support
    const {color, symbol} = LOG_TYPES[log.type] ?? LOG_TYPES.info;
    return React.createElement(
        Box,
        {flexDirection: 'row'},
        React.createElement(
            Text,
            {color},
            `${symbol} [${timestamp}] ${log.message}`
        )
    );
};
