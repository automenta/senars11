import React, { useState, useEffect } from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import knowledgeInference from '../utils/knowledgeInference.js';
import adaptiveDemoEngine from '../utils/adaptiveDemoEngine.js';
import educationalContent from '../utils/educationalContent.js';
import interactionTracker from '../utils/interactionTracker.js';

const DemoPanel = () => {
    const demos = useUiStore(state => state.demos);
    const demoStates = useUiStore(state => state.demoStates);
    const wsService = useUiStore(state => state.wsService);
    const currentKnowledgeLevel = useUiStore(state => state.currentKnowledgeLevel);
    const demoRecommendations = useUiStore(state => state.demoRecommendations);
    const [recommendedDemo, setRecommendedDemo] = useState(null);
    
    // Update recommended demo when recommendations change
    useEffect(() => {
        if (demoRecommendations && demoRecommendations.nextRecommended) {
            setRecommendedDemo(demoRecommendations.nextRecommended);
        }
    }, [demoRecommendations]);

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
                
                // Track demo start for viewer analytics
                interactionTracker.trackDemoStart(demoId);
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

    // Function to get adapted parameters for a demo
    const getAdaptedParameters = (demoId, baseParams = {}) => {
        return adaptiveDemoEngine.adaptDemoParameters(demoId, baseParams);
    };

    // Function to get suggested pace for a demo
    const getSuggestedPace = (demoId) => {
        return adaptiveDemoEngine.adaptDemoPace(demoId);
    };

    // Function to handle demo completion tracking
    const handleDemoCompletion = (demoId, completed) => {
        interactionTracker.trackDemoCompletion(demoId, completed);
    };

    // Function to get adaptation suggestions
    const getAdaptationSuggestions = (demoId) => {
        return adaptiveDemoEngine.getAdaptationSuggestions(demoId) || [];
    };

    const DemoRow = ({ demo }) => {
        const [expanded, setExpanded] = useState(false);
        const [showEducationalTip, setShowEducationalTip] = useState(false);
        const state = demoStates[demo.id] || { state: 'ready', progress: 0 };
        
        // Get adaptation suggestions for this demo
        const adaptationSuggestions = getAdaptationSuggestions(demo.id);
        const hasUrgentSuggestions = adaptationSuggestions.some(s => s.type === 'switch');

        const toggleExpanded = () => setExpanded(!expanded);

        // Check if this demo matches the recommended one
        const isRecommended = recommendedDemo && recommendedDemo.id === demo.id;
        const isBeginner = (currentKnowledgeLevel || knowledgeInference.inferKnowledgeLevel()) === 'beginner';

        return React.createElement('div',
            {
                key: demo.id,
                style: {
                    padding: '0.75rem',
                    margin: '0.5rem 0',
                    backgroundColor: state.state === 'running' ? '#e8f5e8' : 
                                    state.state === 'paused' ? '#fff3cd' : 
                                    state.state === 'completed' ? '#d4edda' :
                                    state.state === 'error' ? '#f8d7da' : 
                                    isRecommended ? '#e7f3ff' : 'white',
                    border: `1px solid ${state.state === 'running' ? '#28a745' : 
                                state.state === 'paused' ? '#ffc107' : 
                                state.state === 'completed' ? '#28a745' :
                                state.state === 'error' ? '#dc3545' : 
                                isRecommended ? '#007bff' : '#ddd'}`,
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    position: 'relative'
                }
            },
            isRecommended && React.createElement('div', {
                style: {
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    backgroundColor: '#007bff',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '0 0 0 4px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                }
            }, 'Recommended'),
            React.createElement('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center'}},
                React.createElement('div', {style: {flex: 1}},
                    React.createElement('div', {style: {fontWeight: 'bold', cursor: 'pointer'}},
                        React.createElement('span', {onClick: toggleExpanded}, 
                            expanded ? '▼ ' : '► '
                        ),
                        `${demo.name} (${state.state})`,
                        isRecommended && React.createElement('span', {
                            style: {color: '#007bff', fontSize: '0.8em', marginLeft: '5px'}
                        }, ' • Recommended')
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
                    ),
                    // Show adaptation suggestions if any
                    adaptationSuggestions.length > 0 && React.createElement('div', {
                        style: {
                            marginTop: '5px',
                            padding: '5px',
                            backgroundColor: hasUrgentSuggestions ? '#fff3cd' : '#f8f9fa',
                            border: `1px solid ${hasUrgentSuggestions ? '#ffc107' : '#dee2e6'}`,
                            borderRadius: '3px',
                            fontSize: '0.7rem'
                        }
                    }, 
                        React.createElement('div', {style: {fontWeight: 'bold', marginBottom: '2px'}}, 'Suggestions:'),
                        React.createElement('ul', {style: {margin: '2px 0', padding: '0 0 0 15px'}},
                            adaptationSuggestions.map((suggestion, idx) => 
                                React.createElement('li', {key: idx}, 
                                    `${suggestion.action}: ${suggestion.reason}`
                                )
                            )
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
                            
                            // Get adapted parameters based on viewer state
                            const adaptedParams = getAdaptedParameters(demo.id, demo.parameters || {});
                            
                            sendDemoControl(demo.id, 'start', adaptedParams);
                        },
                        disabled: state.state === 'running',
                        style: {
                            padding: '0.25rem 0.5rem',
                            backgroundColor: state.state === 'running' ? '#6c757d' : 
                                           isRecommended ? '#007bff' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: state.state === 'running' ? 'not-allowed' : 'pointer'
                        }
                    }, isRecommended ? 'Start Recommended' : 'Start'),
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
                        onClick: () => {
                            sendDemoControl(demo.id, 'stop');
                            handleDemoCompletion(demo.id, state.state === 'completed');
                        },
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
                React.createElement('div', {style: {display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}},
                    React.createElement('div', {style: {fontWeight: 'bold'}}, 'Parameters:'),
                    React.createElement('button', {
                        onClick: () => setShowEducationalTip(!showEducationalTip),
                        style: {
                            fontSize: '0.8rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '3px',
                            cursor: 'pointer'
                        }
                    }, showEducationalTip ? 'Hide Info' : 'Show Info')
                ),
                showEducationalTip && React.createElement('div', {
                    style: {
                        marginBottom: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        fontSize: '0.8rem'
                    }
                }, 
                    React.createElement('div', {style: {fontWeight: 'bold', marginBottom: '0.25rem'}}, 'About this demo:'),
                    React.createElement('div', null, 
                        educationalContent.getContextualExplanation(demo.id, currentKnowledgeLevel || 'beginner').fullContent
                    )
                ),
                demo.parameters && demo.parameters.length > 0
                    ? React.createElement('div', null,
                        demo.parameters.map(param => 
                            React.createElement('div', {key: param.name, style: {marginBottom: '0.25rem', display: 'flex', alignItems: 'center'}},
                                React.createElement('label', {style: {width: '150px', fontSize: '0.8rem'}}, 
                                    param.name + 
                                    (param.range ? ` (${param.range.min}-${param.range.max})` : '')
                                ),
                                React.createElement('input', {
                                    type: 'range',
                                    min: param.range ? param.range.min : 0,
                                    max: param.range ? param.range.max : 100,
                                    defaultValue: param.defaultValue || 50,
                                    onChange: (e) => {
                                        // Update adapted parameters in real-time
                                        console.log(`Parameter ${param.name} changed to:`, e.target.value);
                                    },
                                    style: {flex: 1, padding: '0.25rem', marginRight: '0.5rem'}
                                }),
                                React.createElement('span', {style: {fontSize: '0.8rem', width: '40px'}}, 
                                    param.defaultValue || 50
                                )
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

    // Show recommended demo section if available
    const showRecommendedSection = recommendedDemo && demos.some(d => d.id !== recommendedDemo.id);

    return React.createElement('div', null,
        // Recommended demo quick action
        showRecommendedSection && React.createElement('div', {
            style: {
                padding: '10px',
                marginBottom: '10px',
                backgroundColor: '#e7f3ff',
                border: '1px solid #007bff',
                borderRadius: '5px'
            }
        },
            React.createElement('h4', {style: {margin: '0 0 10px 0', color: '#007bff'}}, 'Recommended for You'),
            React.createElement('p', {style: {margin: '0 0 10px 0', fontSize: '0.9rem'}}, 
                `Based on your interaction patterns, we recommend: "${recommendedDemo.name}"`
            ),
            React.createElement('p', {style: {margin: '0 0 10px 0', fontSize: '0.8rem', color: '#666'}}, 
                recommendedDemo.description
            ),
            React.createElement('button', {
                onClick: () => {
                    const adaptedParams = getAdaptedParameters(recommendedDemo.id, recommendedDemo.parameters || {});
                    sendDemoControl(recommendedDemo.id, 'start', adaptedParams);
                },
                style: {
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                }
            }, 'Start Recommended Demo')
        ),
        React.createElement(GenericPanel, {
            title: 'Demos',
            items,
            renderItem: renderDemo,
            maxHeight: 'calc(100% - 2rem)',
            emptyMessage: 'No demos available. The server will send a list of available demos.',
            showCount: true
        })
    );
};

export default DemoPanel;