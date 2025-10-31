import React, { useState } from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

const DemoPanel = () => {
    const demos = useUiStore(state => state.demos);
    const demoStates = useUiStore(state => state.demoStates);
    const wsService = useUiStore(state => state.wsService);
    
    // Helper function to send demo control commands
    const sendDemoControl = (demoId, command, parameters = {}) => {
        if (wsService) {
            // When starting a demo, also trigger data generation for other panels
            if (command === 'start') {
                // Send a system command to ensure other panels have data during demo
                wsService.sendMessage({
                    type: 'systemCommand',
                    payload: {
                        command: 'ensurePanelActivity',
                        panels: ['ConceptPanel', 'TaskPanel', 'PriorityHistogramPanel']
                    }
                });
            }
            
            wsService.sendMessage({
                type: 'demoControl',
                payload: {
                    command,
                    demoId,
                    parameters
                }
            });
        } else {
            console.warn('WebSocket service not available. Demo control unavailable.');
        }
    };

    const DemoRow = ({ demo }) => {
        const [expanded, setExpanded] = useState(false);
        const state = demoStates[demo.id] || { state: 'ready', progress: 0 };

        const toggleExpanded = () => setExpanded(!expanded);

        return React.createElement('div',
            {
                key: demo.id,
                style: {
                    padding: '0.75rem',
                    margin: '0.5rem 0',
                    backgroundColor: state.state === 'running' ? '#e8f5e8' : 
                                    state.state === 'paused' ? '#fff3cd' : 
                                    state.state === 'completed' ? '#d4edda' :
                                    state.state === 'error' ? '#f8d7da' : 'white',
                    border: `1px solid ${state.state === 'running' ? '#28a745' : 
                                state.state === 'paused' ? '#ffc107' : 
                                state.state === 'completed' ? '#28a745' :
                                state.state === 'error' ? '#dc3545' : '#ddd'}`,
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                }
            },
            React.createElement('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center'}},
                React.createElement('div', {style: {flex: 1}},
                    React.createElement('div', {style: {fontWeight: 'bold', cursor: 'pointer'}},
                        React.createElement('span', {onClick: toggleExpanded}, 
                            expanded ? '▼ ' : '► '
                        ),
                        `${demo.name} (${state.state})`
                    ),
                    React.createElement('div', {style: {fontSize: '0.8rem', color: '#666', marginTop: '0.25rem'}},
                        demo.description
                    ),
                    // Show progress bar and additional info
                    React.createElement('div', null,
                        React.createElement('div', {style: {height: '10px', width: '100%', backgroundColor: '#e0e0e0', borderRadius: '5px', marginTop: '0.25rem', overflow: 'hidden'}},
                            React.createElement('div', {
                                style: {
                                    height: '100%',
                                    width: `${state.progress || 0}%`,
                                    backgroundColor: state.state === 'running' ? '#28a745' : 
                                                   state.state === 'completed' ? '#28a745' : 
                                                   state.state === 'paused' ? '#ffc107' : '#007bff',
                                    transition: 'width 0.3s ease'
                                }
                            })
                        ),
                        state.progress && React.createElement('div', {style: {fontSize: '0.7rem', marginTop: '0.25rem', color: '#555'}},
                            `${state.progress}% complete, Step: ${state.currentStep || 0}`
                        )
                    )
                ),
                React.createElement('div', {style: {display: 'flex', gap: '0.25rem'}},
                    React.createElement('button', {
                        onClick: () => {
                            // First ensure other panels are activated, then start demo
                            if (wsService) {
                                // Highlight relevant panels during demo
                                wsService.sendMessage({
                                    type: 'panelCommand',
                                    payload: {
                                        command: 'activateVisualization',
                                        panels: ['ConceptPanel', 'TaskPanel', 'PriorityHistogramPanel'],
                                        demoId: demo.id
                                    }
                                });
                            }
                            sendDemoControl(demo.id, 'start');
                        },
                        disabled: state.state === 'running',
                        style: {
                            padding: '0.25rem 0.5rem',
                            backgroundColor: state.state === 'running' ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: state.state === 'running' ? 'not-allowed' : 'pointer'
                        }
                    }, 'Start'),
                    React.createElement('button', {
                        onClick: () => sendDemoControl(demo.id, 'pause'),
                        disabled: state.state !== 'running',
                        style: {
                            padding: '0.25rem 0.5rem',
                            backgroundColor: state.state === 'paused' ? '#ffc107' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: state.state !== 'running' ? 'not-allowed' : 'pointer'
                        }
                    }, 'Pause'),
                    React.createElement('button', {
                        onClick: () => sendDemoControl(demo.id, 'resume'),
                        disabled: state.state !== 'paused',
                        style: {
                            padding: '0.25rem 0.5rem',
                            backgroundColor: state.state === 'paused' ? '#28a745' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: state.state !== 'paused' ? 'not-allowed' : 'pointer'
                        }
                    }, 'Resume'),
                    React.createElement('button', {
                        onClick: () => sendDemoControl(demo.id, 'stop'),
                        style: {
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                        }
                    }, 'Stop')
                )
            ),
            expanded && React.createElement('div', {style: {marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #eee'}},
                demo.parameters && demo.parameters.length > 0
                    ? React.createElement('div', null,
                        React.createElement('div', {style: {fontWeight: 'bold', marginBottom: '0.5rem'}}, 'Parameters:'),
                        demo.parameters.map(param => 
                            React.createElement('div', {key: param.name, style: {marginBottom: '0.25rem', display: 'flex', alignItems: 'center'}},
                                React.createElement('label', {style: {width: '150px', fontSize: '0.8rem'}}, param.name),
                                React.createElement('input', {
                                    type: 'number',
                                    defaultValue: param.defaultValue,
                                    placeholder: param.description,
                                    onChange: (e) => {
                                        // This would require more complex state management to capture parameter changes
                                        // For now, we'll just show the parameters
                                    },
                                    style: {flex: 1, padding: '0.25rem', border: '1px solid #ccc', borderRadius: '3px'}
                                })
                            )
                        )
                    )
                    : React.createElement('div', {style: {fontSize: '0.8rem', color: '#888'}}, 'No configurable parameters')
            )
        );
    };

    const items = demos.map(demo => ({ id: demo.id, demo }));

    const renderDemo = (item, index) => 
        React.createElement(DemoRow, { demo: item.demo });

    return React.createElement(GenericPanel, {
        title: 'Demos',
        items,
        renderItem: renderDemo,
        maxHeight: 'calc(100% - 2rem)',
        emptyMessage: 'No demos available. The server will send a list of available demos.',
        showCount: true
    });
};

export default DemoPanel;