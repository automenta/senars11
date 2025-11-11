/**
 * Modular slash command handlers for AgentInkTUI
 */

// Helper method for load command
export const handleLoadCommand = async (engine, args, addLog) => {
    const [filePath] = args;
    if (filePath.includes('../') || filePath.includes('..\\') || filePath.startsWith('../') || filePath.startsWith('..\\')) {
        addLog('❌ Invalid path: Path traversal not allowed', 'error');
        return;
    }

    try {
        const path = await import('path');
        const normalizedPath = path.resolve('.', filePath);
        const currentDir = path.resolve();
        
        if (!normalizedPath.startsWith(currentDir)) {
            addLog('❌ Invalid path: Access denied', 'error');
            return;
        }

        await engine.loadSessionState(normalizedPath);
        addLog(`💾 Session loaded from: ${normalizedPath}`, 'success');
    } catch (error) {
        addLog(`❌ Error loading file: ${error.message}`, 'error');
    }
};

// Helper method for help command
export const handleHelpCommand = (addLog) => {
    const helpMessages = [
        '📖 Help - Available commands:',
        '  /exit, /quit, /q - Exit the TUI',
        '  /list-examples, /examples - Show available examples', 
        '  /load <filepath> - Load session from file',
        '  /run, /go - Start continuous reasoning',
        '  /step, /n, [Enter] - Execute single reasoning cycle',
        '  /stop, /st - Stop continuous reasoning',
        '  /help - Show this help',
        '  Use ↑↓ arrows for command history',
        '  Hotkeys: Ctrl+R(run) Ctrl+S(step) Ctrl+P(pause)',
        '  🤖 Agent commands:',
        '  agent create <name> - Create a new agent',
        '  agent list - List all agents',
        '  agent-status - Show agent status',
        '  goal <description> - Set a goal for the agent',
        '  plan <description> - Create a plan',
        '  think <topic> - Have agent think about a topic',
        '  reason <statement> - Perform reasoning'
    ];
    helpMessages.forEach(msg => addLog(msg, 'info'));
};

// Handle exit command
export const handleExitCommand = (engine, addLog) => {
    addLog('👋 Goodbye!', 'info');
    setTimeout(() => {
        try { engine.shutdown(); } catch (e) { /* ignore */ }
        process.exit(0);
    }, 100);
};

// Handle examples command
export const handleExamplesCommand = (addLog) => {
    addLog('🎭 Available examples:', 'info');
    [
        'agent-builder-demo', 'causal-reasoning', 'inductive-reasoning', 
        'syllogism', 'temporal', 'performance', 'phase10-complete', 
        'phase10-final', 'websocket', 'lm-providers'
    ].forEach(example => addLog(`  ${example}`, 'info'));
};

// Generic execution and logging
export const executeAndLog = async (engine, promise, operationName, addLog) => {
    try {
        const result = await promise;
        addLog(result, 'success');
        return result;
    } catch (error) {
        addLog(`❌ ${operationName} error: ${error.message}`, 'error');
    }
};

// Handle run command
export const handleRunCommand = async (engine, addLog) => {
    return await executeAndLog(engine, engine.executeCommand('go'), 'Run', addLog);
};

// Handle step command
export const handleStepCommand = async (engine, addLog) => {
    return await executeAndLog(engine, engine._next(), 'Step', addLog);
};

// Handle stop command
export const handleStopCommand = async (engine, addLog) => {
    return await executeAndLog(engine, engine._stop(), 'Stop', addLog);
};