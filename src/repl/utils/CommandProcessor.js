import {DEMO_COMMANDS} from '../../config/constants.js';

const COMMANDS = DEMO_COMMANDS;
const HELP_MESSAGE = `🤖 Available commands:
  /help, /h, /?     - Show this help message 📚
  /quit, /q, /exit  - Quit the REPL 🚪
  /status, /s, /stats - Show system status 📊
  /memory, /m       - Show memory statistics 💾
  /trace, /t        - Show reasoning trace 🔍
  /reset, /r        - Reset the NAR system 🔄
  /save, /sv        - Save current agent state to file 💾
  /load, /ld        - Load agent state from file 📁
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

const EXAMPLE_LIST = [
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
const EXAMPLE_MAP = {
    'agent-builder': '../../examples/agent-builder-demo.js',
    'agent-builder-demo': '../../examples/agent-builder-demo.js',
    'causal-reasoning': '../../examples/causal-reasoning-demo.js',
    'causal-reasoning-demo': '../../examples/causal-reasoning-demo.js',
    'inductive-reasoning': '../../examples/inductive-reasoning-demo.js',
    'inductive-reasoning-demo': '../../examples/inductive-reasoning-demo.js',
    'syllogism': '../../examples/syllogism-demo.js',
    'syllogism-demo': '../../examples/syllogism-demo.js',
    'temporal': '../../examples/temporal-reasoning-demo.js',
    'temporal-reasoning': '../../examples/temporal-reasoning-demo.js',
    'temporal-reasoning-demo': '../../examples/temporal-reasoning-demo.js',
    'performance': '../../examples/performance-benchmark.js',
    'performance-benchmark': '../../examples/performance-benchmark.js',
    'phase10-complete': '../../examples/phase10-complete-demo.js',
    'phase10-final': '../../examples/phase10-final-demo.js',
    'phase10-final-demo': '../../examples/phase10-final-demo.js',
    'websocket': '../../examples/websocket-monitoring-test.js',
    'websocket-demo': '../../examples/websocket-monitoring-test.js',
    'websocket-monitoring': '../../examples/websocket-monitoring-test.js',
    'lm-providers': '../../examples/lm-providers.js',
    'basic-usage': '../../examples/basic-usage.js'
};

export class CommandProcessor {
    constructor(nar, persistenceManager, sessionState) {
        this.nar = nar;
        this.persistenceManager = persistenceManager;
        this.sessionState = sessionState;
        this.commands = this._createCommandMap();
    }

    _createCommandMap() {
        return new Map(
            Object.entries(COMMANDS)
                .filter(([method]) => method !== 'next')
                .flatMap(([method, aliases]) =>
                    aliases.map(alias => [alias, this[`_${method}`]?.bind(this)])
                )
                .filter(([, handler]) => handler)
        );
    }

    getCommandMap() {
        return this.commands;
    }

    getCommandFunction(commandName) {
        return this.commands.get(commandName);
    }

    async executeCommand(cmd, ...args) {
        const commandFn = this.commands.get(cmd);
        if (!commandFn) return `❌ Unknown command: ${cmd}. Type '/help' for available commands.`;

        try {
            return await commandFn(args);
        } catch (error) {
            return `❌ Error executing command: ${error.message}`;
        }
    }

    _help() {
        return HELP_MESSAGE;
    }

    _status() {
        const stats = this.nar.getStats();
        const {memoryStats = {}} = stats;
        const conceptCount = memoryStats.conceptCount ?? memoryStats.totalConcepts ?? 0;
        const focusTasks = memoryStats.focusTaskCount ?? memoryStats.focusConceptsCount ?? 0;
        const totalTasks = memoryStats.taskCount ?? memoryStats.totalTasks ?? 0;

        return `📊 System Status:
  ⚡ Running: ${stats.isRunning ? 'Yes' : 'No'}
  🕒 Internal Clock: ${stats.cycleCount || 0}
  🔄 Cycles: ${stats.cycleCount || 0}
  🧠 Memory Concepts: ${conceptCount}
  🎯 Focus Tasks: ${focusTasks}
  📋 Total Tasks: ${totalTasks}
  🕐 Start Time: ${new Date(this.sessionState.startTime).toISOString()}`;
    }

    _memory() {
        const stats = this.nar.getStats();
        const {memoryStats = {}} = stats;
        const concepts = memoryStats.conceptCount ?? memoryStats.totalConcepts ?? 0;
        const tasks = memoryStats.taskCount ?? memoryStats.totalTasks ?? 0;
        const focusSize = memoryStats.focusSize ?? memoryStats.focusTaskCount ?? memoryStats.focusConceptsCount ?? 0;
        const avg = memoryStats.avgPriority ?? memoryStats.averagePriority ?? 0;
        const capacity = this.nar.config?.memory?.maxConcepts ?? 'N/A';
        const threshold = this.nar.config?.memory?.priorityThreshold ?? 'N/A';

        return `💾 Memory Statistics:
  🧠 Concepts: ${concepts}
  📋 Tasks in Memory: ${tasks}
  🎯 Focus Set Size: ${focusSize}
  📏 Concept Capacity: ${capacity}
  ⚠️ Forgetting Threshold: ${threshold}
  📊 Average Concept Priority: ${avg.toFixed(3)}`;
    }

    _trace() {
        const beliefs = this.nar.getBeliefs();
        if (!beliefs.length) return '🔍 No recent beliefs found.';

        const beliefLines = beliefs
            .slice(-5)
            .map(task => {
                const term = task.term?.toString?.() ?? task.term ?? 'Unknown';
                const freq = task.truth?.frequency?.toFixed(3) ?? '1.000';
                const conf = task.truth?.confidence?.toFixed(3) ?? '0.900';
                const priority = task.budget?.priority !== undefined ? `$${task.budget.priority.toFixed(3)} ` : '';
                return `  ${priority}${term} %${freq},${conf}%`;
            });

        return ['🔍 Recent Beliefs (last 5):', ...beliefLines].join('\n');
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
            return `💾 NAR state saved successfully to ${result.filePath} (${Math.round(result.size / 1024)} KB)`;
        } catch (error) {
            return `❌ Error saving NAR state: ${error.message}`;
        }
    }

    async _load() {
        try {
            const exists = await this.persistenceManager.exists();
            if (!exists) return `📁 Save file does not exist: ${this.persistenceManager.defaultPath}`;

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
        const exampleName = args?.[0];

        if (!exampleName) {
            return [
                '🎭 Available examples:',
                ...EXAMPLE_LIST.map(line => `  ${line}`),
                '',
                'Usage: /demo <example-name> (without the .js extension)'
            ].join('\n');
        }

        const examplePath = EXAMPLE_MAP[exampleName];
        if (!examplePath) return `❌ Unknown example: ${exampleName}. Use "/demo" for a list of available examples.`;

        try {
            const {fileURLToPath} = await import('url');
            const {dirname, resolve} = await import('path');
            const __dirname = dirname(fileURLToPath(import.meta.url));
            const filePath = resolve(__dirname, examplePath);

            const exampleModule = await import(`file://${filePath}`);
            return exampleModule.default && typeof exampleModule.default === 'function'
                ? `✅ Example ${exampleName} is ready to run.`
                : `✅ Example ${exampleName} imported successfully. (No default function to execute)`;
        } catch (error) {
            const message = error.code === 'MODULE_NOT_FOUND'
                ? `📁 Example file not found: ${EXAMPLE_MAP[exampleName]}. Make sure the file exists in the examples directory.`
                : `❌ Error running example ${exampleName}: ${error.message}`;
            return message;
        }
    }
}