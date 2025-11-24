/**
 * Additional Command Implementations for Enhanced REPL
 */

import {AgentCommand} from './Commands.js';
import {FormattingUtils as ReplFormattingUtils} from '../utils/FormattingUtils.js';
import {FormattingUtils as TaskFormattingUtils} from '../../util/FormattingUtils.js';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration Commands
export class ConfigCommand extends AgentCommand {
    constructor() {
        super('config', 'Show or modify system configuration', 'config [key] [value]');
    }

    async _executeImpl(agent, ...args) {
        if (!agent.config) return '❌ Config access not available.';

        if (args.length === 0) {
            // Display current configuration in a table format
            const configEntries = Object.entries(agent.config).filter(([key]) => 
                !['memory', 'reasoner', 'components'].includes(key) // Filter out complex objects
            );
            
            if (configEntries.length === 0) return 'No accessible config entries.';
            
            const tableData = configEntries.map(([key, value]) => [
                key,
                typeof value === 'object' ? JSON.stringify(value) : String(value)
            ]);

            const headers = ['Key', 'Value'];
            const table = ReplFormattingUtils.formatTable(tableData, headers);

            return `⚙️ System Configuration:\n${table}`;
        } else if (args.length === 1) {
            // Show specific configuration value
            const key = args[0];
            if (agent.config[key] !== undefined) {
                return `⚙️ ${key}: ${JSON.stringify(agent.config[key])}`;
            } else {
                return `❌ Config key '${key}' not found.`;
            }
        } else if (args.length === 2) {
            // Attempt to modify configuration (if supported)
            const key = args[0];
            const value = args[1];
            
            // Try to parse as JSON if it looks like it might be
            let parsedValue = value;
            try {
                parsedValue = JSON.parse(value);
            } catch (e) {
                // If parsing fails, use as string
            }
            
            if (agent.setConfigValue) {
                await agent.setConfigValue(key, parsedValue);
                return `✅ Config ${key} set to: ${JSON.stringify(parsedValue)}`;
            } else {
                return `❌ Config modification not supported. Can only read: ${key}`;
            }
        }
        
        return 'Usage: config [key] [value]';
    }
}

export class VerboseCommand extends AgentCommand {
    constructor() {
        super('verbose', 'Toggle verbose output mode', 'verbose [on|off]');
    }

    async _executeImpl(agent, ...args) {
        if (args.length === 0) {
            // Toggle verbose mode
            agent.verbose = !agent.verbose;
            return `Verbose mode: ${agent.verbose ? 'ON' : 'OFF'}`;
        }

        if (args[0] === 'on') {
            agent.verbose = true;
            return '✅ Verbose mode enabled.';
        } else if (args[0] === 'off') {
            agent.verbose = false;
            return '✅ Verbose mode disabled.';
        }
        
        return 'Usage: verbose [on|off]';
    }
}

// Visualization Commands
export class GraphCommand extends AgentCommand {
    constructor() {
        super('graph', 'Visualize concept relationships as graph', 'graph [term|all]');
    }

