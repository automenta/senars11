import React, {useCallback, useEffect, useState} from 'react';
import {Box, render, Text, useInput, useStdin} from 'ink';
import TextInput from 'ink-text-input';
import {ReplEngine} from './ReplEngine.js';
import {v4 as uuidv4} from 'uuid';
import {FormattingUtils} from './utils/FormattingUtils.js';

// Simplified single-view TUI REPL
const SimplifiedTUI = ({engine}) => {
    const [logs, setLogs] = useState([
        {id: uuidv4(), message: '🔄 TUI initialized', timestamp: Date.now(), type: 'info'}
    ]);
    const [inputValue, setInputValue] = useState('');
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [status, setStatus] = useState({isRunning: false, cycle: 0, mode: 'idle'});

    const {isRawModeSupported} = useStdin();

    // Add log message with color coding - use useCallback to ensure it's always available
    const addLog = useCallback((message, type = 'info') => {
        setLogs(prevLogs => [
            ...prevLogs,
            {id: uuidv4(), message, timestamp: Date.now(), type}
        ]);
    }, []);

    // Enhanced event handling to properly connect with the engine
    useEffect(() => {
        const handleLog = (message) => {
            addLog(message, 'info');
        };

        const handleStatus = (newStatus) => {
            setStatus(newStatus);
        };

        // Listen for NAR cycle events to update status
        const handleCycleStep = (data) => {
            const cycleCount = data.cycleAfter !== undefined ? data.cycleAfter : data.cycle || 0;
            setStatus(prev => ({
                ...prev,
                cycle: cycleCount,
                mode: 'stepped'
            }));
            // Don't log cycle execution to avoid duplicate messages in the log viewer
            // The status bar will show the current cycle count
        };

        const handleCycleRunning = () => {
            setStatus(prev => ({...prev, isRunning: true, mode: 'running'}));
            // Only log important state changes, not routine cycle transitions
        };

        const handleCycleStop = () => {
            setStatus(prev => ({...prev, isRunning: false, mode: 'idle'}));
            // Only log important state changes, not routine cycle transitions
        };

        // Listen for tasks that were added to focus (unique tasks only, after duplicate filtering)
        const handleTaskFocused = (data) => {
            const task = data.task;
            if (task) {
                // Use proper formatting utility for consistent task representation (includes stamp, truth, punctuation)
                const formattedTask = FormattingUtils.formatTask(task);

                // Log the task that was uniquely added to focus
                addLog(`📝 FOCUSED: ${formattedTask}`, 'info');
            }
        };

        const handleNarseseError = (data) => {
            addLog(`❌ Error: ${data.error}`, 'error');
        };

        // Register all event listeners
        engine.on('log', handleLog);
        engine.on('status', handleStatus);
        engine.on('nar.cycle.step', handleCycleStep);
        engine.on('nar.cycle.running', handleCycleRunning);
        engine.on('nar.cycle.stop', handleCycleStop);
        engine.on('task.focus', handleTaskFocused);
        engine.on('narsese.error', handleNarseseError);

        // Initial log to indicate connection
        addLog('✅ Connected to engine', 'success');

        return () => {
            engine.off('log', handleLog);
            engine.off('status', handleStatus);
            engine.off('nar.cycle.step', handleCycleStep);
            engine.off('nar.cycle.running', handleCycleRunning);
            engine.off('nar.cycle.stop', handleCycleStop);
            engine.off('task.focus', handleTaskFocused);
            engine.off('narsese.error', handleNarseseError);
        };
    }, [engine, addLog]);

    // Handle keyboard shortcuts
    useInput((input, key) => {
        // Reasoner control shortcuts
        if (key.ctrl) {
            switch (input) {
                case 'r':
                    // Ctrl+R to run
                    handleRunCommand();
                    break;
                case 's':
                    // Ctrl+S to step
                    handleStepCommand();
                    break;
                case 'p':
                    // Ctrl+P to pause/stop
                    handleStopCommand();
                    break;
            }
        }

        // Command history navigation
        if (key.upArrow) {
            if (commandHistory.length > 0) {
                const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : 0;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
            }
        } else if (key.downArrow) {
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setInputValue('');
            }
        } else if (key.ctrl && input === 'c') {
            // Handle Ctrl+C gracefully
            addLog('👋 TUI terminated', 'info');
            process.exit(0);
        }
    });

    // Add to command history
    const addToHistory = (command) => {
        if (command.trim() !== '' && (commandHistory.length === 0 || commandHistory[0] !== command)) {
            setCommandHistory(prev => [command, ...prev.slice(0, 99)]); // Keep last 100 commands
        }
        setHistoryIndex(-1); // Reset history index after submitting
    };

    // Handle command execution
    const handleSubmit = async () => {
        const command = inputValue.trim();
        if (!command) {
            // Empty input runs a single cycle (step)
            await handleStepCommand();
            setInputValue('');
            return;
        }

        addToHistory(command);

        try {
            // Check if it's a slash command
            if (command.startsWith('/')) {
                await handleSlashCommand(command);
            } else {
                // Process as normal narsese input
                await engine.processInput(command);
            }
        } catch (error) {
            addLog(`❌ Error: ${error.message}`, 'error');
        }

        setInputValue('');
    };

    // Reasoner control functions
    const handleRunCommand = async () => {
        try {
            const result = await engine.executeCommand('go');
            addLog(result, 'success');
        } catch (error) {
            addLog(`❌ Run error: ${error.message}`, 'error');
        }
    };

    const handleStepCommand = async () => {
        try {
            const prevCycle = engine.nar.cycleCount || 0;
            const result = await engine._next();

            // Wait a brief moment to allow for belief generation
            await new Promise(resolve => setTimeout(resolve, 50));

            // Get any new beliefs that were generated during the step
            const beliefs = engine.nar.getBeliefs?.() || [];
            const recentBeliefs = beliefs.slice(-2); // Get the most recent 2 beliefs

            // Show any new beliefs or results from the step (only the valuable info, not cycle count)
            if (recentBeliefs.length > 0) {
                recentBeliefs.forEach(belief => {
                    const term = belief.term?.toString?.() || belief.term || 'Unknown';
                    const truth = belief.truth ?
                        `%${belief.truth.frequency?.toFixed(3) || '1.000'},${belief.truth.confidence?.toFixed(3) || '0.900'}%`
                        : '';
                    addLog(`_BELIEF_: ${term} ${truth}`, 'success');
                });
            }
            // Don't log general cycle completion - let the status bar handle cycle tracking
        } catch (error) {
            addLog(`❌ Step error: ${error.message}`, 'error');
        }
    };

    const handleStopCommand = async () => {
        try {
            const result = await engine._stop();
            addLog(result, 'info');
        } catch (error) {
            addLog(`❌ Stop error: ${error.message}`, 'error');
        }
    };

    // Handle slash commands
    const handleSlashCommand = async (command) => {
        const [cmd, ...args] = command.slice(1).split(' ');
        const cmdLower = cmd.toLowerCase();

        switch (cmdLower) {
            case 'exit':
            case 'quit':
            case 'q':
                addLog('👋 Goodbye!', 'info');
                setTimeout(() => {
                    try {
                        engine.shutdown();
                        process.exit(0);
                    } catch (e) {
                        process.exit(0);
                    }
                }, 100);
                break;

            case 'list-examples':
            case 'examples':
            case 'demo':
                // Show available examples
                const examples = [
                    'agent-builder-demo',
                    'causal-reasoning',
                    'inductive-reasoning',
                    'syllogism',
                    'temporal',
                    'performance',
                    'phase10-complete',
                    'phase10-final',
                    'websocket',
                    'lm-providers'
                ];

                addLog('🎭 Available examples:', 'info');
                examples.forEach(example => addLog(`  ${example}`, 'info'));
                break;

            case 'load':
                if (args.length === 0) {
                    addLog('❌ Usage: /load <filepath>', 'error');
                    return;
                }

                // Prevent path traversal (security fix)
                const filePath = args[0];
                if (filePath.includes('../') || filePath.includes('..\\') || filePath.startsWith('../') || filePath.startsWith('..\\')) {
                    addLog('❌ Invalid path: Path traversal not allowed', 'error');
                    return;
                }

                try {
                    // Normalize the path to prevent path traversal
                    const path = await import('path');
                    const normalizedPath = path.resolve('.', filePath);
                    const currentDir = path.resolve('.');

                    // Ensure the normalized path is within the current directory
                    if (!normalizedPath.startsWith(currentDir)) {
                        addLog('❌ Invalid path: Access denied', 'error');
                        return;
                    }

                    await engine.loadSessionState(normalizedPath);
                    addLog(`💾 Session loaded from: ${normalizedPath}`, 'success');
                } catch (error) {
                    addLog(`❌ Error loading file: ${error.message}`, 'error');
                }
                break;

            case 'run':
            case 'go':
                await handleRunCommand();
                break;

            case 'step':
            case 'next':
            case 'n':
                await handleStepCommand();
                break;

            case 'stop':
            case 'st':
                await handleStopCommand();
                break;

            case 'help':
                addLog('📖 Help - Available commands:', 'info');
                addLog('  /exit, /quit, /q - Exit the TUI', 'info');
                addLog('  /list-examples, /examples - Show available examples', 'info');
                addLog('  /load <filepath> - Load session from file', 'info');
                addLog('  /run, /go - Start continuous reasoning', 'info');
                addLog('  /step, /n, [Enter] - Execute single reasoning cycle', 'info');
                addLog('  /stop, /st - Stop continuous reasoning', 'info');
                addLog('  /help - Show this help', 'info');
                addLog('  Use ↑↓ arrows for command history', 'info');
                addLog('  Hotkeys: Ctrl+R(run) Ctrl+S(step) Ctrl+P(pause)', 'info');
                break;

            default:
                addLog(`❌ Unknown command: ${cmd}. Type /help for available commands.`, 'error');
                break;
        }
    };

    // Format log entry with color coding
    const formatLogEntry = (log) => {
        let color = 'white';
        let symbol = 'ℹ️';

        switch (log.type) {
            case 'error':
                color = 'red';
                symbol = '❌';
                break;
            case 'warn':
            case 'warning':
                color = 'yellow';
                symbol = '⚠️';
                break;
            case 'success':
                color = 'green';
                symbol = '✅';
                break;
            case 'debug':
                color = 'blue';
                symbol = '🔬';
                break;
            default:
                color = 'white';
                symbol = 'ℹ️';
        }

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

    return React.createElement(
        Box,
        {flexDirection: 'column', width: '100%', height: '100%'},
        // Log Viewer - now freely flowing without box constraints
        React.createElement(
            Box,
            {
                flexDirection: 'column',
                flexGrow: 1,
                padding: 1,
                maxHeight: '100%'  // Allow it to grow but with constraint for screen
            },
            React.createElement(Text, {bold: true, color: 'cyan'}, `Event Log (${logs.length})`),
            React.createElement(
                Box,
                {
                    flexDirection: 'column',
                    flexGrow: 1,
                    marginTop: 1,
                    marginBottom: 1
                },
                ...logs.slice(-50).map(formatLogEntry) // Show last 50 logs for more activity
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
                        placeholder: 'Enter command or Narsese input...',
                    }
                )
            )
        ),
        // Status Bar at the bottom
        React.createElement(
            Box,
            {
                paddingX: 1,
                backgroundColor: 'blue',
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between'
            },
            React.createElement(
                Box,
                {flexDirection: 'row'},
                React.createElement(Text, {color: 'white', bold: true},
                    `${status.isRunning ? '🚀' : '⏸️'} `),
                React.createElement(Text, {color: 'white'},
                    `Cycle: ${status.cycle} | `),
                React.createElement(Text, {color: 'white'},
                    `Mode: ${status.mode} | `),
                React.createElement(Text, {color: 'white'},
                    `Raw Mode: ${isRawModeSupported ? 'Yes' : 'No'}`)
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

export class SimplifiedTUIRepl {
    constructor(config = {}) {
        this.engine = new ReplEngine(config);
    }

    async start() {
        console.log('🔄 Starting Simplified TUI...');

        // Check for non-interactive environment (security fix)
        if (!process.stdin.isTTY && !process.env.FORCE_TUI) {
            console.error('Error: TUI requires an interactive terminal. Use FORCE_TUI=1 to override.');
            process.exit(1);
        }

        try {
            await this.engine.initialize();

            // Use Ink to render the simplified UI
            render(React.createElement(SimplifiedTUI, {engine: this.engine}));
        } catch (error) {
            console.error('❌ Failed to start TUI:', error);
            process.exit(1);
        }
    }
}