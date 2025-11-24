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
    const {color, symbol} = LOG_TYPES[log.type] ?? LOG_TYPES.info;
    const timestamp = new Date(log.timestamp).toLocaleTimeString();

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