    async _executeImpl(agent, ...args) {
        if (!agent.memory || typeof agent.memory.getAllConcepts !== 'function') {
            return '❌ Concept memory access not available.';
        }

        const allConcepts = agent.memory.getAllConcepts();
        
        if (allConcepts.length === 0) {
            return 'No concepts available for graphing.';
        }

        if (args.length === 0 || args[0] === 'all') {
            // Show summary of concept relationships
            const relationships = [];
            let totalLinks = 0;
            
            for (const concept of allConcepts) {
                const beliefCount = concept.getBeliefs ? concept.getBeliefs().length : 0;
                const goalCount = concept.getGoals ? concept.getGoals().length : 0;
                totalLinks += beliefCount + goalCount;
                
                if (beliefCount + goalCount > 0) {
                    relationships.push({
                        term: concept.term?.toString() ?? concept.term ?? 'Unknown',
                        beliefs: beliefCount,
                        goals: goalCount
                    });
                }
            }
            
            return `📊 Concept Relationship Summary:\nTotal concepts: ${allConcepts.length}\nTotal relationships: ${totalLinks}\n${relationships.slice(0, 10).map(r => `${r.term} (${r.beliefs} beliefs, ${r.goals} goals)`).join('\n')}${allConcepts.length > 10 ? '\n... and more' : ''}`;
        } else {
            // Show specific term relationships
            const term = args[0];
            const concept = allConcepts.find(c => 
                (c.term?.toString?.() ?? c.term ?? '').toString().includes(term)
            );
            
            if (!concept) {
                return `❌ Concept '${term}' not found.`;
            }
            
            const beliefs = concept.getBeliefs ? concept.getBeliefs() : [];
            const goals = concept.getGoals ? concept.getGoals() : [];
            
            let output = `🔗 Concept: ${concept.term?.toString() ?? concept.term ?? 'Unknown'}\n`;
            output += `  Beliefs (${beliefs.length}):\n`;
            output += beliefs.slice(0, 5).map(b => `    • ${b.term?.toString() ?? b.term ?? 'Unknown'}`).join('\n');
            output += `\n  Goals (${goals.length}):\n`;
            output += goals.slice(0, 5).map(g => `    • ${g.term?.toString() ?? g.term ?? 'Unknown'}`).join('\n');
            
            return output;
        }
    }
}

export class PriorityCommand extends AgentCommand {
    constructor() {
        super('priority', 'Show priority queue information', 'priority [n]');
    }

    async _executeImpl(agent, ...args) {
        // Try to access priority information from different possible locations
        let priorityData = [];
        
        // Check if agent has priority-related methods or properties
        if (agent.memory?.getPriorityInfo) {
            priorityData = agent.memory.getPriorityInfo();
        } else if (agent.focus?.getPriorities) {
            priorityData = agent.focus.getPriorities();
        } else if (agent.componentManager) {
            const focus = agent.componentManager.getComponent('focus');
            if (focus && focus.getPriorities) {
                priorityData = focus.getPriorities();
            }
        }
        
        if (!priorityData || priorityData.length === 0) {
            return 'No priority information available.';
        }
        
        const n = args.length > 0 ? parseInt(args[0]) : 10;
        const itemsToShow = priorityData.slice(0, n);
        
        if (itemsToShow.length === 0) return 'No priority items to display.';
        
        const tableData = itemsToShow.map((item, i) => [
            i + 1,
            item.term?.toString() ?? item.term ?? 'Unknown',
            (item.priority || item.activation || 0).toFixed(3)
        ]);

        const headers = ['No.', 'Term', 'Priority'];
        const table = ReplFormattingUtils.formatTable(tableData, headers);

        return `⚡ Priority Queue (top ${itemsToShow.length}):\n${table}`;
    }
}

export class DerivationsCommand extends AgentCommand {
    constructor() {
        super('derivations', 'Show recent derivations', 'derivations [n]');
    }

    async _executeImpl(agent, ...args) {
        // Try to access derivation history if available
        if (!agent.derivationHistory) {
            return 'No derivation history available.';
        }
        
        const n = args.length > 0 ? parseInt(args[0]) : 10;
        const derivations = agent.derivationHistory.slice(-n);
        
        if (derivations.length === 0) return 'No recent derivations.';
        
        const lines = derivations.map((derivation, i) => 
            `${i + 1}. ${derivation.toString ? derivation.toString() : derivation}`
        );
        
        return `🔄 Recent Derivations:\n${lines.join('\n')}`;
    }
}

// User Interaction Commands
export class TimerCommand extends AgentCommand {
    constructor() {
        super('timer', 'Set a timer for system operations', 'timer <ms> <narsese>');
    }

    async _executeImpl(agent, ...args) {
        if (args.length < 2) {
            return 'Usage: timer <ms> <narsese> - Execute narsese after specified milliseconds';
        }
        
        const ms = parseInt(args[0]);
        if (isNaN(ms) || ms <= 0) {
            return '❌ Invalid time. Use positive integer for milliseconds.';
        }
        
        const narsese = args.slice(1).join(' ');
        
        setTimeout(async () => {
            try {
                await agent.processInput(narsese);
                agent.emit('log', `⏰ Timer executed: ${narsese}`);
            } catch (e) {
                agent.emit('log', `❌ Timer error: ${e.message}`);
            }
        }, ms);
        
        return `⏰ Timer set: ${ms}ms for "${narsese}"`;
    }
}

