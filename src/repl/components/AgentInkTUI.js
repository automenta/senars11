import React, {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import {Box, Text, useInput, useStdin} from 'ink';
import TextInput from 'ink-text-input';
import {v4 as uuidv4} from 'uuid';
import {FormattingUtils} from '../utils/index.js';
import {handleError} from '../../../src/util/ErrorHandler.js';
import {ReplMessageHandler} from '../ReplMessageHandler.js';

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

// Agent-specific TUI component
export const AgentInkTUI = ({engine}) => {
    const [logs, setLogs] = useState([{
        id: uuidv4(),
        message: '🤖 Agent TUI initialized',
        timestamp: Date.now(),
        type: 'info'
    }]);
    // Track recent log messages for deduplication
    const recentLogTracker = useRef(new Set());
    const [inputValue, setInputValue] = useState('');
    const [status, setStatus] = useState({isRunning: false, cycle: 0});
    const [mode, setMode] = useState('agent'); // 'agent' or 'narsese'

    const streamingResponseRef = useRef(null);
    const streamControllerRef = useRef(null);

    const {isRawModeSupported} = useStdin();
    const {navigateHistory, addToHistory} = useCommandHistory();

    // Initialize Message Handler
    const messageHandler = useMemo(() => new ReplMessageHandler(engine), [engine]);

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
                ...prevLogs,
                {id: uuidv4(), message, timestamp: Date.now(), type}
            ].slice(-50); // Keep max 50 logs in memory for performance
        });
    }, []);

    // Event listener registration
    const setupEventListeners = () => {
        // Generic event handlers with consistent error handling
        const handleLog = (message) => {
            // If message is a string, use it directly
            if (typeof message === 'string') {
                addLog(message, 'info');
            }
            // If it's an object, try to extract meaningful content
            else if (typeof message === 'object') {
                // Check if it's an event object with message content
                if (message.message) {
                    // It's an event object with a message property
                    addLog(message.message, 'info');
                } else if (message.content) {
                    // It's an event object with a content property
                    addLog(message.content, 'info');
                } else if (message.task) {
                    // It might be a task-focused event
                    try {
                        const formattedTask = FormattingUtils.formatTask(message.task);
                        addLog(formattedTask, 'info');
                    } catch (e) {
                        addLog(JSON.stringify(message), 'info');
                    }
                } else if (message.hasOwnProperty('0') && typeof message[0] === 'string') {
                    // It might be a string represented as an indexed object (e.g., {"0":"H","1":"i","2":"!"})
                    // But it could also contain event metadata, so we need to be careful
                    try {
                        // Get all numeric keys in order to reconstruct the string
                        const numericKeys = Object.keys(message)
                            .filter(key => /^\d+$/.test(key))
                            .sort((a, b) => parseInt(a) - parseInt(b));

                        if (numericKeys.length > 0) {
                            // Reconstruct the string from indexed values
                            const stringParts = numericKeys.map(key => message[key]);
                            const reconstructedString = stringParts.join('');

                            // Only use the reconstructed string if it's not just metadata
                            addLog(reconstructedString, 'info');
                        } else {
                            // No numeric keys found, stringify the object
                            addLog(JSON.stringify(message), 'info');
                        }
                    } catch (e) {
                        addLog(JSON.stringify(message), 'info');
                    }
                } else {
                    // Default to stringifying the whole object
                    addLog(JSON.stringify(message), 'info');
                }
            }
            // For other types (number, boolean, etc.), convert to string
            else {
                addLog(String(message), 'info');
            }
        };
        const handleStatus = (newStatus) => setStatus(prev => ({...prev, ...newStatus}));
        const handleCycleStep = (data) => setStatus(prev => ({
            ...prev,
            cycle: data.cycleAfter ?? data.cycle ?? 0
        }));
        const handleCycleRunning = () => setStatus(prev => ({...prev, isRunning: true}));
        const handleCycleStop = () => setStatus(prev => ({...prev, isRunning: false}));

        const handleTaskFocused = (data) => {
            if (typeof data === 'object') {
                // Check if data is the task itself (common case) or contains a task property
                const task = data.task || data;  // If data has a task prop, use it, otherwise data itself might be the task
                if (task && typeof task === 'object') {
                    try {
                        const formattedTask = FormattingUtils.formatTask(task);
                        addLog(`📝 FOCUSED: ${formattedTask}`, 'info');
                    } catch (e) {
                        // If formatting fails, try to show a basic representation
                        addLog(`📝 FOCUSED: ${JSON.stringify(task)}`, 'info');
                    }
                } else {
                    addLog(`📝 FOCUSED: ${JSON.stringify(data)}`, 'info');
                }
            } else if (typeof data === 'string') {
                addLog(`📝 FOCUSED: ${data}`, 'info');
            } else {
                addLog(`📝 FOCUSED: ${JSON.stringify(data)}`, 'info');
            }
        };

        // Agent-specific event handlers
        const handleGenericAgentEvent = (prefix, data) =>
            addLog(`${prefix}: ${typeof data === 'object' ? (data.action ?? data.decision ?? data.description ?? JSON.stringify(data)) : String(data)} ${typeof data === 'object' && data.details ? `- ${data.details}` : ''}`, 'agent');

        const handlers = {
            'log': handleLog,
            'status': handleStatus,
            'nar.cycle.step': handleCycleStep,
            'nar.cycle.running': handleCycleRunning,
            'nar.cycle.stop': handleCycleStop,
            'task.focus': handleTaskFocused,
            'narsese.error': (data) => addLog(`❌ Error: ${typeof data === 'object' && data.error ? data.error : (typeof data === 'string' ? data : JSON.stringify(data))}`, 'error'),
            'command.error': (data) => addLog(`❌ Command Error: ${typeof data === 'object' && data.error ? data.error : (typeof data === 'string' ? data : JSON.stringify(data))}`, 'error'),
            'agent.action': (data) => handleGenericAgentEvent('🤖 AGENT ACTION', data),
            'agent.decision': (data) => handleGenericAgentEvent('🧠 AGENT DECISION', data),
            'hybrid.reasoning': (data) => handleGenericAgentEvent('🔗 HYBRID REASONING', data)
        };

        // Register all event listeners
        Object.entries(handlers).forEach(([event, handler]) => engine.on(event, handler));

        // Initial logs
        setTimeout(() => {
            addLog('🤖 Welcome to SeNARS Unified REPL!', 'info');
            addLog('Type /help for commands. Toggle modes with /natural, /narsese, or Ctrl+M.', 'info');
            addLog(`Current mode: ${mode.toUpperCase()}`, 'info');
        }, 100);

        // Return cleanup function
        return () => {
            Object.entries(handlers).forEach(([event, handler]) => engine.off(event, handler));
        };
    };

    // Setup event listeners with useEffect
    useEffect(setupEventListeners, [engine, addLog]);

    // Reasoner control functions using Message Handler
    const handleRunCommand = async () => {
         const res = await messageHandler.processMessage({type: 'control/start'});
         if (res.payload?.result) {
             const result = res.payload.result;
             if (typeof result === 'string') {
                 addLog(result, 'success');
             } else {
                 try {
                     addLog(JSON.stringify(result), 'success');
                 } catch (e) {
                     if (result && typeof result === 'object' && Object.keys(result).length > 0) {
                         addLog(`[Object with ${Object.keys(result).length} keys]`, 'success');
                     } else {
                         addLog(`[Object data]`, 'success');
                     }
                 }
             }
         }
    };

    const handleStepCommand = async () => {
         const res = await messageHandler.processMessage({type: 'control/step'});
         if (res.payload?.result) {
             const result = res.payload.result;
             if (typeof result === 'string') {
                 addLog(result, 'success');
             } else {
                 try {
                     addLog(JSON.stringify(result), 'success');
                 } catch (e) {
                     if (result && typeof result === 'object' && Object.keys(result).length > 0) {
                         addLog(`[Object with ${Object.keys(result).length} keys]`, 'success');
                     } else {
                         addLog(`[Object data]`, 'success');
                     }
                 }
             }
         }

         // Manual belief check logic from previous version can be kept if desired,
         // but relying on events is better.
         // Just in case, we can query beliefs if needed.
    };

    const handleStopCommand = async () => {
         const res = await messageHandler.processMessage({type: 'control/stop'});
         if (res.payload?.result) {
             const result = res.payload.result;
             if (typeof result === 'string') {
                 addLog(result, 'success');
             } else {
                 try {
                     addLog(JSON.stringify(result), 'success');
                 } catch (e) {
                     if (result && typeof result === 'object' && Object.keys(result).length > 0) {
                         addLog(`[Object with ${Object.keys(result).length} keys]`, 'success');
                     } else {
                         addLog(`[Object data]`, 'success');
                     }
                 }
             }
         }
    };

    const handleHelpCommand = async () => {
         // Use a direct help text here or fetch from handler if implemented.
         // SlashCommandHandlers had a static list.
         // We can move it here or ask handler.
         // For now, let's keep a simple help list locally or implement /help in handler.
         // CommandProcessor has _help().
         const res = await messageHandler.processMessage({type: '/help'});
         if (typeof res === 'string') {
             res.split('\n').forEach(line => addLog(line, 'info'));
         } else {
             // Fallback help text with mode commands included
             const helpText = [
                 '🤖 Available commands:',
                 '  /help            - Show this help message',
                 '  /natural         - Switch to natural language (agent) mode',
                 '  /narsese         - Switch to Narsese mode',
                 '  /mode [agent|narsese] - Show or change input mode (deprecated, use /natural or /narsese)',
                 '  /stats           - Show system statistics',
                 '  /beliefs         - List current beliefs',
                 '  /goals           - List current goals',
                 '  /questions       - List active questions',
                 '  /tasks           - List current tasks',
                 '  /concepts        - List concepts',
                 '  /trace [on|off]  - Toggle derivation trace',
                 '  /step [n]        - Execute n inference cycles',
                 '  /cycle           - Show current cycle number',
                 '  /reset           - Reset the system',
                 '  /demo [name]     - List or run demo files',
                 '  /run <path>      - Execute a .nars file',
                 '  /save            - Save state to file',
                 '  /load <path>     - Load state from file',
                 '  /quiet [on|off]  - Toggle quiet mode',
                 '  /echo [on|off]   - Toggle command echo',
                 '  /history [n]     - Show last n inputs',
                 '  /last            - Re-execute the last non-slash command',
                 '  /vol <n>         - Set volume level',
                 '  /theme [name]    - Switch terminal color theme',
                 '  /goal <narsese>  - Manage goals',
                 '  /plan <desc>     - Generate a plan using LM',
                 '  /think <topic>   - Have agent think about a topic',
                 '  /reason <stmt>   - Perform reasoning using LM',
                 '  /lm <prompt>     - Direct LM communication',
                 '  /providers       - Manage LM providers',
                 '  /tools           - Show Tools/MCP configuration',
                 '  /agent [status]  - Manage agent status',
                 '  /config [key] [val] - Show or modify system configuration',
                 '  /verbose [on|off] - Toggle verbose output',
                 '  /graph [term]    - Visualize concept relationships',
                 '  /priority [n]    - Show priority queue',
                 '  /search <type> <query> - Search system data',
                 '  /batch <cmds>    - Execute multiple commands',
                 '  /timer <ms> <cmd> - Schedule command execution',
                 '  /profile [ms]    - Profile system performance',
                 '  /watch <type> <cond> - Watch for specific changes',
                 '  /start           - Start continuous execution',
                 '  /stop            - Stop continuous execution',
                 '  /quit            - Exit the REPL'
             ];
             helpText.forEach(line => addLog(line, 'info'));
         }
    };

    // Toggle Mode
    const toggleMode = () => {
        const newMode = mode === 'agent' ? 'narsese' : 'agent';
        setMode(newMode);
        addLog(`🔄 Switched to ${newMode.toUpperCase()} mode`, 'success');
    };

    const handleModeCommand = (args) => {
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
                    handleHelpCommand();
                    return;
                case 'c':
                    addLog('👋 Agent TUI terminated', 'info');
                    try { engine.shutdown(); } catch(e) {}
                    return process.exit(0);
                case 'm':
                    toggleMode();
                    return;
            }
        }

        // Command history navigation
        if (key.upArrow) navigateHistory('up', setInputValue);
        if (key.downArrow) navigateHistory('down', setInputValue);
    });

    // Handle command execution
    const handleSubmit = async () => {
        const command = inputValue.trim();
        if (!command) {
            // Empty input -> single step
            await handleStepCommand();
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
                    const [cmdName, ...args] = command.slice(1).split(' ');

                    // Special handling for mode-related commands since they affect UI state
                    if (cmdName === 'mode') {
                        handleModeCommand(args);
                        return;
                    } else if (cmdName === 'natural') {
                        setMode('agent');
                        addLog(`🔄 Switched to natural language (agent) mode`, 'success');
                        return;
                    } else if (cmdName === 'narsese') {
                        setMode('narsese');
                        addLog(`🔄 Switched to Narsese mode`, 'success');
                        return;
                    }

                    const res = await messageHandler.processMessage({type: command});
                    // Handle result
                    const output = res.payload?.result ?? res;
                    if (output) {
                         if (typeof output === 'string') {
                             // Split lines if long
                             output.split('\n').forEach(line => addLog(line, 'success'));
                         } else {
                             try {
                                 addLog(JSON.stringify(output), 'success');
                             } catch (e) {
                                 // Check if output is a plain object with keys
                                 if (output && typeof output === 'object' && Object.keys(output).length > 0) {
                                     addLog(`[Object with ${Object.keys(output).length} keys]`, 'success');
                                 } else {
                                     addLog(`[Object data]`, 'success');
                                 }
                             }
                         }
                    } else if (res.error) {
                        addLog(`❌ ${res.error}`, 'error');
                    }
                } else {
                    // Route based on mode
                    if (mode === 'narsese') {
                        const res = await messageHandler.processMessage({type: 'narseseInput', payload: command});
                        if (res.payload?.result) {
                            const result = res.payload.result;
                            if (typeof result === 'string') {
                                addLog(result, 'success');
                            } else {
                                try {
                                    addLog(JSON.stringify(result), 'success');
                                } catch (e) {
                                    if (result && typeof result === 'object' && Object.keys(result).length > 0) {
                                        addLog(`[Object with ${Object.keys(result).length} keys]`, 'success');
                                    } else {
                                        addLog(`[Object data]`, 'success');
                                    }
                                }
                            }
                        }
                        if (res.error) addLog(res.error, 'error');
                    } else {
                        // Agent Mode: Use streaming LM execution
                        // Since ReplMessageHandler doesn't stream, we use engine directly for this part
                        // to preserve the nice UI.

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
                if (error.message?.includes('timeout')) {
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
                React.createElement(Text, {
                    color: 'white',
                    bold: true
                }, `${status.isRunning ? '🚀 RUNNING' : '⏸️ PAUSED'} `),
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
