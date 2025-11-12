import React, {useCallback, useEffect, useState, useRef} from 'react';
import {Box, Text, useInput, useStdin} from 'ink';
import TextInput from 'ink-text-input';
import {v4 as uuidv4} from 'uuid';
import {FormattingUtils} from '../utils/FormattingUtils.js';
import {handleError} from '../../../src/util/ErrorHandler.js';
import {
    handleLoadCommand,
    handleHelpCommand, 
    handleExitCommand,
    handleExamplesCommand,
    handleRunCommand,
    handleStepCommand,
    handleStopCommand,
    executeAndLog
} from './SlashCommandHandlers.js';

// Define log types and their visual representation
const LOG_TYPES = {
    error: { color: 'red', symbol: '❌' },
    warn: { color: 'yellow', symbol: '⚠️' },
    warning: { color: 'yellow', symbol: '⚠️' },
    success: { color: 'green', symbol: '✅' },
    debug: { color: 'blue', symbol: '🔬' },
    default: { color: 'white', symbol: 'ℹ️' }
};

// Format log entry with color coding
const formatLogEntry = (log) => {
    const {color, symbol} = LOG_TYPES[log.type] ?? LOG_TYPES.default;
    const timestamp = new Date(log.timestamp).toLocaleTimeString();

    return React.createElement(
        Box,
        {key: log.id, flexDirection: 'row'},
        React.createElement(
            Text,
            {color},
            `${symbol} [${timestamp}] ${log.message}`
        )
    );
};

// Command history management
const useCommandHistory = () => {
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const addToHistory = (command) => {
        const trimmedCommand = command.trim();
        if (trimmedCommand && (commandHistory[0] !== trimmedCommand)) {
            setCommandHistory(prev => [trimmedCommand, ...prev.slice(0, 99)]); // Keep last 100 commands
        }
        setHistoryIndex(-1); // Reset history index after submitting
    };

    const navigateHistory = (direction, setInputValue) => {
        if (direction === 'up' && commandHistory.length > 0) {
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            setHistoryIndex(newIndex);
            setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
        } else if (direction === 'down') {
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setInputValue('');
            }
        }
    };

    return { commandHistory, historyIndex, setHistoryIndex, addToHistory, navigateHistory };
};

// Handle slash commands
const handleSlashCommand = async (engine, command, addLog) => {
    const [cmd, ...args] = command.slice(1).split(' ');
    const cmdLower = cmd.toLowerCase();

    switch (cmdLower) {
        case 'exit':
        case 'quit':
        case 'q':
            return handleExitCommand(engine, addLog);

        case 'list-examples':
        case 'examples':
        case 'demo':
            return handleExamplesCommand(addLog);

        case 'load':
            if (args.length === 0) {
                addLog('❌ Usage: /load <filepath>', 'error');
                return;
            }
            return handleLoadCommand(engine, args, addLog);

        case 'run':
        case 'go': 
            return await handleRunCommand(engine, addLog);
        case 'step':
        case 'next':
        case 'n': 
            return await handleStepCommand(engine, addLog);
        case 'stop':
        case 'st': 
            return await handleStopCommand(engine, addLog);
        case 'help': 
            return handleHelpCommand(addLog);
        default:
            addLog(`❌ Unknown command: ${cmd}. Type /help for available commands.`, 'error');
    }
};

