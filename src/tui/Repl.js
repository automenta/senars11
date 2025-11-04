import {NAR} from '../nar/NAR.js';
import readline from 'readline';
import {PersistenceManager} from '../io/PersistenceManager.js';
import {FormattingUtils} from './FormattingUtils.js';
import {DEMO_COMMANDS} from '../config/constants.js';

const COMMANDS = DEMO_COMMANDS;

export class Repl {
    constructor(config = {}) {
        this.nar = new NAR(config.nar || {});
        this.rl = readline.createInterface({input: process.stdin, output: process.stdout});
        this.sessionState = {history: [], lastResult: null, startTime: Date.now()};
        this.commands = this._createCommandMap();
        this.persistenceManager = new PersistenceManager({
            defaultPath: config.persistence?.defaultPath || './agent.json'
        });

        // Animation state for emojis
        this.animationState = {spinningIndex: 0};

        // State for run command
        this.isRunningLoop = false;
        this.originalTraceState = false;
        this.traceEnabled = false;
    }



    _createCommandMap() {
        const map = new Map();
        for (const [method, aliases] of Object.entries(COMMANDS)) {
            for (const alias of aliases) {
                map.set(alias, this[`_${method}`].bind(this));
            }
        }
        return map;
    }

    async start() {
        console.log('SeNARS Reasoning Engine');
        console.log('Type "/help" for available commands, "/quit" to exit');

        // Initialize the NAR to ensure rules are loaded
        try {
            await this.nar.initialize();
            console.log('✅ NAR initialized with default rules');
        } catch (error) {
            console.error('❌ Failed to initialize NAR:', error);
        }

        this._prompt();

        this.rl.on('line', async (input) => {
            const trimmedInput = input.trim();
            if (!trimmedInput) {
                // Empty input runs a single cycle (next command)
                await this._next();
                this._prompt();
                return;
            }

            this.sessionState.history.push(trimmedInput);

            await (trimmedInput.startsWith('/')
                ? this._executeCommand(...trimmedInput.slice(1).split(' '))
                : this._processNarsese(trimmedInput));

            this._prompt();
        });

        this.rl.on('close', () => {
            console.log('\n👋 Goodbye!');
            process.exit(0);
        });
    }

    _prompt() {
        process.stdout.write('\ud83d\udcac NAR> ');
    }

    async _executeCommand(cmd, ...args) {
        const commandFn = this.commands.get(cmd);
        if (!commandFn) return console.log(`❌ Unknown command: ${cmd}. Type '/help' for available commands.`);

        try {
            const result = await commandFn(args);
            if (result) {
                console.log(result.trim());
            }
        } catch (error) {
            console.error(`❌ Error executing command: ${error.message}`);
        }
    }

