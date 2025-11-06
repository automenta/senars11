/**
 * Shared command processor for SeNARS TUI components
 * Provides common command handling functionality shared between different UI components
 */
import {DEMO_COMMANDS} from '../config/constants.js';
import {DisplayUtils} from './DisplayUtils.js';

const COMMANDS = DEMO_COMMANDS;

export class CommandProcessor {
    constructor(nar, persistenceManager, sessionState) {
        this.nar = nar;
        this.persistenceManager = persistenceManager;
        this.sessionState = sessionState;
        this.commands = this._createCommandMap();
        this.traceEnabled = false;
    }

    _createCommandMap() {
        const map = new Map();
        for (const [method, aliases] of Object.entries(COMMANDS)) {
            // Skip next command as it should be handled by specific interfaces
            if (method === 'next') continue;

            for (const alias of aliases) {
                // Bind methods dynamically if they exist on this instance
                if (typeof this[`_${method}`] === 'function') {
                    map.set(alias, this[`_${method}`].bind(this));
                }
            }
        }
        return map;
    }

    getCommandMap() {
        return this.commands;
    }

    getCommandFunction(commandName) {
        return this.commands.get(commandName);
    }

    async executeCommand(cmd, ...args) {
        const commandFn = this.commands.get(cmd);
        if (!commandFn) {
            return `❌ Unknown command: ${cmd}. Type '/help' for available commands.`;
        }

        try {
            const result = await commandFn(args);
            return result;
        } catch (error) {
            return `❌ Error executing command: ${error.message}`;
        }
    }

    _help() {
        return `🤖 Available commands:
  /help, /h, /?     - Show this help message 📚
  /quit, /q, /exit  - Quit the REPL 🚪
  /status, /s, /stats - Show system status 📊
  /memory, /m       - Show memory statistics 💾
  /trace, /t        - Show reasoning trace 🔍
  /reset, /r        - Reset the NAR system 🔄
  /save, /sv        - Save current agent state to file 💾
  /load, /ld        - Load agent state from file 📁
  /demo, /d         - Run an example/demo (use "/demo" for list) 🎭
  
🎯 Narsese input examples:
  (bird --> animal).                     (inheritance statement)
  (robin --> bird). %1.0;0.9%           (with truth values)
  (robin --> animal)?                   (question)
  (robin --> fly)!                      (goal)`;
    }

    _status() {
        const stats = this.nar.getStats();
        const memoryStats = stats.memoryStats || {};

        return `📊 System Status:
  ⚡ Running: ${stats.isRunning ? 'Yes' : 'No'}
  🕒 Internal Clock: ${stats.cycleCount || 0}
  🔄 Cycles: ${stats.cycleCount || 0}
  🧠 Memory Concepts: ${memoryStats.conceptCount || memoryStats.totalConcepts || 0}
  🎯 Focus Tasks: ${memoryStats.focusTaskCount || memoryStats.focusConceptsCount || 0}
  📋 Total Tasks: ${memoryStats.taskCount || memoryStats.totalTasks || 0}
  🕐 Start Time: ${new Date(this.sessionState.startTime).toISOString()}`;
    }

    _memory() {
        const stats = this.nar.getStats();
        const memoryStats = stats.memoryStats || {};

        const conceptCount = memoryStats.conceptCount || memoryStats.totalConcepts || 0;
        const taskCount = memoryStats.taskCount || memoryStats.totalTasks || 0;
        const focusSize = memoryStats.focusTaskCount || memoryStats.focusConceptsCount || 0;
        const avgPriority = memoryStats.avgPriority || memoryStats.averagePriority || 0;
        const capacity = this.nar.config?.memory?.maxConcepts || 'N/A';
        const forgettingThreshold = this.nar.config?.memory?.priorityThreshold || 'N/A';

        return `💾 Memory Statistics:
  🧠 Concepts: ${DisplayUtils.formatNumber(conceptCount)}
  📋 Tasks in Memory: ${DisplayUtils.formatNumber(taskCount)}
  🎯 Focus Set Size: ${DisplayUtils.formatNumber(focusSize)}
  📏 Concept Capacity: ${capacity}
  ⚠️ Forgetting Threshold: ${forgettingThreshold}
  📊 Average Concept Priority: ${avgPriority.toFixed(3)}`;
    }

    _trace() {
        const beliefs = this.nar.getBeliefs();
        if (beliefs.length === 0) {
            return '🔍 No recent beliefs found.';
        }

        // Format the beliefs using DisplayUtils for consistency
        const beliefLines = beliefs.slice(-5).map(task => {
            // Using a simple format for now, could be enhanced later
            const term = task.term?.toString?.() || task.term || 'Unknown';
            const truthStr = task.truth ? ` %${task.truth.frequency?.toFixed(3) || '1.000'},${task.truth.confidence?.toFixed(3) || '0.900'}%` : '';
            const priority = task.budget?.priority !== undefined ? `$${task.budget.priority.toFixed(3)} ` : '';
            return `  ${priority}${term}${truthStr}`;
        });

        return [
            '🔍 Recent Beliefs (last 5):',
            ...beliefLines
        ].join('\n');
    }

