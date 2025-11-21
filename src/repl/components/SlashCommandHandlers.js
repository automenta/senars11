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

// Helper method for tools configuration command
export const handleToolsCommand = (engine, addLog) => {
    try {
        addLog('🔧 Tools/MCP Configuration:', 'info');

        // Show current provider info
        if (engine.agentLM && engine.agentLM.providers) {
            const providers = engine.agentLM.providers;
            addLog(`  Current Agent LM Provider: ${providers.defaultProviderId || 'Default'}`, 'info');
        } else {
            addLog('  Current Agent LM Provider: None', 'info');
        }

        // Check NARS tool integration
        if (engine.nar && typeof engine.nar.getAvailableTools === 'function') {
            const availableTools = engine.nar.getAvailableTools();
            if (Array.isArray(availableTools) && availableTools.length > 0) {
                addLog(`  NARS Available Tools (${availableTools.length}):`, 'info');
                availableTools.forEach((tool, index) => {
                    const toolName = typeof tool === 'string' ? tool :
                        tool.name || tool.id || 'unnamed';
                    addLog(`    ${index + 1}. ${toolName}`, 'info');
                });
            } else {
                addLog('  NARS Tools: None available', 'info');
            }
        } else {
            addLog('  NARS Tools: Not available', 'info');
        }

        // Check if NAR control tool is registered with LM
        if (engine.agentLM) {
            const defaultProviderId = engine.agentLM.providers.defaultProviderId;
            if (defaultProviderId) {
                const provider = engine.agentLM.providers.get(defaultProviderId);
                if (provider && (Array.isArray(provider.tools) || typeof provider.getAvailableTools === 'function')) {
                    const tools = typeof provider.getAvailableTools === 'function' ? provider.getAvailableTools() : provider.tools;

                    const narTools = tools.filter(tool =>
                        tool.name === 'nar_control' || tool.constructor.name === 'NARControlTool'
                    );
                    if (narTools.length > 0) {
                        addLog(`  🤖 LM NAR Control Tools (${narTools.length}):`, 'info');
                        narTools.forEach((tool, index) => {
                            addLog(`    ${index + 1}. ${tool.name || tool.constructor.name}: ${tool.description || 'NAR system control'}`, 'info');

                            // Show tool schema details if available
                            if (tool.schema) {
                                addLog(`        Parameters:`, 'debug');
                                if (tool.schema.properties) {
                                    for (const [propName, propDef] of Object.entries(tool.schema.properties)) {
                                        const type = propDef.type || 'unknown';
                                        const desc = propDef.description || 'No description';
                                        addLog(`          ${propName} (${type}): ${desc}`, 'debug');

                                        if (propDef.enum) {
                                            addLog(`            Options: [${propDef.enum.join(', ')}]`, 'debug');
                                        }
                                    }
                                }
                            }
                        });
                        addLog(`  Note: These tools allow the LM to control the NARS reasoning system`, 'info');
                    }
                }
            }
        }

        // Check MCP system if available
        if (engine.nar && engine.nar.mcp) {
            const mcpTools = engine.nar.mcp.getAvailableTools();
            if (mcpTools && mcpTools.allTools && mcpTools.allTools.length > 0) {
                addLog(`  MCP Tools (${mcpTools.allTools.length}):`, 'info');
                mcpTools.allTools.forEach((tool, index) => {
                    addLog(`    ${index + 1}. ${typeof tool === 'string' ? tool : tool.name || 'unnamed'}`, 'info');
                });
            } else {
                addLog('  MCP Tools: None available', 'info');
            }
        } else {
            addLog('  MCP Tools: Not available', 'info');
        }

        // Information about tools integration
        addLog('  How Tools Work: LM can call tools based on user requests to interact with NARS', 'info');
    } catch (error) {
        addLog(`❌ Error showing tools configuration: ${error.message}`, 'error');
    }
};

// Helper method for nars command to force input as narsese
export const handleNarsCommand = async (engine, args, addLog) => {
    try {
        const narseseInput = args.join(' ');
        if (!narseseInput) {
            addLog('❌ Usage: /nars <narsese-statement>', 'error');
            return;
        }

        addLog(`> /nars ${narseseInput}`, 'info');

        // Process directly as narsese without going through LM
        const result = await engine.processNarsese(narseseInput);
        if (result) {
            addLog(`✅ Narsese processed: ${result}`, 'success');
        } else {
            addLog(`✅ Narsese processed successfully`, 'success');
        }
    } catch (error) {
        addLog(`❌ Narsese processing error: ${error.message}`, 'error');
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
        '  /tools - Show Tools/MCP configuration',
        '  /nars <statement> - Force input as narsese',
        '  /help - Show this help',
        '  Use ↑↓ arrows for command history',
        '  Hotkeys: Ctrl+R(run) Ctrl+P(pause) Ctrl+H(help)',
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
        try {
            engine.shutdown();
        } catch (e) { /* ignore */
        }
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