export class BatchCommand extends AgentCommand {
    constructor() {
        super('batch', 'Execute multiple commands in sequence', 'batch <cmd1> [cmd2] ...');
    }

    async _executeImpl(agent, ...args) {
        if (args.length === 0) {
            return 'Usage: batch <cmd1> [cmd2] ... - Execute multiple commands';
        }
        
        const results = [];
        for (const cmd of args) {
            try {
                let result;
                if (cmd.startsWith('/')) {
                    // Execute slash command
                    const [cmdName, ...cmdArgs] = cmd.slice(1).split(' ');
                    result = await agent.commandRegistry.execute(cmdName, agent, ...cmdArgs);
                } else {
                    // Execute Narsese
                    result = await agent.processInput(cmd);
                }
                results.push(`✅ ${cmd}: ${result || 'OK'}`);
            } catch (error) {
                results.push(`❌ ${cmd}: ${error.message}`);
            }
        }
        
        return `📦 Batch execution completed:\n${results.join('\n')}`;
    }
}

export class ExportCommand extends AgentCommand {
    constructor() {
        super('export', 'Export system state to various formats', 'export <format> [filename]');
    }

    async _executeImpl(agent, ...args) {
        if (args.length === 0) {
            return `Available export formats: json, csv, dot, text`;
        }
        
        const format = args[0];
        const filename = args[1] || `export-${Date.now()}.${format}`;
        
        let content = '';
        let success = false;
        
        try {
            switch (format) {
                case 'json':
                    // Export as JSON
                    const exportData = {
                        cycleCount: agent.cycleCount,
                        concepts: agent.memory?.getAllConcepts ? 
                            agent.memory.getAllConcepts().map(c => ({
                                term: c.term?.toString(),
                                activation: c.activation,
                                beliefCount: c.getBeliefs ? c.getBeliefs().length : 0,
                                goalCount: c.getGoals ? c.getGoals().length : 0
                            })) : [],
                        config: agent.config
                    };
                    content = JSON.stringify(exportData, null, 2);
                    success = true;
                    break;
                    
                case 'csv':
                    // Simple CSV export of concepts
                    const concepts = agent.memory?.getAllConcepts ? agent.memory.getAllConcepts() : [];
                    const csvRows = [['Term', 'Activation', 'Beliefs', 'Goals']];
                    for (const c of concepts) {
                        csvRows.push([
                            c.term?.toString() || 'Unknown',
                            c.activation || 0,
                            c.getBeliefs ? c.getBeliefs().length : 0,
                            c.getGoals ? c.getGoals().length : 0
                        ]);
                    }
                    content = csvRows.map(row => row.join(',')).join('\n');
                    success = true;
                    break;
                    
                case 'dot':
                    // DOT format for graph visualization (simplified)
                    content = 'digraph SeNARS {\n  rankdir=TB;\n';
                    const allConcepts = agent.memory?.getAllConcepts ? agent.memory.getAllConcepts() : [];
                    for (let i = 0; i < Math.min(10, allConcepts.length); i++) {
                        const concept = allConcepts[i];
                        const term = concept.term?.toString() || `Concept${i}`;
                        content += `  "${term}" [label="${term}"];\n`;
                    }
                    content += '}\n';
                    success = true;
                    break;
                    
                default:
                    return `❌ Unsupported format: ${format}. Available: json, csv, dot, text`;
            }
        } catch (error) {
            return `❌ Export failed: ${error.message}`;
        }
        
        if (success) {
            try {
                fs.writeFileSync(filename, content);
                return `💾 Exported to ${filename} (${content.length} chars)`;
            } catch (error) {
                return `❌ Failed to write file: ${error.message}`;
            }
        }
        
        return '❌ Export failed.';
    }
}

export class ImportCommand extends AgentCommand {
    constructor() {
        super('import', 'Import from file to system', 'import <filename>');
    }