    _reset() {
        this.nar.reset();
        this.sessionState.history = [];
        this.sessionState.lastResult = null;
        return '🔄 NAR system reset successfully.';
    }

    async _save() {
        try {
            const state = this.nar.serialize();
            const result = await this.persistenceManager.saveToDefault(state);
            return `💾 NAR state saved successfully to ${result.filePath} (${DisplayUtils.formatFileSize(result.size)})`;
        } catch (error) {
            return `❌ Error saving NAR state: ${error.message}`;
        }
    }

    async _load() {
        try {
            const exists = await this.persistenceManager.exists();
            if (!exists) {
                return `📁 Save file does not exist: ${this.persistenceManager.defaultPath}`;
            }

            const state = await this.persistenceManager.loadFromDefault();
            const success = await this.nar.deserialize(state);

            return success
                ? `💾 NAR state loaded successfully from ${this.persistenceManager.defaultPath}`
                : '❌ Failed to load NAR state - deserialization error';
        } catch (error) {
            return `❌ Error loading NAR state: ${error.message}`;
        }
    }

    _quit() {
        // This should be handled by the specific interface
        return '👋 Goodbye!';
    }

    async _demo(args) {
        const exampleName = args && args.length > 0 ? args[0] : null;

        if (!exampleName) {
            const examples = [
                'agent-builder-demo     - Demonstrates building agents with various capabilities',
                'causal-reasoning       - Shows causal reasoning capabilities',
                'inductive-reasoning    - Demonstrates inductive inference',
                'syllogism              - Classic syllogistic reasoning examples',
                'temporal               - Temporal reasoning demonstrations',
                'performance            - Performance benchmarking example',
                'phase10-complete       - Full phase 10 reasoning demonstration',
                'phase10-final          - Final comprehensive demonstration',
                'websocket              - WebSocket monitoring example',
                'lm-providers           - Language model provider integrations'
            ];

            return [
                '🎭 Available examples:',
                ...examples.map(line => `  ${line}`),
                '',
                'Usage: /demo <example-name> (without the .js extension)'
            ].join('\n');
        }

        // Map example names to file paths
        const exampleMap = {
            'agent-builder': '../examples/agent-builder-demo.js',
            'agent-builder-demo': '../examples/agent-builder-demo.js',
            'causal-reasoning': '../examples/causal-reasoning-demo.js',
            'causal-reasoning-demo': '../examples/causal-reasoning-demo.js',
            'inductive-reasoning': '../examples/inductive-reasoning-demo.js',
            'inductive-reasoning-demo': '../examples/inductive-reasoning-demo.js',
            'syllogism': '../examples/syllogism-demo.js',
            'syllogism-demo': '../examples/syllogism-demo.js',
            'temporal': '../examples/temporal-reasoning-demo.js',
            'temporal-reasoning': '../examples/temporal-reasoning-demo.js',
            'temporal-reasoning-demo': '../examples/temporal-reasoning-demo.js',
            'performance': '../examples/performance-benchmark.js',
            'performance-benchmark': '../examples/performance-benchmark.js',
            'phase10-complete': '../examples/phase10-complete-demo.js',
            'phase10-final': '../examples/phase10-final-demo.js',
            'phase10-final-demo': '../examples/phase10-final-demo.js',
            'websocket': '../examples/websocket-monitoring-test.js',
            'websocket-demo': '../examples/websocket-monitoring-test.js',
            'websocket-monitoring': '../examples/websocket-monitoring-test.js',
            'lm-providers': '../examples/lm-providers.js',
            'basic-usage': '../examples/basic-usage.js'
        };

        const examplePath = exampleMap[exampleName];
        if (!examplePath) {
            return `❌ Unknown example: ${exampleName}. Use "/demo" for a list of available examples.`;
        }

        try {
            // Import and run the example
            const path = await import('path');
            const url = await import('url');

            // Get the current directory and build the absolute path
            const __filename = url.fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const filePath = path.resolve(__dirname, examplePath);

            // Import using file:// URL protocol
            const exampleModule = await import(`file://${filePath}`);

            // If the example has a default export that's a function, call it with the current NAR instance
            if (exampleModule.default && typeof exampleModule.default === 'function') {
                // For command-line interface, we'll just indicate the example would run
                return `✅ Example ${exampleName} is ready to run. In graphical interface, it would execute now.`;
            } else {
                // If no default function, just show the import was successful
                return `✅ Example ${exampleName} imported successfully. (No default function to execute)`;
            }
        } catch (error) {
            // Provide more specific error information
            if (error.code === 'MODULE_NOT_FOUND') {
                return `📁 Example file not found: ${examplePath}. Make sure the file exists in the examples directory.`;
            }
            return `❌ Error running example ${exampleName}: ${error.message}`;
        }
    }
}