    async _processNarsese(input) {
        try {
            const startTime = Date.now();
            const result = await this.nar.input(input);
            if (!result) {
                console.log('❌ Failed to process input');
                return;
            }

            // Process at least one reasoning cycle to ensure tasks are processed into concepts
            await this.nar.step();
            const duration = Date.now() - startTime;

            // Input processed silently - no success message
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
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
  /save, /sv         - Save current agent state to file 💾
  /load, /ld         - Load agent state from file 📁
  /demo, /d         - Run an example/demo (use "/demo" for list) 🎭
  /next, /n         - Run a single reasoning cycle ⏭️
  /run, /go         - Start continuous reasoning loop 🏃
  /stop, /st        - Stop continuous reasoning loop ⏹️

🎯 Narsese input examples:
  (bird --> animal).                     (inheritance statement)
  (robin --> bird). %1.0;0.9%           (with truth values)
  (robin --> animal)?                   (question)
  (robin --> fly)!                      (goal)
  
💡 Tip: Press Enter with empty input to run a single cycle`;
    }

    _quit() {
        this.rl.close();
    }

    _status() {
        const stats = this.nar.getStats();
        const memoryStats = stats.memoryStats;
        const conceptCount = FormattingUtils.safeGet(memoryStats, ['memoryUsage', 'concepts'], ['totalConcepts'], 0);
        const focusTaskCount = FormattingUtils.safeGet(memoryStats, ['memoryUsage', 'focusConcepts'], ['focusConceptsCount'], 0);
        const totalTasks = FormattingUtils.safeGet(memoryStats, ['memoryUsage', 'totalTasks'], ['totalTasks'], 0);

        return `📊 System Status:
  ⚡ Running: ${stats.isRunning ? 'Yes' : 'No'}
  🕒 Internal Clock: ${stats.cycleCount}
  🔄 Cycles: ${stats.cycleCount}
  🧠 Memory Concepts: ${conceptCount}
  🎯 Focus Tasks: ${focusTaskCount}
  📋 Total Tasks: ${totalTasks}
  🕐 Start Time: ${new Date(this.sessionState.startTime).toISOString()}`;
    }



    _memory() {
        const stats = this.nar.getStats();
        const memoryStats = stats.memoryStats;
        const conceptCount = FormattingUtils.safeGet(memoryStats, ['memoryUsage', 'concepts'], ['totalConcepts'], 0);
        const taskCount = FormattingUtils.safeGet(memoryStats, ['memoryUsage', 'totalTasks'], ['totalTasks'], 0);
        const focusSize = FormattingUtils.safeGet(memoryStats, ['memoryUsage', 'focusConcepts'], ['focusConceptsCount'], 0);
        const avgPriority = FormattingUtils.safeGet(memoryStats, ['averageActivation'], ['averagePriority'], 0);
        const capacity = this.nar.config?.memory?.maxConcepts || 'N/A';
        const forgettingThreshold = this.nar.config?.memory?.priorityThreshold || 'N/A';

        const content = [
            '💾 Memory Statistics:',
            `  🧠 Concepts: ${conceptCount}`,
            `  📋 Tasks in Memory: ${taskCount}`,
            `  🎯 Focus Set Size: ${focusSize}`,
            `  📏 Concept Capacity: ${capacity}`,
            `  ⚠️ Forgetting Threshold: ${forgettingThreshold}`,
            `  📊 Average Concept Priority: ${avgPriority.toFixed(3)}`,
            '',
            '📋 Detailed Task Information:',
            ...this._getTasksFromMemory().length > 0
                ? this._getTasksFromMemory()
                    .slice(-10)
                    .map((task, index) => `  [${index + 1}]: ${this._formatTask(task)}`)
                : ['  ❌ No tasks in memory']
        ].join('\n');

        return content;
    }

    _getTasksFromMemory() {
        try {
            const concepts = this.nar.memory.getAllConcepts() || [];
            return concepts.flatMap(concept => concept.getAllTasks ? concept.getAllTasks() : []);
        } catch (e) {
            // Fallback using memory concepts directly
            if (this.nar.memory?.concepts) {
                const concepts = this.nar.memory.concepts instanceof Map 
                    ? Array.from(this.nar.memory.concepts.values()) 
                    : Object.values(this.nar.memory.concepts);
                return concepts.flatMap(concept => 
                    concept && concept.getAllTasks && typeof concept.getAllTasks === 'function' 
                        ? concept.getAllTasks() 
                        : []);
            }
        }
        return [];
    }

    _formatTask(task) {
        return FormattingUtils.formatTask(task);
    }

    _trace() {
        const beliefs = this.nar.getBeliefs();
        if (beliefs.length === 0) {
            return '🔍 No recent beliefs found.';
        }

        return [
            '🔍 Recent Beliefs (last 5):',
            ...beliefs.slice(-5).map(task => `  ${this._formatTask(task)}`)
        ].join('\n');
    }

    _reset() {
        this.nar.reset();
        this.sessionState.history = [];
        this.sessionState.lastResult = null;
        return '🔄 NAR system reset successfully.';
    }

    async _next() {
        try {
            const result = await this.nar.step();
            return `⏭️  Single cycle executed. Cycle: ${this.nar.cycleCount}`;
        } catch (error) {
            return `❌ Error executing single cycle: ${error.message}`;
        }
    }

    async _run() {
        if (this.isRunningLoop) {
            return '⏸️  Already running. Use the "/stop" command to stop.';
        }

        // Add stop command temporarily to command map
        this.commands.set('stop', this._stop.bind(this));

        // Save original trace state
        this.originalTraceState = this.traceEnabled;

        this.isRunningLoop = true;
        console.log('🏃 Running continuously... Use "/stop" to stop.');

        // Auto-enable trace if it wasn't already enabled
        if (!this.traceEnabled) {
            this.traceEnabled = true;
            console.log('👁️ Trace enabled for this run session');
        }

        // Set up the run interval
        this.runInterval = setInterval(async () => {
            try {
                await this.nar.step();
            } catch (error) {
                console.error(`❌ Error during run: ${error.message}`);
                this._stopRun();
            }
        }, 10); // Run every 10ms

        // Don't return anything to keep the REPL responsive
        return null;
    }

    _stop() {
        return this._stopRun();
    }

    _stopRun() {
        if (this.runInterval) {
            clearInterval(this.runInterval);
            this.runInterval = null;
        }
        this.isRunningLoop = false;

        // Remove stop command from command map
        this.commands.delete('stop');

        // Restore original trace state
        if (!this.originalTraceState && this.traceEnabled) {
            this.traceEnabled = false;
            console.log('↩️  Trace restored to original state');
        }

        console.log('\n🛑 Run stopped by user.');
        return '✅ Run stopped.';
    }

    _isTraceEnabled() {
        // Return current trace state
        return this.traceEnabled;
    }

    async _save() {
        try {
            const state = this.nar.serialize();
            const result = await this.persistenceManager.saveToDefault(state);
            return `💾 NAR state saved successfully to ${result.filePath} (${Math.round(result.size / 1024)} KB)`;
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
                console.log(`\n🎭 Running example: ${exampleName}`);
                console.log('='.repeat(40));

                await exampleModule.default(this.nar);

                console.log('='.repeat(40));
                console.log(`🎭 Example ${exampleName} completed.`);

                return '✅ Example executed successfully.';
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