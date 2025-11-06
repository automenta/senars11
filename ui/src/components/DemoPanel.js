import React, {memo, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import {DataPanel} from './DataPanel.js';
import {createProgressBar} from '../utils/dashboardUtils.js';
import {themeUtils} from '../utils/themeUtils.js';

const DemoPanel = memo(() => {
    const demos = useUiStore(state => state.demos);
    const demoStates = useUiStore(state => state.demoStates);
    const wsService = useUiStore(state => state.wsService);

    // Helper function to send demo control commands
    const sendDemoControl = (demoId, command, parameters = {}) => {
        if (!wsService) {
            console.warn('WebSocket service not available. Demo control unavailable.');
            return;
        }

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
            payload: {command, demoId, parameters}
        });
    };

    const getStateColors = (state) => {
        switch (state) {
            case 'running':
                return {bg: '#e8f5e8', border: '#28a745'};
            case 'paused':
                return {bg: '#fff3cd', border: '#ffc107'};
            case 'completed':
                return {bg: '#d4edda', border: '#28a745'};
            case 'error':
                return {bg: '#f8d7da', border: '#dc3545'};
            default:
                return {bg: 'white', border: '#ddd'};
        }
    };

    const getButtonStyles = (isActive, isDisabled = false) => ({
        padding: '0.25rem 0.5rem',
        backgroundColor: isDisabled ? '#6c757d' : isActive ? '#28a745' : '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1
    });

    const DemoRow = memo(({demo}) => {
        const [expanded, setExpanded] = useState(false);
        const state = demoStates[demo.id] || {state: 'ready', progress: 0};
        const toggleExpanded = () => setExpanded(!expanded);
        const stateColors = getStateColors(state.state);

        return React.createElement('div',
            {
                style: {
                    padding: '0.75rem',
                    margin: '0.5rem 0',
                    backgroundColor: stateColors.bg,
                    border: `1px solid ${stateColors.border}`,
                    borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                    fontSize: themeUtils.get('FONTS.SIZE.SM')
                }
            },
            React.createElement('div', {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }
                },
                React.createElement('div', {style: {flex: 1}},
                    React.createElement('div', {
                            style: {
                                fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                                cursor: 'pointer'
                            }
                        },
                        React.createElement('span', {onClick: toggleExpanded},
                            expanded ? '▼ ' : '► '
                        ),
                        `${demo.name} (${state.state})`
                    ),
                    React.createElement('div', {
                            style: {
                                fontSize: themeUtils.get('FONTS.SIZE.XS'),
                                color: themeUtils.get('TEXT.SECONDARY'),
                                marginTop: '0.25rem'
                            }
                        },
                        demo.description
                    ),
                    // Show progress bar and additional info
                    React.createElement('div', null,
                        createProgressBar(React, {
                            percentage: state.progress || 0,
                            color: state.state === 'running' ? '#28a745' :
                                state.state === 'completed' ? '#28a745' :
                                    state.state === 'paused' ? '#ffc107' : '#007bff'
                        }),
                        state.progress && React.createElement('div', {
                                style: {
                                    fontSize: themeUtils.get('FONTS.SIZE.XXS'),
                                    marginTop: '0.25rem',
                                    color: themeUtils.get('TEXT.TERTIARY')
                                }
                            },
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
                        style: getButtonStyles(state.state !== 'running', state.state === 'running')
                    }, 'Start'),
                    React.createElement('button', {
                        onClick: () => sendDemoControl(demo.id, 'pause'),
                        disabled: state.state !== 'running',
                        style: getButtonStyles(state.state === 'paused', state.state !== 'running')
                    }, 'Pause'),
                    React.createElement('button', {
                        onClick: () => sendDemoControl(demo.id, 'resume'),
                        disabled: state.state !== 'paused',
                        style: getButtonStyles(state.state === 'running', state.state !== 'paused')
                    }, 'Resume'),
                    React.createElement('button', {
                        onClick: () => sendDemoControl(demo.id, 'stop'),
                        style: getButtonStyles(true)
                    }, 'Stop')
                )
            ),
            expanded && React.createElement('div', {
                    style: {
                        marginTop: '0.5rem',
                        paddingTop: '0.5rem',
                        borderTop: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
                    }
                },
                demo.parameters && demo.parameters.length > 0
                    ? React.createElement('div', null,
                        React.createElement('div', {
                            style: {
                                fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                                marginBottom: '0.5rem'
                            }
                        }, 'Parameters:'),
                        demo.parameters.map(param =>
                            React.createElement('div', {
                                    key: param.name,
                                    style: {marginBottom: '0.25rem', display: 'flex', alignItems: 'center'}
                                },
                                React.createElement('label', {
                                    style: {
                                        width: '150px',
                                        fontSize: themeUtils.get('FONTS.SIZE.XS')
                                    }
                                }, param.name),
                                React.createElement('input', {
                                    type: 'number',
                                    defaultValue: param.defaultValue,
                                    placeholder: param.description,
                                    onChange: (e) => {
                                        // This would require more complex state management to capture parameter changes
                                        // For now, we'll just show the parameters
                                    },
                                    style: {
                                        flex: 1,
                                        padding: '0.25rem',
                                        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                                        borderRadius: themeUtils.get('BORDERS.RADIUS.XS')
                                    }
                                })
                            )
                        )
                    )
                    : React.createElement('div', {
                        style: {
                            fontSize: themeUtils.get('FONTS.SIZE.XS'),
                            color: themeUtils.get('TEXT.MUTED')
                        }
                    }, 'No configurable parameters')
            )
        );
    });

    const renderDemo = (demo) => React.createElement(DemoRow, {demo});

    return React.createElement(DataPanel, {
        title: 'Demos',
        dataSource: () => demos,
        renderItem: renderDemo,
        config: {
            itemLabel: 'demos',
            showItemCount: true,
            emptyMessage: 'No demos available. The server will send a list of available demos.',
            containerHeight: 400
        }
    });
});

export default DemoPanel;