    async _executeImpl(agent, ...args) {
        if (args.length === 0) {
            return 'Usage: import <filename>';
        }
        
        const filename = args[0];
        
        try {
            if (!fs.existsSync(filename)) {
                return `❌ File not found: ${filename}`;
            }
            
            const content = fs.readFileSync(filename, 'utf-8');
            
            // Determine import type by file extension
            if (filename.endsWith('.json')) {
                // Try to import JSON data as configuration or state
                const data = JSON.parse(content);
                if (data.concepts) {
                    // Handle concept import - this would require specific implementation
                    return `⚠️ JSON import not fully implemented. Found ${data.concepts.length} concepts to import.`;
                }
            } else if (filename.endsWith('.nars') || filename.endsWith('.txt')) {
                // Process as Narsese commands
                const lines = content.split('\n');
                let imported = 0;
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
                    
                    if (trimmed.startsWith('/')) {
                        // Execute slash command
                        const [cmd, ...cmdArgs] = trimmed.slice(1).split(' ');
                        await agent.commandRegistry.execute(cmd, agent, ...cmdArgs);
                    } else {
                        // Execute as Narsese
                        await agent.processInput(trimmed);
                    }
                    imported++;
                }
                
                return `📥 Imported ${imported} lines from ${filename}`;
            }
            
            return `❌ Unsupported import format for: ${filename}`;
        } catch (error) {
            return `❌ Import failed: ${error.message}`;
        }
    }
}

export class SearchCommand extends AgentCommand {
    constructor() {
        super('search', 'Search through system data', 'search <type> <query>');
    }

    async _executeImpl(agent, ...args) {
        if (args.length < 2) {
            return 'Usage: search <concepts|beliefs|goals|tasks|all> <query>';
        }
        
        const type = args[0].toLowerCase();
        const query = args.slice(1).join(' ').toLowerCase();
        
        let results = [];
        
        switch (type) {
            case 'concepts':
            case 'concept':
                if (agent.memory?.getAllConcepts) {
                    const allConcepts = agent.memory.getAllConcepts();
                    results = allConcepts.filter(c => 
                        (c.term?.toString?.() || '').toLowerCase().includes(query)
                    );
                    
                    const resultLines = results.slice(0, 15).map(c => 
                        `• ${c.term?.toString() ?? 'Unknown'} (act: ${(c.activation || 0).toFixed(3)})`
                    );
                    
                    return `🔍 Found ${results.length} concepts containing "${query}":\n${resultLines.join('\n')}`;
                }
                break;
                
            case 'beliefs':
            case 'belief':
                if (agent.getBeliefs) {
                    const beliefs = agent.getBeliefs();
                    results = beliefs.filter(b => 
                        (b.term?.toString?.() || '').toLowerCase().includes(query)
                    );
                    
                    const resultLines = results.slice(0, 15).map(b =>
                        `• ${TaskFormattingUtils.formatTask(b)}`
                    );

                    return `🔍 Found ${results.length} beliefs containing "${query}":\n${resultLines.join('\n')}`;
                }
                break;
                
            case 'goals':
            case 'goal':
                if (agent.getGoals) {
                    const goals = agent.getGoals();
                    results = goals.filter(g => 
                        (g.term?.toString?.() || '').toLowerCase().includes(query)
                    );
                    
                    const resultLines = results.slice(0, 15).map(g =>
                        `• ${TaskFormattingUtils.formatTask(g)}`
                    );

                    return `🔍 Found ${results.length} goals containing "${query}":\n${resultLines.join('\n')}`;
                }
                break;
                
            case 'tasks':
            case 'task':
                // Check multiple task sources
                let allTasks = [];
                
                if (agent.inputQueue && agent.inputQueue.getAllTasks) {
                    allTasks.push(...agent.inputQueue.getAllTasks().map(item => item.task));
                }
                
                if (agent.focus && agent.focus.getTasks) {
                    allTasks.push(...agent.focus.getTasks(50));
                }
                
                results = allTasks.filter(t => 
                    (t.term?.toString?.() || '').toLowerCase().includes(query)
                );
                
                const uniqueTasks = new Map();
                results.forEach(task => {
                    const key = TaskFormattingUtils.formatTask(task);
                    if (!uniqueTasks.has(key)) uniqueTasks.set(key, task);
                });

                const uniqueResults = Array.from(uniqueTasks.values());
                const resultLines = uniqueResults.slice(0, 15).map(t =>
                    `• ${TaskFormattingUtils.formatTask(t)}`
                );

                return `🔍 Found ${uniqueResults.length} tasks containing "${query}":\n${resultLines.join('\n')}`;
                
            case 'all':
                // Search all types
                const searchResults = [];
                
                // Search concepts
                if (agent.memory?.getAllConcepts) {
                    const concepts = agent.memory.getAllConcepts().filter(c => 
                        (c.term?.toString?.() || '').toLowerCase().includes(query)
                    );
                    searchResults.push(...concepts.map(c => `Concept: ${c.term?.toString() ?? 'Unknown'}`));
                }
                
                // Search beliefs
                if (agent.getBeliefs) {
                    const beliefs = agent.getBeliefs().filter(b => 
                        (b.term?.toString?.() || '').toLowerCase().includes(query)
                    );
                    searchResults.push(...beliefs.map(b => `Belief: ${TaskFormattingUtils.formatTask(b)}`));
                }
                
                // Search goals
                if (agent.getGoals) {
                    const goals = agent.getGoals().filter(g => 
                        (g.term?.toString?.() || '').toLowerCase().includes(query)
                    );
                    searchResults.push(...goals.map(g => `Goal: ${TaskFormattingUtils.formatTask(g)}`));
                }
                
                const resultLinesAll = searchResults.slice(0, 20).map(r => `• ${r}`);
                return `🔍 Found ${searchResults.length} items containing "${query}" across all types:\n${resultLinesAll.join('\n')}`;
                
            default:
                return `❌ Unknown search type: ${type}. Use concepts, beliefs, goals, tasks, or all.`;
        }
        
        return '❌ Search not supported for this agent.';
    }
}

