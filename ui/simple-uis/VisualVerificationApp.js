import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import WebSocketStatus from './WebSocketStatus.js';
import DemoRunner from './DemoRunner.js';
import NarseseInput from './NarseseInput.js';
import TaskMonitor from './TaskMonitor.js';

// Visual verification test harness for Senars UI components
const VisualVerificationApp = () => {
    const [currentView, setCurrentView] = useState('all'); // Default to showing all views
    const [testMode, setTestMode] = useState(false); // Flag to simulate test environment

    // Views configuration
    const views = {
        all: {name: 'All Components', component: null},
        status: {name: 'WebSocket Status', component: WebSocketStatus},
        demos: {name: 'Demo Runner', component: DemoRunner},
        input: {name: 'Narsese Input', component: NarseseInput},
        tasks: {name: 'Task Monitor', component: TaskMonitor},
    };

    // Test controls
    const triggerTestActions = () => {
        if (typeof window !== 'undefined' && window.wsService) {
            // Simulate various WebSocket messages for visual verification
            window.wsService.sendMessage({
                type: 'systemMetrics',
                payload: {
                    wsConnected: true,
                    cpu: Math.random() * 100,
                    memory: Math.random() * 100,
                    activeTasks: Math.floor(Math.random() * 20),
                    reasoningSpeed: Math.floor(Math.random() * 1000),
                },
            });

            window.wsService.sendMessage({
                type: 'demoList',
                payload: [
                    {id: 'demo1', name: 'Test Demo 1', description: 'First test demonstration'},
                    {id: 'demo2', name: 'Test Demo 2', description: 'Second test demonstration'},
                    {id: 'demo3', name: 'Test Demo 3', description: 'Third test demonstration'},
                ],
            });

            window.wsService.sendMessage({
                type: 'taskUpdate',
                payload: {
                    id: `task_${Date.now()}`,
                    content: `<test --> concept> ${Math.random() > 0.5 ? '.' : '?'}`,
                    priority: Math.random(),
                    creationTime: Date.now(),
                    type: Math.random() > 0.7 ? 'goal' : Math.random() > 0.5 ? 'question' : 'belief',
                },
            });

            // Add notification
            window.wsService.sendMessage({
                type: 'notification',
                payload: {
                    type: 'success',
                    title: 'Test Notification',
                    message: 'Visual verification action completed',
                    timestamp: Date.now(),
                },
            });
        }
    };

    return React.createElement('div',
        {
            style: {
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#f8f9fa',
                minHeight: '100vh',
                padding: '20px 0',
            }
        },
        React.createElement('div',
            {
                style: {
                    maxWidth: '1400px',
                    margin: '0 auto',
                    padding: '0 20px',
                }
            },
            React.createElement('header',
                {
                    style: {
                        marginBottom: '30px',
                        textAlign: 'center',
                    }
                },
                React.createElement('h1',
                    {
                        style: {
                            color: '#343a40',
                            marginBottom: '10px',
                        }
                    },
                    'Senars - Visual Verification Dashboard'
                ),
                React.createElement('p',
                    {
                        style: {
                            color: '#6c757d',
                            marginBottom: '20px',
                        }
                    },
                    'Simple UI components for visual verification and testing'
                ),
                React.createElement('div',
                    {
                        style: {
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '15px',
                            flexWrap: 'wrap',
                            marginBottom: '20px',
                        }
                    },
                    React.createElement('nav',
                        {
                            style: {
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                                justifyContent: 'center',
                            }
                        },
                        Object.entries(views).map(([key, view]) =>
                            React.createElement('button',
                                {
                                    key,
                                    onClick: () => setCurrentView(key),
                                    style: {
                                        padding: '8px 16px',
                                        backgroundColor: currentView === key ? '#007bff' : '#e9ecef',
                                        color: currentView === key ? 'white' : '#495057',
                                        border: '1px solid #ced4da',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        fontWeight: currentView === key ? 'bold' : 'normal',
                                        fontSize: '0.9em',
                                    },
                                    'data-testid': `nav-btn-${key}`
                                },
                                view.name
                            )
                        )
                    ),
                    React.createElement('div',
                        {
                            style: {
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'center'
                            }
                        },
                        React.createElement('button',
                            {
                                onClick: triggerTestActions,
                                style: {
                                    padding: '8px 16px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9em',
                                },
                                'data-testid': 'test-actions-btn'
                            },
                            'Trigger Test Actions'
                        ),
                        React.createElement('label',
                            {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontSize: '0.9em'
                                }
                            },
                            React.createElement('input',
                                {
                                    type: 'checkbox',
                                    checked: testMode,
                                    onChange: e => setTestMode(e.target.checked),
                                    style: {marginRight: '5px'},
                                    'data-testid': 'test-mode-toggle'
                                }
                            ),
                            'Test Mode'
                        )
                    )
                )
            ),
            React.createElement('main', null,
                currentView === 'all'
                    ? React.createElement('div',
                        {
                            style: {
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
                                gap: '20px',
                            }
                        },
                        React.createElement('div',
                            {
                                style: cardStyle,
                                'data-testid': 'status-card'
                            },
                            React.createElement('div', {style: cardHeaderStyle}, 'WebSocket Status'),
                            React.createElement('div', {style: cardBodyStyle},
                                React.createElement(WebSocketStatus, {})
                            )
                        ),
                        React.createElement('div',
                            {
                                style: cardStyle,
                                'data-testid': 'demos-card'
                            },
                            React.createElement('div', {style: cardHeaderStyle}, 'Demo Runner'),
                            React.createElement('div', {style: cardBodyStyle},
                                React.createElement(DemoRunner, {})
                            )
                        ),
                        React.createElement('div',
                            {
                                style: cardStyle,
                                'data-testid': 'input-card'
                            },
                            React.createElement('div', {style: cardHeaderStyle}, 'Narsese Input'),
                            React.createElement('div', {style: cardBodyStyle},
                                React.createElement(NarseseInput, {})
                            )
                        ),
                        React.createElement('div',
                            {
                                style: cardStyle,
                                'data-testid': 'tasks-card'
                            },
                            React.createElement('div', {style: cardHeaderStyle}, 'Task Monitor'),
                            React.createElement('div', {style: cardBodyStyle},
                                React.createElement(TaskMonitor, {})
                            )
                        )
                    )
                    : React.createElement('div',
                        {
                            style: cardStyle
                        },
                        React.createElement('div', {style: cardHeaderStyle}, views[currentView].name),
                        React.createElement('div', {style: cardBodyStyle},
                            React.createElement(views[currentView].component, {})
                        )
                    )
            ),
            React.createElement('footer',
                {
                    style: {
                        marginTop: '30px',
                        textAlign: 'center',
                        color: '#6c757d',
                        fontSize: '0.9em',
                        paddingTop: '20px',
                        borderTop: '1px solid #dee2e6',
                    }
                },
                React.createElement('p', null, 'Visual verification dashboard for Senars reasoning engine components'),
                React.createElement('p',
                    {
                        style: {
                            fontSize: '0.8em',
                            marginTop: '5px'
                        }
                    },
                    'Use the "Trigger Test Actions" button to generate sample data for visual verification'
                )
            )
        )
    );
};

// Card styling for consistent layout
const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    minHeight: '300px',
};

const cardHeaderStyle = {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '15px 20px',
    fontSize: '1.2em',
    fontWeight: 'bold',
};

const cardBodyStyle = {
    padding: '20px',
};

// Initialize the app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(React.createElement(VisualVerificationApp, {}));

export default VisualVerificationApp;