// Agent-specific TUI component
export const AgentInkTUI = ({engine}) => {
    const [logs, setLogs] = useState([{id: uuidv4(), message: '🤖 Agent TUI initialized', timestamp: Date.now(), type: 'info'}]);
    const [inputValue, setInputValue] = useState('');
    const [status, setStatus] = useState({isRunning: false, cycle: 0, mode: 'idle', agentCount: 0});
    const streamingResponseRef = useRef(null);

    const {isRawModeSupported} = useStdin();
    const {navigateHistory, addToHistory} = useCommandHistory();

    // Add log message with color coding, avoiding duplicates
    const addLog = useCallback((message, type = 'info') => {
        setLogs(prevLogs => {
            // Check if the exact same message already exists recently (last 2 entries)
            const isDuplicate = prevLogs.slice(-2).some(log => 
                log.message === message && log.type === type
            );
            
            if (isDuplicate) {
                return prevLogs; // Don't add duplicate
            }
            
            return [
                ...prevLogs.filter(log => log.id !== streamingResponseRef.current), // Remove current streaming log if adding a new one
                {id: uuidv4(), message, timestamp: Date.now(), type}
            ].slice(-50); // Keep max 50 logs in memory for performance
        });
    }, []);

    // Event listener registration
    const setupEventListeners = () => {
        // Generic event handlers with consistent error handling
        const handleLog = (message) => addLog(message, 'info');
        const handleStatus = (newStatus) => setStatus(prev => ({...prev, ...newStatus}));
        const handleCycleStep = (data) => setStatus(prev => ({...prev, cycle: data.cycleAfter ?? data.cycle ?? 0, mode: 'stepped'}));
        const handleCycleRunning = () => setStatus(prev => ({...prev, isRunning: true, mode: 'running'}));
        const handleCycleStop = () => setStatus(prev => ({...prev, isRunning: false, mode: 'idle'}));
        
        const handleTaskFocused = (data) => {
            const task = data.task;
            if (task) {
                const formattedTask = FormattingUtils.formatTask(task);
                addLog(`📝 FOCUSED: ${formattedTask}`, 'info');
            }
        };

        // Agent-specific event handlers
        const handleGenericAgentEvent = (prefix, data) => 
            addLog(`${prefix}: ${data.action ?? data.decision ?? data.description} ${data.details ? `- ${data.details}` : ''}`, 'info');

        const handlers = {
            'log': handleLog,
            'status': handleStatus,
            'nar.cycle.step': handleCycleStep,
            'nar.cycle.running': handleCycleRunning,
            'nar.cycle.stop': handleCycleStop,
            'task.focus': handleTaskFocused,
            'narsese.error': (data) => addLog(`❌ Error: ${data.error}`, 'error'),
            'command.error': (data) => addLog(`❌ Command Error: ${data.error}`, 'error'),
            'agent.action': (data) => handleGenericAgentEvent('🤖 AGENT ACTION', data),
            'agent.decision': (data) => handleGenericAgentEvent('🧠 AGENT DECISION', data),
            'hybrid.reasoning': (data) => handleGenericAgentEvent('🔗 HYBRID REASONING', data)
        };

        // Register all event listeners
        Object.entries(handlers).forEach(([event, handler]) => engine.on(event, handler));

        // Initial logs
        addLog('✅ Agent connected to engine', 'success');
        setTimeout(() => {
            addLog('🤖 Welcome to SeNARS Agent REPL!', 'info');
            addLog('Try: "agent create myagent", "goal learn quantum physics", "think about AI"', 'info');
        }, 100);

        // Return cleanup function
        return () => {
            Object.entries(handlers).forEach(([event, handler]) => engine.off(event, handler));
        };
    };

    // Setup event listeners with useEffect
    useEffect(setupEventListeners, [engine, addLog]);

    // Reasoner control functions
    const handleRunCommand = async () => executeAndLog(engine, engine.executeCommand('go'), 'Run', addLog);
    const handleStepCommand = async () => {
        try {
            const result = await engine._next();
            await new Promise(resolve => setTimeout(resolve, 50));

            const beliefs = engine.nar.getBeliefs?.() ?? [];
            const recentBeliefs = beliefs.slice(-2);

            if (recentBeliefs.length > 0) {
                recentBeliefs.forEach(belief => {
                    const term = belief.term?.toString?.() ?? 'Unknown';
                    const truth = belief.truth ? 
                        `%${(belief.truth.frequency ?? 1.000).toFixed(3)},${(belief.truth.confidence ?? 0.900).toFixed(3)}%` : '';
                    addLog(`_BELIEF_: ${term} ${truth}`, 'success');
                });
            }
        } catch (error) {
            addLog(`❌ Step error: ${error.message}`, 'error');
        }
    };
    const handleStopCommand = async () => executeAndLog(engine, engine._stop(), 'Stop', addLog);

    // Handle keyboard shortcuts
    useInput((input, key) => {
        // Reasoner control shortcuts
        if (key.ctrl) {
            switch (input) {
                case 'r': return handleRunCommand();
                case 's': return handleStepCommand();
                case 'p': return handleStopCommand();
                case 'c': 
                    addLog('👋 Agent TUI terminated', 'info');
                    return process.exit(0);
            }
        }

        // Submit on Enter key
        if (key.return || key.enter) {
            handleSubmit();
            return;
        }

        // Command history navigation
        if (key.upArrow) navigateHistory('up', setInputValue);
        if (key.downArrow) navigateHistory('down', setInputValue);
    });

    // Handle command execution
    const handleSubmit = async () => {
        const command = inputValue.trim();
        if (!command) {
            await handleStepCommand(engine, addLog);
            setInputValue('');
            return;
        }

        addToHistory(command);
        setInputValue(''); // Clear input immediately so user can type again

        // Log that the command is being processed
        addLog(`⏳ Processing: ${command}`, 'info');

        // Process command in the background to prevent blocking the UI
        (async () => {
            try {
                if (command.startsWith('/')) {
                    await handleSlashCommand(engine, command, addLog);
                } else {
                    // Use streaming for LM responses to provide real-time feedback
                    const responseLogId = uuidv4();
                    streamingResponseRef.current = responseLogId; // Track the streaming response
                    addLog('🔄 LM response streaming...', 'info');
                    
                    // Set a timeout for the LM call to prevent indefinite hanging
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Request timeout after 120 seconds')), 120000);
                    });
                    
                    // Create a promise that handles the streaming response
                    const streamPromise = (async () => {
                        let fullResponse = '';
                        
                        // Check if agentLM has streaming capability
                        if (engine.agentLM && typeof engine.agentLM.streamText === 'function') {
                            try {
                                // Get the stream iterator - use the engine's configuration if available
                                const promptTemplate = engine.inputProcessingConfig?.lmPromptTemplate || 
                                    'As an intelligent reasoning system, please respond to this query: "{{input}}". If this is a request that should interact with the NARS system, please use appropriate tools.';
                                const prompt = promptTemplate.replace('{{input}}', command);

                                const streamIterator = await engine.agentLM.streamText(
                                    prompt,
                                    { temperature: engine.inputProcessingConfig?.lmTemperature || 0.7 }
                                );

                                // Add initial streaming entry to logs
                                setLogs(prevLogs => [
                                    ...prevLogs.slice(-49),
                                    {id: responseLogId, message: '🔄 LM response streaming...', timestamp: Date.now(), type: 'info'}
                                ]);

                                // Stream the response - get all chunks and update the log immediately
                                for await (const chunk of streamIterator) {
                                    fullResponse += chunk;
                                    // Update the specific streaming log with the current response
                                    setLogs(prevLogs => {
                                        return prevLogs.map(log => 
                                            log.id === responseLogId 
                                                ? {...log, message: `🤖: ${fullResponse}`, type: 'success'} 
                                                : log
                                        ).slice(-50);
                                    });
                                }
                            } catch (streamError) {
                                // If streaming fails, update the log with error
                                setLogs(prevLogs => {
                                    return prevLogs.map(log => 
                                        log.id === responseLogId 
                                            ? {...log, message: `❌ Streaming error: ${streamError.message}`, type: 'error'} 
                                            : log
                                    ).slice(-50);
                                });

                                // Then fallback to regular generateText
                                const response = await engine.processInput(command);
                                if (response && typeof response === 'string') {
                                    addLog(`🤖 Response: ${response}`, response.includes('❌') ? 'error' : 'success');
                                }
                            }
                        } else {
                            // Fallback to original approach if streaming not available
                            const response = await engine.processInput(command);
                            if (response && typeof response === 'string') {
                                addLog(`🤖 Response: ${response}`, response.includes('❌') ? 'error' : 'success');
                            }
                        }
                    })();
                    
                    // Race the streaming against timeout
                    await Promise.race([
                        streamPromise,
                        timeoutPromise
                    ]);
                    
                    // Reset the streaming ref after completion
                    streamingResponseRef.current = null;
                }
            } catch (error) {
                if (error.message.includes('timeout')) {
                    addLog('⏰ Request timed out - LM may be slow or unavailable', 'error');
                } else {
                    addLog(handleError(error, 'Command processing'), 'error');
                }
            }
        })();
    };

    // Render UI components
    return React.createElement(
        Box,
        {flexDirection: 'column', width: '100%', height: '100%'},
        // Log Viewer
        React.createElement(
            Box,
            {flexDirection: 'column', flexGrow: 1, padding: 1, maxHeight: '100%'},
            React.createElement(Text, {bold: true, color: 'cyan'}, `Agent Log (${logs.length})`),
            React.createElement(
                Box,
                {flexDirection: 'column', flexGrow: 1, marginTop: 1, marginBottom: 1},
                ...logs.slice(-50).map(formatLogEntry)
            )
        ),
        // Input Box
        React.createElement(
            Box,
            {borderStyle: 'round', padding: 1, width: '100%'},
            React.createElement(
                Box,
                {flexDirection: 'row', alignItems: 'center'},
                React.createElement(Text, {color: 'green', bold: true}, '> '),
                React.createElement(
                    TextInput,
                    {
                        value: inputValue,
                        onChange: setInputValue,
                        onSubmit: handleSubmit,
                        placeholder: 'Enter command, Narsese input, or agent instruction...',
                    }
                )
            )
        ),
        // Status Bar
        React.createElement(
            Box,
            {paddingX: 1, backgroundColor: 'blue', width: '100%', flexDirection: 'row', justifyContent: 'space-between'},
            React.createElement(
                Box,
                {flexDirection: 'row'},
                React.createElement(Text, {color: 'white', bold: true}, `${status.isRunning ? '🚀' : '⏸️ '} `),
                React.createElement(Text, {color: 'white'}, `Cycle: ${status.cycle} | `),
                React.createElement(Text, {color: 'white'}, `Mode: ${status.mode} | `),
                React.createElement(Text, {color: 'white'}, `Raw Mode: ${isRawModeSupported ? 'Yes' : 'No'}`)
            ),
            React.createElement(
                Box,
                {flexDirection: 'row'},
                React.createElement(Text, {color: 'yellow'}, 'F1-Help | '),
                React.createElement(Text, {color: 'yellow'}, '↑↓ History | '),
                React.createElement(Text, {color: 'yellow'}, 'Ctrl+R/S/P | '),
                React.createElement(Text, {color: 'yellow'}, 'Ctrl+C Exit')
            )
        )
    );
};