export class ProfileCommand extends AgentCommand {
    constructor() {
        super('profile', 'Profile system performance', 'profile [duration]');
    }

    async _executeImpl(agent, ...args) {
        const duration = args.length > 0 ? parseInt(args[0]) : 5000; // Default 5 seconds
        
        if (isNaN(duration) || duration <= 0) {
            return '❌ Invalid duration. Use positive number of milliseconds.';
        }
        
        // Store initial stats
        const initialCycleCount = agent.cycleCount || 0;
        const initialBeliefs = agent.getBeliefs ? agent.getBeliefs().length : 0;
        const initialMemory = process.memoryUsage().heapUsed;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                const finalCycleCount = agent.cycleCount || 0;
                const finalBeliefs = agent.getBeliefs ? agent.getBeliefs().length : 0;
                const finalMemory = process.memoryUsage().heapUsed;
                
                const cyclesProcessed = finalCycleCount - initialCycleCount;
                const beliefsChange = finalBeliefs - initialBeliefs;
                const memoryChange = finalMemory - initialMemory;
                
                const cyclesPerSecond = Math.round((cyclesProcessed / duration) * 1000);
                const memoryMBChange = (memoryChange / (1024 * 1024)).toFixed(2);
                
                resolve(`⏱️ System Profile (${duration}ms):\n  Cycles processed: ${cyclesProcessed}\n  Cycles/sec: ${cyclesPerSecond}\n  Belief change: ${beliefsChange}\n  Memory change: ${memoryMBChange}MB`);
            }, duration);
        });
    }
}

export class WatchCommand extends AgentCommand {
    constructor() {
        super('watch', 'Watch for specific events or changes', 'watch <type> <condition>');
    }

