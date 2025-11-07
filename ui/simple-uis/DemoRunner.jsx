import React from 'react';
import useUiStore from '../src/stores/uiStore';

const DemoRunner = () => {
    const demos = useUiStore(state => state.demos);
    const demoStates = useUiStore(state => state.demoStates);
    const wsService = useUiStore(state => state.wsService);

    const sendDemoControl = (demoId, command, parameters = {}) => {
        if (wsService) {
            wsService.sendMessage({
                type: 'demoControl',
                payload: {
                    command,
                    demoId,
                    parameters,
                },
            });
        } else {
            console.warn('WebSocket service not available');
        }
    };

    // Style constants
    const containerStyle = {
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        border: '2px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    };

    const demoCardStyle = {
        padding: '15px',
        border: '1px solid #ccc',
        borderRadius: '6px',
        backgroundColor: '#fff',
        marginBottom: '15px',
    };

    const statusBadgeStyle = status => ({
        marginLeft: '8px',
        padding: '4px 10px',
        borderRadius: '12px',
        backgroundColor:
            status === 'running'
                ? '#d4edda'
                : status === 'completed'
                    ? '#cce5ff'
                    : status === 'error'
                        ? '#f8d7da'
                        : '#e2e3e5',
        color:
            status === 'running'
                ? '#155724'
                : status === 'completed'
                    ? '#004085'
                    : status === 'error'
                        ? '#721c24'
                        : '#383d41',
        fontWeight: 'bold',
        fontSize: '0.9em',
    });

    const progressBarContainerStyle = {
        width: '100%',
        height: '20px',
        backgroundColor: '#e9ecef',
        borderRadius: '10px',
        overflow: 'hidden',
        marginTop: '4px',
    };

    const progressBarFillStyle = (status, progress) => ({
        height: '100%',
        width: `${progress}%`,
        backgroundColor:
            status === 'running' ? '#28a745' : status === 'completed' ? '#007bff' : '#6c757d',
        transition: 'width 0.3s ease',
    });

    const buttonStyle = (status, command) => {
        const isRunning = status === 'running';
        const isPaused = status === 'paused';

        let backgroundColor = '#6c757d'; // default
        if (command === 'start' && !isRunning) backgroundColor = '#28a745';
        if (command === 'pause' && isRunning) backgroundColor = '#ffc107';
        if (command === 'resume' && isPaused) backgroundColor = '#28a745';
        if (command === 'stop') backgroundColor = '#dc3545';
        if (status === 'running' && command === 'start') backgroundColor = '#6c757d'; // disabled

        const isDisabled =
            (command === 'start' && isRunning) ||
            (command === 'pause' && !isRunning) ||
            (command === 'resume' && !isPaused);

        return {
            padding: '8px 16px',
            backgroundColor,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? 0.6 : 1,
            marginRight: '5px',
            marginBottom: '5px',
        };
    };

    return (
        <div style={containerStyle} data-testid="demo-runner-container">
            <h1 data-testid="demo-runner-title">Demo Runner</h1>

            {demos.length === 0 ? (
                <div
                    style={{padding: '20px', textAlign: 'center', color: '#6c757d'}}
                    data-testid="loading-demos"
                >
                    Loading demos...
                </div>
            ) : (
                <div>
                    <h2>Available Demos</h2>
                    <div style={{display: 'grid', gap: '15px'}} data-testid="demos-list">
                        {demos.map(demo => {
                            const state = demoStates[demo.id] || {state: 'ready', progress: 0};
                            return (
                                <div key={demo.id} style={demoCardStyle} data-testid={`demo-card-${demo.id}`}>
                                    <h3 data-testid={`demo-name-${demo.id}`}>{demo.name}</h3>
                                    <p data-testid={`demo-description-${demo.id}`}>{demo.description}</p>

                                    <div style={{marginBottom: '10px'}}>
                                        <strong>Status:</strong>
                                        <span
                                            style={statusBadgeStyle(state.state)}
                                            data-testid={`demo-status-${demo.id}`}
                                        >
                      {state.state}
                    </span>
                                    </div>

                                    {state.progress !== undefined && (
                                        <div style={{marginBottom: '10px'}}>
                                            <strong>Progress:</strong>
                                            <div style={progressBarContainerStyle}>
                                                <div
                                                    style={progressBarFillStyle(state.state, state.progress)}
                                                    data-testid={`demo-progress-bar-${demo.id}`}
                                                ></div>
                                            </div>
                                            <div
                                                style={{textAlign: 'right', fontSize: '0.8em', marginTop: '4px'}}
                                                data-testid={`demo-progress-text-${demo.id}`}
                                            >
                                                {state.progress}%
                                            </div>
                                        </div>
                                    )}

                                    {state.currentStep && (
                                        <div style={{marginBottom: '10px'}}>
                                            <strong>Current Step:</strong>
                                            <span data-testid={`demo-step-${demo.id}`}> {state.currentStep}</span>
                                        </div>
                                    )}

                                    <div
                                        style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}
                                        data-testid={`demo-controls-${demo.id}`}
                                    >
                                        <button
                                            onClick={() => sendDemoControl(demo.id, 'start')}
                                            disabled={state.state === 'running'}
                                            style={buttonStyle(state.state, 'start')}
                                            data-testid={`demo-start-btn-${demo.id}`}
                                        >
                                            Start
                                        </button>
                                        <button
                                            onClick={() => sendDemoControl(demo.id, 'pause')}
                                            disabled={state.state !== 'running'}
                                            style={buttonStyle(state.state, 'pause')}
                                            data-testid={`demo-pause-btn-${demo.id}`}
                                        >
                                            Pause
                                        </button>
                                        <button
                                            onClick={() => sendDemoControl(demo.id, 'resume')}
                                            disabled={state.state !== 'paused'}
                                            style={buttonStyle(state.state, 'resume')}
                                            data-testid={`demo-resume-btn-${demo.id}`}
                                        >
                                            Resume
                                        </button>
                                        <button
                                            onClick={() => sendDemoControl(demo.id, 'stop')}
                                            style={buttonStyle(state.state, 'stop')}
                                            data-testid={`demo-stop-btn-${demo.id}`}
                                        >
                                            Stop
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DemoRunner;
