import {NAR} from '../nar/NAR.js';
import readline from 'readline';
import {PersistenceManager} from '../io/PersistenceManager.js';

const COMMANDS = Object.freeze({
    help: ['help', 'h', '?'],
    quit: ['quit', 'q', 'exit'],
    status: ['status', 's', 'stats'],
    memory: ['memory', 'm'],
    trace: ['trace', 't'],
    reset: ['reset', 'r'],
    save: ['save', 'sv'],
    load: ['load', 'ld'],
    demo: ['demo', 'd', 'example'],
    next: ['next', 'n'],
    run: ['run', 'go'],
    stop: ['stop', 'st']
});

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

    /**
     * Encode a string/number using a high-radix encoding with unicode characters
     * Uses visible unicode characters for higher density representation
     */
    _encodeShortId(input) {
        if (!input) return 'N/A';

        // Convert input to string if it isn't already
        const inputStr = String(input);

        // Use a large set of visible unicode characters for high radix encoding
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzαβγδεζηθικλμνξοπρστυφχψωАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя∀∂∃∅∇∈∉∋∌∏∑∙√∝∞∟∠∡∢∣∤∥∦∧∨∩∪∫∬∭∮∯∰∱∲∳∴∵∶∷∸∹∺∻∼∽∾∿≀≁≂≃≄≅≆≇≈≉≊≋≌≍≎≏≐≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟≠≡≢≣≤≥≦≧≨≩≪≫≬≭≮≯≰≱≲≳≴≵≶≷≸≹≺≻≼≽≾≿⊀⊁⊂⊃⊄⊅⊆⊇⊈⊉⊊⊋⊌⊍⊎⊏⊐⊑⊒⊓⊔⊕⊖⊗⊘⊙⊚⊛⊜⊝⊞⊟⊠⊡⊢⊣⊤⊥⊦⊧⊨⊩⊪⊫⊬⊭⊮⊯⊰⊱⊲⊳⊴⊵⊶⊷⊸⊹⊺⊻⊼⊽⊾⊿⋀⋁⋂⋃⋄⋅⋆⋇⋈⋉⋊⋋⋌⋍⋎⋏⋐⋑⋒⋓⋔⋕⋖⋗⋘⋙⋚⋛⋜⋝⋞⋟⋠⋡⋢⋣⋤⋥⋦⋧⋨⋩⋪⋫⋬⋭⋮⋯⋰⋱⋲⋳⋴⋵⋶⋷⋸⋹⋺⋻⋼⋽⋾⋿';

        // Convert the input to a large number (we'll use the character codes)
        let hash = 0;
        for (let i = 0; i < inputStr.length; i++) {
            const charCode = inputStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + charCode;
            hash |= 0; // Convert to 32bit integer
        }

        // Make sure it's positive
        hash = Math.abs(hash);

        // Encode using the custom charset
        if (hash === 0) return chars[0];

        let result = '';
        const base = chars.length;
        let num = hash;

        while (num > 0) {
            result = chars[num % base] + result;
            num = Math.floor(num / base);
        }

        // Limit length to 8 characters max for readability
        return result.length > 8 ? result.substring(0, 8) : result;
    }

    /**
     * Convert task type to NARS punctuation character
     */
    _getTypePunctuation(type) {
        switch (type?.toUpperCase()) {
            case 'BELIEF':
                return '.';
            case 'GOAL':
                return '!';
            case 'QUESTION':
                return '?';
            default:
                return '.';
        }
    }

    _createCommandMap() {
        return Object.entries(COMMANDS).reduce((map, [method, aliases]) => {
            aliases.forEach(alias => map.set(alias, this[`_${method}`].bind(this)));
            return map;
        }, new Map());
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
        const conceptCount = memoryStats?.memoryUsage?.concepts || memoryStats?.totalConcepts || 0;
        const focusTaskCount = memoryStats?.memoryUsage?.focusConcepts || memoryStats?.focusConceptsCount || 0;
        const totalTasks = memoryStats?.memoryUsage?.totalTasks || memoryStats?.totalTasks || 0;

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
        // Map the returned stats to the expected property names for compatibility
        const conceptCount = memoryStats?.memoryUsage?.concepts || memoryStats?.totalConcepts || 0;
        const taskCount = memoryStats?.memoryUsage?.totalTasks || memoryStats?.totalTasks || 0;
        const focusSize = memoryStats?.memoryUsage?.focusConcepts || memoryStats?.focusConceptsCount || 0;
        const avgPriority = memoryStats?.averageActivation || memoryStats?.averagePriority || 0;
        const capacity = this.nar.config?.memory?.maxConcepts || 'N/A';
        const forgettingThreshold = this.nar.config?.memory?.priorityThreshold || 'N/A';

        let content = `💾 Memory Statistics:
  🧠 Concepts: ${conceptCount}
  📋 Tasks in Memory: ${taskCount}
  🎯 Focus Set Size: ${focusSize}
  📏 Concept Capacity: ${capacity}
  ⚠️ Forgetting Threshold: ${forgettingThreshold}
  📊 Average Concept Priority: ${avgPriority.toFixed(3)}

📋 Detailed Task Information:\n`;

        // Get tasks from all concepts in memory
        let tasks = [];
        try {
            const concepts = this.nar.memory.getAllConcepts() || [];
            for (const concept of concepts) {
                const conceptTasks = concept.getAllTasks();
                tasks = tasks.concat(conceptTasks);
            }
        } catch (e) {
            // Fallback if method doesn't exist or fails
            try {
                // Try to get tasks from memory directly - concepts is a Map
                if (this.nar.memory?.concepts && this.nar.memory.concepts instanceof Map) {
                    for (const [key, concept] of this.nar.memory.concepts) {
                        if (concept.getAllTasks && typeof concept.getAllTasks === 'function') {
                            const conceptTasks = concept.getAllTasks();
                            tasks = tasks.concat(conceptTasks);
                        }
                    }
                } else if (this.nar.memory?.concepts && typeof this.nar.memory.concepts === 'object') {
                    // Handle if concepts is not a Map but an object
                    for (const [key, concept] of Object.entries(this.nar.memory.concepts)) {
                        if (concept && concept.getAllTasks && typeof concept.getAllTasks === 'function') {
                            const conceptTasks = concept.getAllTasks();
                            tasks = tasks.concat(conceptTasks);
                        }
                    }
                }
            } catch (e2) {
                // If all attempts fail, keep tasks as empty array
            }
        }

        if (tasks.length > 0) {
            tasks.slice(-10).forEach((task, index) => {
                // Format task in NARS style: $priority term<punctuation> %frequency,confidence% occurrence@stamp
                const priority = task.budget?.priority !== undefined ? `$${task.budget.priority.toFixed(3)} ` : '';
                const term = task.term?.toString?.() || task.term || 'Unknown';
                const punctuation = this._getTypePunctuation(task.type || 'TASK');

                let truthStr = '';
                if (task.truth) {
                    const freq = task.truth.frequency !== undefined ? task.truth.frequency.toFixed(3) : '1.000';
                    const conf = task.truth.confidence !== undefined ? task.truth.confidence.toFixed(3) : '0.900';
                    truthStr = ` %${freq},${conf}%`;
                } else {
                    // Use default truth values if not set
                    truthStr = ' %1.000,0.900%';  // Default truth values
                }

                const occurrence = task.occurrenceTime !== undefined || task.stamp ?
                    ` ${task.occurrenceTime || ''}@${task.stamp ? this._encodeShortId(task.stamp.id || task.stamp) : ''}`.trim() : '';

                content += `  [${index + 1}]: ${priority}${term}${punctuation}${truthStr}${occurrence}\n`;
            });
        } else {
            content += '  ❌ No tasks in memory\n';
        }

        return content;
    }

    _trace() {
        const beliefs = this.nar.getBeliefs();
        if (beliefs.length === 0) {
            return '🔍 No recent beliefs found.';
        }

        let content = '🔍 Recent Beliefs (last 5):\n';
        beliefs.slice(-5).forEach(task => {
            // Format task in NARS style: $priority term<punctuation> %frequency,confidence% occurrence@stamp
            const priority = task.budget?.priority !== undefined ? `$${task.budget.priority.toFixed(3)} ` : '';
            const term = task.term?.toString?.() || task.term?.name || 'Unknown';
            const punctuation = this._getTypePunctuation(task.type || 'BELIEF');

            let truthStr = '';
            if (task.truth) {
                const freq = task.truth.frequency !== undefined ? task.truth.frequency.toFixed(3) : '1.000';
                const conf = task.truth.confidence !== undefined ? task.truth.confidence.toFixed(3) : '0.900';
                truthStr = ` %${freq},${conf}%`;
            } else {
                // Use default truth values if not set
                truthStr = ' %1.000,0.900%';  // Default truth values
            }

            const occurrence = task.occurrenceTime !== undefined || task.stamp ?
                ` ${task.occurrenceTime || ''}@${task.stamp ? this._encodeShortId(task.stamp.id || task.stamp) : ''}`.trim() : '';

            content += `  ${priority}${term}${punctuation}${truthStr}${occurrence}\n`;
        });

        return content.trim();
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
            return `🎭 Available examples:\n${[
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
            ].map(line => `  ${line}`).join('\n')}

Usage: /demo <example-name> (without the .js extension)`;
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