    async _executeImpl(agent, ...args) {
        if (args.length < 2) {
            return 'Usage: watch <type> <condition>\nExamples: watch beliefs <a --> b>, watch concepts dog, watch goals achieve';
        }
        
        const type = args[0].toLowerCase();
        const condition = args.slice(1).join(' ');
        
        // This would typically set up event listeners
        if (!agent.on) {
            return '❌ Event watching not supported by this agent.';
        }
        
        // Store active watches in agent
        if (!agent.activeWatches) agent.activeWatches = new Set();
        
        // Create a unique watch ID
        const watchId = `${type}:${condition}:${Date.now()}`;
        agent.activeWatches.add(watchId);
        
        // Register an event listener based on the watch type
        let eventName = '';
        let eventHandler = null;
        
        switch (type) {
            case 'beliefs':
            case 'belief':
                eventName = 'task.added';
                eventHandler = (task) => {
                    if (task.type === 'BELIEF' && 
                        (task.term?.toString?.() || '').includes(condition)) {
                        agent.emit('log', `🔍 Watch triggered: New belief matching "${condition}": ${task.term}`);
                    }
                };
                break;
                
            case 'goals':
            case 'goal':
                eventName = 'task.added';
                eventHandler = (task) => {
                    if (task.type === 'GOAL' && 
                        (task.term?.toString?.() || '').includes(condition)) {
                        agent.emit('log', `🔍 Watch triggered: New goal matching "${condition}": ${task.term}`);
                    }
                };
                break;
                
            case 'concepts':
            case 'concept':
                eventName = 'concept.created';
                eventHandler = (concept) => {
                    if ((concept.term?.toString?.() || '').includes(condition)) {
                        agent.emit('log', `🔍 Watch triggered: New concept matching "${condition}": ${concept.term}`);
                    }
                };
                break;
                
            default:
                return `❌ Unknown watch type: ${type}`;
        }
        
        if (eventHandler && eventName && agent.on) {
            agent.on(eventName, eventHandler);
            
            // Store watch info for later cleanup
            if (!agent.watchHandlers) agent.watchHandlers = new Map();
            agent.watchHandlers.set(watchId, { event: eventName, handler: eventHandler });
            
            return `👁️ Watching for ${type} matching "${condition}". Watch ID: ${watchId}`;
        }
        
        return `❌ Cannot watch for ${type} with condition "${condition}".`;
    }
}

// Help command with extended functionality
export class ExtendedHelpCommand extends AgentCommand {
    constructor() {
        super('help', 'Show comprehensive command help with categories', 'help [category|command]');
    }

    async _executeImpl(agent, ...args) {
        if (args.length === 0) {
            return `🤖 SeNARS REPL - Extended Help
            
📊 System Control Commands:
  /config [key] [value] - Show/modify system configuration
  /stats - Show system health statistics  
  /memory - Show memory statistics
  /cycle - Show current inference cycle
  /reset - Reset the system
  /verbose [on|off] - Toggle verbose output mode

🔍 Information & Visualization:
  /beliefs - Show focus beliefs
  /goals - Show focus goals  
  /questions - Show active questions
  /concepts [term] - List concepts or specific term
  /tasks [term] - List current tasks
  /graph [term|all] - Visualize concept relationships
  /priority [n] - Show priority queue
  /derivations [n] - Show recent derivations
  /search <type> <query> - Search system data

⚙️ Execution Controls:
  /run <path> - Execute .nars file
  /demo [name] - List or run demos
  /step [n] - Execute n inference cycles
  /trace [on|off] - Toggle derivation trace
  /quiet [on|off] - Toggle quiet mode

🔄 Batch & Advanced:
  /batch <cmd1> [cmd2] ... - Execute multiple commands
  /timer <ms> <narsese> - Schedule command execution
  /export <format> [file] - Export system state
  /import <file> - Import from file
  /profile [ms] - Profile system performance
  /watch <type> <condition> - Watch for specific changes

💬 Language Model:
  /lm <prompt> - Direct LM communication
  /think <topic> - Agent reflection
  /reason <stmt> - Perform reasoning
  /plan <desc> - Generate plan
  /providers [list|select] - Manage LM providers

🔧 Tools & Utilities:
  /tools - Show tools/MCP configuration
  /agent [status] - Manage agent status
  /history [n] - Show command history
  /last - Re-execute last command
  /theme [name] - Change terminal theme

Use /help <command> for detailed usage of specific commands.`;
        } else {
            // Show detailed help for specific command
            const cmdName = args[0];
            const registry = agent.commandRegistry;
            if (registry) {
                const cmd = registry.get(cmdName);
                if (cmd) {
                    return `📋 Command: /${cmd.name}\nDescription: ${cmd.description}\nUsage: ${cmd.usage}`;
                }
            }
            return `❌ Command not found: ${cmdName}`;
        }
    }
}