import React, {useEffect, useState} from 'react';
import {Button, ScrollArea, Text, TextInput, View, Window} from '@nodegui/react-nodegui';
import {GraphPanel} from './GraphPanel.js';
import {useStore} from './store.js';
import {getConnectionStatus, requestSnapshot, sendNARCommand} from './nar-service.js';

const containerStyle = {
    flex: 1,
    flexDirection: 'column',
};

const barStyle = {
    height: 60,
    padding: 8,
    background: '#2d2d2d',
    flexDirection: 'column',
};

const logStyle = {
    padding: 8,
    background: '#1e1e1e',
    color: '#dcdcdc',
    fontSize: 12,
};

const logEntryStyle = {
    color: '#dcdcdc',
    fontSize: 11,
    marginBottom: 2
};

export function App() {
    const {live, toggleLive, log} = useStore();
    const [command, setCommand] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('initializing');

    // Update connection status periodically
    useEffect(() => {
        const updateStatus = () => {
            const status = getConnectionStatus();
            setConnectionStatus(status.initialized ? 'Ready (Direct NAR)' : 'Initializing...');
        };

        updateStatus();  // Call immediately
        const interval = setInterval(updateStatus, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleRefreshClick = () => {
        requestSnapshot();
    };

    const handleLiveToggle = () => {
        toggleLive();
    };

    const handleCommandSubmit = () => {
        if (command.trim() !== '') {
            // Send the command to the embedded NAR
            const success = sendNARCommand(command.trim());
            if (success) {
                setCommand(''); // Clear command only if sent successfully
            }
        }
    };

    // Handle text input change
    const handleCommandChange = (text) => {
        setCommand(text);
    };

    // Handle Enter key press in the command input
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            handleCommandSubmit();
        }
    };

    return React.createElement(Window, {
            style: {flex: 1},
            windowTitle: "SeNARS (NodeGUI)",
            minimumWidth: 1200,
            minimumHeight: 800
        },
        React.createElement(View, {style: containerStyle},
            React.createElement(View, {style: barStyle},
                React.createElement(View, {style: {flexDirection: 'row', marginBottom: 8}},
                    React.createElement(Button, {
                        text: "Refresh",
                        on: {clicked: handleRefreshClick}
                    }),
                    React.createElement(Button, {
                        text: live ? 'Live: ON' : 'Live: OFF',
                        on: {clicked: handleLiveToggle},
                        style: {marginLeft: 8}
                    }),
                    React.createElement(Text, {
                        text: `Status: ${connectionStatus}`,
                        style: {marginLeft: 8, alignSelf: 'center', color: '#9cdcfe'}
                    })
                ),
                React.createElement(View, {style: {flexDirection: 'row'}},
                    React.createElement(TextInput, {
                        placeholder: "Enter NARs command...",
                        text: command,
                        on: {
                            textChanged: handleCommandChange,
                            returnPressed: handleCommandSubmit  // This handles Enter key
                        },
                        style: {flex: 1}
                    }),
                    React.createElement(Button, {
                        text: "Send",
                        on: {clicked: handleCommandSubmit},
                        style: {marginLeft: 8}
                    })
                )
            ),
            React.createElement(View, {style: {flex: 1, flexDirection: 'row'}},
                React.createElement(GraphPanel, {style: {flex: 1}}),
                React.createElement(View, {style: {width: 300, background: '#252526'}},
                    React.createElement(Text, {style: logStyle}, "Log:"),
                    React.createElement(ScrollArea, {style: {flex: 1}},
                        React.createElement(View, null,
                            log.length > 0 ? log.map((entry, index) => {
                                const timeStr = new Date(entry.timestamp).toLocaleTimeString();
                                let prefix = '';
                                let color = '#dcdcdc';

                                if (entry.type === 'command') {
                                    prefix = 'CMD: ';
                                    color = '#4ec9b0'; // Green for commands
                                } else if (entry.type === 'error') {
                                    prefix = 'ERR: ';
                                    color = '#f48771'; // Red for errors
                                } else if (entry.type === 'status') {
                                    prefix = 'STS: ';
                                    color = '#9cdcfe'; // Blue for status
                                } else if (entry.type === 'response') {
                                    prefix = 'RSP: ';
                                    color = '#d7ba7d'; // Yellow for responses
                                } else if (entry.type === 'task') {
                                    prefix = 'TK: ';
                                    color = '#ce9178'; // Orange for tasks
                                } else {
                                    prefix = 'MSG: ';
                                }

                                const msg = entry.command || entry.message || JSON.stringify(entry);

                                return React.createElement(Text, {
                                        key: index,
                                        style: {...logEntryStyle, color: color}
                                    },
                                    `[${timeStr}] ${prefix}${msg}`
                                );
                            }) : React.createElement(Text, {style: logEntryStyle}, "No logs yet...")
                        )
                    )
                )
            )
        )
    );
}