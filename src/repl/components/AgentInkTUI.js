import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Box, Text, useInput, useStdin} from 'ink';
import TextInput from 'ink-text-input';
import {v4 as uuidv4} from 'uuid';
import {FormattingUtils} from '../utils/index.js';
import {handleError} from '../../../src/util/ErrorHandler.js';
import {
    executeAndLog,
    handleExamplesCommand,
    handleExitCommand,
    handleHelpCommand,
    handleLoadCommand,
    handleNarsCommand,
    handleRunCommand,
    handleStepCommand,
    handleStopCommand,
    handleToolsCommand
} from './SlashCommandHandlers.js';

// Define log types and their visual representation
const LOG_TYPES = {
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
const formatLogEntry = (log) => {
    const {color, symbol} = LOG_TYPES[log.type] ?? LOG_TYPES.info;
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

    return {commandHistory, historyIndex, setHistoryIndex, addToHistory, navigateHistory};
};

// Handle slash commands
const handleSlashCommand = async (engine, command, addLog, mode, setMode) => {
    const [cmd, ...args] = command.slice(1).split(' ');
    const cmdLower = cmd.toLowerCase();

    switch (cmdLower) {
        case 'mode':
            if (args.length > 0) {
                const newMode = args[0].toLowerCase();
                if (['agent', 'narsese'].includes(newMode)) {
                    setMode(newMode);
                    addLog(`🔄 Switched to ${newMode.toUpperCase()} mode`, 'success');
                } else {
                    addLog('❌ Invalid mode. Use "agent" or "narsese".', 'error');
                }
            } else {
                addLog(`ℹ️ Current mode: ${mode.toUpperCase()}`, 'info');
            }
            return;
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
        case 'tools':
            return handleToolsCommand(engine, addLog);
        case 'nars':
            return handleNarsCommand(engine, args, addLog);
        case 'help':
            return handleHelpCommand(addLog);
        default:
            addLog(`❌ Unknown command: ${cmd}. Type /help for available commands.`, 'error');
    }
};

// Agent-specific TUI component
export const AgentInkTUI = ({engine}) => {
    const [logs, setLogs] = useState([{
        id: uuidv4(),
        message: '🤖 Agent TUI initialized',
        timestamp: Date.now(),
        type: 'info'
    }]);
    const [inputValue, setInputValue] = useState('');
    const [status, setStatus] = useState({isRunning: false, cycle: 0});
    const [mode, setMode] = useState('agent'); // 'agent' or 'narsese'

    const streamingResponseRef = useRef(null);
    const streamControllerRef = useRef(null);

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

            // If we're streaming, we don't want to remove the streaming log yet,
            // but we can append others.

            return [
                ...prevLogs,
                {id: uuidv4(), message, timestamp: Date.now(), type}
            ].slice(-50); // Keep max 50 logs in memory for performance
        });
    }, []);

    // Event listener registration
    const setupEventListeners = () => {
        // Generic event handlers with consistent error handling
        const handleLog = (message) => addLog(message, 'info');
        const handleStatus = (newStatus) => setStatus(prev => ({...prev, ...newStatus}));
        const handleCycleStep = (data) => setStatus(prev => ({
            ...prev,
            cycle: data.cycleAfter ?? data.cycle ?? 0
        }));
        const handleCycleRunning = () => setStatus(prev => ({...prev, isRunning: true}));
        const handleCycleStop = () => setStatus(prev => ({...prev, isRunning: false}));

        const handleTaskFocused = (data) => {
            const task = data.task;
            if (task) {
                const formattedTask = FormattingUtils.formatTask(task);
                addLog(`📝 FOCUSED: ${formattedTask}`, 'info');
            }
        };

        // Agent-specific event handlers
        const handleGenericAgentEvent = (prefix, data) =>
            addLog(`${prefix}: ${data.action ?? data.decision ?? data.description} ${data.details ? `- ${data.details}` : ''}`, 'agent');

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
            addLog('🤖 Welcome to SeNARS Unified REPL!', 'info');
            addLog('Type /help for commands. Toggle modes with /mode or Ctrl+M.', 'info');
            addLog(`Current mode: ${mode.toUpperCase()}`, 'info');
        }, 100);

        // Return cleanup function
        return () => {
            Object.entries(handlers).forEach(([event, handler]) => engine.off(event, handler));
        };
    };

    // Setup event listeners with useEffect
    useEffect(setupEventListeners, [engine, addLog]); // Mode isn't a dependency here, handled in state

    // Reasoner control functions
    const handleRunCommand = async () => executeAndLog(engine, engine.executeCommand('go'), 'Run', addLog);
    const handleStepCommand = async () => {
        try {
            const result = await engine._next();
            // Brief pause to allow events to propagate
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

    // Toggle Mode
    const toggleMode = () => {
        const newMode = mode === 'agent' ? 'narsese' : 'agent';
        setMode(newMode);
        addLog(`🔄 Switched to ${newMode.toUpperCase()} mode`, 'success');
    };

    // Handle keyboard shortcuts
    useInput((input, key) => {
        // Escape key to interrupt LM streaming
        if (key.escape) {
            if (streamControllerRef.current) {
                streamControllerRef.current.abort(); // Abort the current stream
                streamControllerRef.current = null;
                addLog('🛑 LM streaming interrupted', 'info');
            }
            // Don't add the escape character to the input
            return;
        }

        // Reasoner control shortcuts
        if (key.ctrl) {
            switch (input) {
                case 'r':
                    handleRunCommand();
                    return;
                case 'p':
                    handleStopCommand();
                    return;
                case 'h':
                    handleHelpCommand(addLog);
                    return;
                case 'c':
                    addLog('👋 Agent TUI terminated', 'info');
                    return process.exit(0);
                case 'm':
                    toggleMode();
                    return;
            }
        }

        // Command history navigation (Enter key handling is done by TextInput onSubmit)
        if (key.upArrow) navigateHistory('up', setInputValue);
        if (key.downArrow) navigateHistory('down', setInputValue);
    });

    // Handle command execution
    const handleSubmit = async () => {
        const command = inputValue.trim();
        if (!command) {
            // Empty input -> single step
            await handleStepCommand(engine, addLog);
            setInputValue('');
            return;
        }

        addToHistory(command);
        setInputValue(''); // Clear input immediately

        // Log input
        addLog(`> ${command}`, 'info');

        // Process command
        (async () => {
            try {
                if (command.startsWith('/')) {
                    await handleSlashCommand(engine, command, addLog, mode, setMode);
                } else {
                    // Route based on mode
                    if (mode === 'narsese') {
                        // Direct Narsese execution
                         const result = await engine.processNarsese(command);
                         // Narsese processing might return string or nothing (logging via events)
                         if (result) {
                             addLog(result, 'success');
                         }
                    } else {
                        // Agent Mode: Use streaming LM execution
                        const responseLogId = uuidv4();
                        streamingResponseRef.current = responseLogId;
                        addLog('🔄 LM thinking...', 'agent');

                        const abortController = new AbortController();
                        streamControllerRef.current = abortController;

                        const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Request timeout after 120 seconds')), 120000);
                        });

                        const streamPromise = (async () => {
                            let fullResponse = '';

                            // Add streaming placeholder log
                            setLogs(prevLogs => [
                                ...prevLogs,
                                {
                                    id: responseLogId,
                                    message: '...',
                                    timestamp: Date.now(),
                                    type: 'agent'
                                }
                            ].slice(-50));

                            try {
                                for await (const chunk of engine.streamExecution(command)) {
                                    if (abortController.signal.aborted) break;

                                    if (chunk.type === 'agent_response') {
                                        fullResponse += chunk.content;
                                        // Update the specific log entry
                                        setLogs(prevLogs => prevLogs.map(log =>
                                            log.id === responseLogId
                                            ? {...log, message: `🤖 ${fullResponse}`, type: 'agent'}
                                            : log
                                        ));
                                    } else if (chunk.type === 'tool_call') {
                                        addLog(`🔧 Tool Call: ${chunk.name} (${JSON.stringify(chunk.args)})`, 'tool');
                                    } else if (chunk.type === 'tool_result') {
                                        addLog(`📎 Result: ${chunk.content}`, 'result');
                                    } else if (chunk.type === 'error') {
                                        addLog(chunk.content, 'error');
                                    }
                                }
                            } catch (err) {
                                if (!abortController.signal.aborted) {
                                     addLog(`❌ Streaming error: ${err.message}`, 'error');
                                }
                            }
                        })();

                        await Promise.race([streamPromise, timeoutPromise]);
                        streamingResponseRef.current = null;
                    }
                }
            } catch (error) {
                if (error.message.includes('timeout')) {
                    addLog('⏰ Request timed out', 'error');
                } else {
                    addLog(handleError(error, 'Command processing'), 'error');
                }
            }
        })();
    };

    // UI Layout
    return React.createElement(
        Box,
        {flexDirection: 'column', width: '100%', height: '100%'},
        // Header / Mode Indicator
        React.createElement(
            Box,
            {
                paddingX: 1,
                backgroundColor: mode === 'agent' ? 'blue' : 'green',
                width: '100%',
            },
            React.createElement(Text, {color: 'white', bold: true},
                `SeNARS REPL [${mode.toUpperCase()}]`
            )
        ),
        // Log Viewer
        React.createElement(
            Box,
            {flexDirection: 'column', flexGrow: 1, padding: 1, maxHeight: '100%'},
            React.createElement(Text, {bold: true, color: 'cyan'}, `Logs (${logs.length})`),
            React.createElement(
                Box,
                {flexDirection: 'column', flexGrow: 1, marginTop: 1, marginBottom: 1},
                ...logs.slice(-50).map(formatLogEntry)
            )
        ),
        // Input Box
        React.createElement(
            Box,
            {borderStyle: 'round', width: '100%', borderColor: mode === 'agent' ? 'blue' : 'green'},
            React.createElement(
                Box,
                {flexDirection: 'row', alignItems: 'center'},
                React.createElement(Text, {color: mode === 'agent' ? 'blue' : 'green', bold: true}, `${mode}> `),
                React.createElement(
                    TextInput,
                    {
                        value: inputValue,
                        onChange: setInputValue,
                        onSubmit: handleSubmit,
                        placeholder: mode === 'agent' ? 'Enter instruction for Agent...' : 'Enter Narsese (e.g. <a --> b>.)...',
                    }
                )
            )
        ),
        // Status Bar
        React.createElement(
            Box,
            {
                paddingX: 1,
                backgroundColor: 'gray',
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between'
            },
            React.createElement(
                Box,
                {flexDirection: 'row'},
                React.createElement(Text, {color: 'white', bold: true}, `${status.isRunning ? '🚀 RUNNING' : '⏸️ PAUSED'} `),
                React.createElement(Text, {color: 'white'}, `| Cycle: ${status.cycle} `)
            ),
            React.createElement(
                Box,
                {flexDirection: 'row'},
                React.createElement(Text, {color: 'yellow'}, 'Ctrl+M: Mode | Ctrl+C: Exit')
            )
        )
    );
};
