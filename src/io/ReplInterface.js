import {NAR} from '../nar/NAR.js';
import readline from 'readline';
import {PersistenceManager} from './PersistenceManager.js';

const COMMANDS = Object.freeze({
    help: ['help', 'h', '?'],
    quit: ['quit', 'q', 'exit'],
    status: ['status', 's', 'stats'],
    memory: ['memory', 'm'],
    trace: ['trace', 't'],
    reset: ['reset', 'r'],
    save: ['save', 'sv'],
    load: ['load', 'ld'],
    demo: ['demo', 'd', 'example']
});

export class ReplInterface {
    constructor(config = {}) {
        this.nar = new NAR(config.nar || {});
        this.rl = readline.createInterface({input: process.stdin, output: process.stdout});
        this.sessionState = {history: [], lastResult: null, startTime: Date.now()};
        this.commands = this._createCommandMap();
        this.persistenceManager = new PersistenceManager({
            defaultPath: config.persistence?.defaultPath || './agent.json'
        });
    }

    _createCommandMap() {
        return Object.entries(COMMANDS).reduce((map, [method, aliases]) => {
            aliases.forEach(alias => map.set(alias, this[`_${method}`].bind(this)));
            return map;
        }, new Map());
    }

    async start() {
        console.log('SENARS9.js v10 - NAR Reasoning Engine');
        console.log('Type "help" for available commands, "quit" to exit');

        this._prompt();

        this.rl.on('line', async (input) => {
            const trimmedInput = input.trim();
            if (!trimmedInput) return this._prompt();

            this.sessionState.history.push(trimmedInput);

            await (trimmedInput.startsWith(':')
                ? this._executeCommand(...trimmedInput.slice(1).split(' '))
                : this._processNarsese(trimmedInput));

            this._prompt();
        });

        this.rl.on('close', () => {
            console.log('\nGoodbye!');
            process.exit(0);
        });
    }

    _prompt() {
        process.stdout.write('\nNAR> ');
    }

    async _executeCommand(cmd, args) {
        const commandFn = this.commands.get(cmd);
        if (!commandFn) return console.log(`Unknown command: ${cmd}. Type 'help' for available commands.`);

        try {
            const result = await commandFn(args);
            result && console.log(result);
        } catch (error) {
            console.error(`Error executing command: ${error.message}`);
        }
    }

    async _processNarsese(input) {
        try {
            const startTime = Date.now();
            const result = await this.nar.input(input);
            const duration = Date.now() - startTime;

            result
                ? this._showSuccess(duration)
                : console.log('✗ Failed to process input');
        } catch (error) {
            console.error(`Error: ${error.message}`);
        }
    }

    _showSuccess(duration) {
        console.log(`✓ Input processed successfully (${duration}ms)`);
        const beliefs = this.nar.getBeliefs();
        if (beliefs.length === 0) return;

        console.log('Latest beliefs:');
        beliefs.slice(-3).forEach(task =>
            console.log(`  ${task.term.name} ${task.truth?.toString() || ''}`));
    }

    _help() {
        return `
Available commands:
  :help, :h, :?     - Show this help message
  :quit, :q, :exit  - Quit the REPL
  :status, :s, :stats - Show system status
  :memory, :m       - Show memory statistics
  :trace, :t        - Show reasoning trace
  :reset, :r        - Reset the NAR system
  :save, :sv         - Save current agent state to file
  :load, :ld         - Load agent state from file
  :demo, :d         - Run an example/demo (use ":demo" for list)

Narsese input examples:
  (bird --> animal).                     (inheritance statement)
  (robin --> bird). %1.0;0.9%           (with truth values)
  (robin --> animal)?                   (question)
  (robin --> fly)!                      (goal)
        `.trim();
    }

    _quit() {
        this.rl.close();
    }

    _status() {
        const stats = this.nar.getStats();
        return `System Status:
  Running: ${stats.isRunning ? 'Yes' : 'No'}
  Cycles: ${stats.cycleCount}
  Memory Concepts: ${stats.memoryStats.conceptCount}
  Focus Tasks: ${stats.memoryStats.focusTaskCount}
  Total Tasks: ${stats.taskManagerStats?.totalTasks || 'N/A'}
  Start Time: ${new Date(this.sessionState.startTime).toISOString()}`;
    }

    _memory() {
        const stats = this.nar.getStats();
        return `Memory Statistics:
  Concepts: ${stats.memoryStats.conceptCount}
  Tasks in Memory: ${stats.memoryStats.taskCount}
  Focus Set Size: ${stats.memoryStats.focusSize}
  Concept Capacity: ${stats.memoryStats.capacity}
  Forgetting Threshold: ${stats.memoryStats.forgettingThreshold}
  Average Concept Priority: ${stats.memoryStats.avgPriority?.toFixed(3) || 'N/A'}`;
    }

    _trace() {
        const beliefs = this.nar.getBeliefs();
        return beliefs.length === 0
            ? 'No recent beliefs found.'
            : `Recent Beliefs (last 5):
${beliefs.slice(-5).map(task => `  ${task.term.name} ${task.truth?.toString() || ''}`).join('\n')}`;
    }

    _reset() {
        this.nar.reset();
        this.sessionState.history = [];
        this.sessionState.lastResult = null;
        return 'NAR system reset successfully.';
    }

    async _save() {
        try {
            const state = this.nar.serialize();
            const result = await this.persistenceManager.saveToDefault(state);
            return `NAR state saved successfully to ${result.filePath} (${Math.round(result.size / 1024)} KB)`;
        } catch (error) {
            return `Error saving NAR state: ${error.message}`;
        }
    }

    async _load() {
        try {
            const exists = await this.persistenceManager.exists();
            if (!exists) {
                return `Save file does not exist: ${this.persistenceManager.defaultPath}`;
            }

            const state = await this.persistenceManager.loadFromDefault();
            const success = await this.nar.deserialize(state);

            return success
                ? `NAR state loaded successfully from ${this.persistenceManager.defaultPath}`
                : 'Failed to load NAR state - deserialization error';
        } catch (error) {
            return `Error loading NAR state: ${error.message}`;
        }
    }

    async _demo(args) {
        const exampleName = args && args.length > 0 ? args[0] : null;

        if (!exampleName) {
            return `Available examples:
  agent-builder-demo     - Demonstrates building agents with various capabilities
  causal-reasoning       - Shows causal reasoning capabilities
  inductive-reasoning    - Demonstrates inductive inference
  syllogism              - Classic syllogistic reasoning examples
  temporal               - Temporal reasoning demonstrations
  performance            - Performance benchmarking example
  phase10-complete       - Full phase 10 reasoning demonstration
  phase10-final          - Final comprehensive demonstration
  websocket              - WebSocket monitoring example
  lm-providers           - Language model provider integrations

Usage: :demo <example-name> (without the .js extension)`;
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
            return `Unknown example: ${exampleName}. Use ":demo" for a list of available examples.`;
        }

        try {
            // Import and run the example - we need to use a file URL for the import
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
                console.log(`\nRunning example: ${exampleName}`);
                console.log('='.repeat(40));

                await exampleModule.default(this.nar);

                console.log('='.repeat(40));
                console.log(`Example ${exampleName} completed.`);

                return 'Example executed successfully.';
            } else {
                // If no default function, just show the import was successful
                return `Example ${exampleName} imported successfully. (No default function to execute)`;
            }
        } catch (error) {
            // Provide more specific error information
            if (error.code === 'MODULE_NOT_FOUND') {
                return `Example file not found: ${examplePath}. Make sure the file exists in the examples directory.`;
            }
            return `Error running example ${exampleName}: ${error.message}`;
        }
    }
}