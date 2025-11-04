import {NAR} from '../nar/NAR.js';
import blessed from 'blessed';
import {PersistenceManager} from '../io/PersistenceManager.js';
import {FormattingUtils} from './FormattingUtils.js';

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

export class SeNARSInterface {
    constructor(config = {}) {
        this.nar = new NAR(config.nar || {});
        this.sessionState = {history: [], lastResult: null, startTime: Date.now()};
        this.commands = this._createCommandMap();
        this.persistenceManager = new PersistenceManager({
            defaultPath: config.persistence?.defaultPath || './agent.json'
        });

        // Animation state
        this.animationState = {spinningIndex: 0, pulsePhase: 0};

        // Create blessed screen
        this.screen = blessed.screen({
            smartCSR: true,
            title: '🌈 SeNARS Terminal Interface 🚀',
            dockBorders: true
        });

        // Set up the layout
        this._setupLayout();

        // Set up the main loop for animations
        this._startAnimationLoop();

        // Handle exit gracefully
        this.screen.key(['C-c'], (ch, key) => {
            this.screen.destroy();
            process.exit(0);
        });
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

    _setupLayout() {
        // Define element configurations
        this.header = blessed.box({
            top: '0',
            left: '0',
            width: '100%',
            height: '6%',
            content: '{bold}{rainbow}🌈 SeNARS Reasoning Engine 🚀{/rainbow}{/bold}',
            tags: true,
            border: { type: 'line' },
            style: { fg: 'white', bg: 'blue', border: { fg: '#f0f0f0' } }
        });

        this.input = blessed.textarea({
            top: '6%',
            left: '0',
            width: '100%',
            height: '15%',
            border: { type: 'line' },
            style: { fg: 'white', bg: 'black', border: { fg: 'green' } },
            inputOnFocus: true
        });

        this.output = blessed.box({
            top: '21%',
            left: '0',
            width: '70%',
            height: '54%',
            border: { type: 'line' },
            style: { fg: 'white', bg: 'black', border: { fg: 'cyan' } },
            scrollable: true,
            alwaysScroll: true,
            mouse: true,
            keys: true,
            vi: true
        });

        this.memoryDisplay = blessed.box({
            top: '21%',
            left: '70%',
            width: '30%',
            height: '54%',
            border: { type: 'line' },
            style: { fg: 'white', bg: 'black', border: { fg: 'magenta' } },
            scrollable: true,
            alwaysScroll: true,
            mouse: true,
            keys: true,
            vi: true
        });

        this.statusBar = blessed.box({
            bottom: '0',
            left: '0',
            width: '100%',
            height: '25%',
            border: { type: 'line' },
            style: { fg: 'white', bg: 'red', border: { fg: 'yellow' } },
            content: this._getStatusContent()
        });

        // Add elements to screen
        this.screen.append(this.header);
        this.screen.append(this.input);
        this.screen.append(this.output);
        this.screen.append(this.memoryDisplay);
        this.screen.append(this.statusBar);

        // Handle input
        this.input.on('submit', (inputText) => {
            this._handleInput(inputText);
            this.input.clearValue();
            this.screen.render();
        });

        // Initial render
        this.screen.render();
        this._updateMemoryDisplay();
    }

    _startAnimationLoop() {
        // Simple animation loop for emojis
        setInterval(() => {
            this.animationState.spinningIndex = (this.animationState.spinningIndex + 1) % 4;
            this.animationState.pulsePhase = (this.animationState.pulsePhase + 0.1) % (2 * Math.PI);

            // Update status bar with animated content
            this.statusBar.setContent(this._getStatusContent());
            this.screen.render();
        }, 500);
    }

    _getStatusContent() {
        const spins = ['🌀', '◕', '◔', '◕'];
        const currentSpin = spins[this.animationState.spinningIndex];

        const stats = this.nar.getStats();
        return `{bold}⚡ Status: ${currentSpin} | Concepts: ${stats.memoryStats.conceptCount} | Cycles: ${stats.cycleCount} | Tasks: ${stats.memoryStats.taskCount}{/bold}`;
    }

    async start() {
        this.output.setContent('🌈 Welcome to SeNARS! Type {bold}/help{/bold} for commands or enter Narsese statements.\n');
        this.screen.render();

        // Setup event handlers
        this._setupEventHandlers();
    }

    _setupEventHandlers() {
        // Handle input submission
        this.input.key(['enter'], () => {
            const inputText = this.input.getValue();
            if (inputText.trim()) {
                this._handleInput(inputText.trim());
                this.input.clearValue();
            }
        });
    }

    async _handleInput(inputText) {
        this.sessionState.history.push(inputText);

        if (inputText.startsWith('/')) {
            // Extract command and arguments properly
            const parts = inputText.slice(1).split(' ');
            const cmd = parts[0];
            const args = parts.slice(1);

            await this._executeCommand(cmd, ...args);
        } else {
            await this._processNarsese(inputText);
        }

        // Update memory display after processing
        this._updateMemoryDisplay();
        this.screen.render();
    }

    async _executeCommand(cmd, ...args) {
        const commandFn = this.commands.get(cmd);
        if (!commandFn) {
            this._addToOutput(`❌ Unknown command: ${cmd}. Type '{bold}/help{/bold}' for available commands.`);
            return;
        }

        try {
            const result = await commandFn(args);
            if (result) {
                this._addToOutput(result);
            }
        } catch (error) {
            this._addToOutput(`❌ Error executing command: ${error.message}`);
        }
    }

    async _processNarsese(input) {
        try {
            const startTime = Date.now();
            const result = await this.nar.input(input);
            const duration = Date.now() - startTime;

            if (result) {
                this._addToOutput(`✅ Input processed successfully (${duration}ms)`);

                // Only show latest beliefs in the output, not all tasks
                const beliefs = this.nar.getBeliefs();
                if (beliefs.length > 0) {
                    this._addToOutput('🎯 Latest beliefs:');
                    beliefs.slice(-3).forEach(task => {
                        const truthStr = task.truth ? task.truth.toString() : '';
                        this._addToOutput(`  {blue}${task.term.name}{/blue} ${truthStr} {magenta}[P: ${task.priority?.toFixed(3) || 'N/A'}]{/magenta}`);
                    });
                }
            } else {
                this._addToOutput('❌ Failed to process input');
            }
        } catch (error) {
            this._addToOutput(`❌ Error: ${error.message}`);
        }
    }

    _addToOutput(text) {
        const currentTime = new Date().toLocaleTimeString();
        const formattedText = `[${currentTime}] ${text}`;

        // Add to output box
        this.output.pushLine(formattedText);
        this.output.setScrollPerc(100); // Auto-scroll to bottom
    }

    _updateMemoryDisplay() {
        const stats = this.nar.getStats();
        let content = '{bold}🧠 Memory Status{/bold}\n';
        content += ` Concepts: ${stats.memoryStats.conceptCount}\n`;
        content += ` Tasks: ${stats.memoryStats.taskCount}\n`;
        content += ` Focus Size: ${stats.memoryStats.focusSize}\n\n`;

        content += '{bold}📋 Recent Tasks{/bold}\n';

        const tasks = this._getTasksFromMemory();
        
        if (tasks.length > 0) {
            tasks.slice(-10).forEach((task, index) => {
                content += `{cyan}[${index + 1}]{/cyan} {green}${task.term?.name || 'Unknown Task'}{/green}\n`;
                content += `    {blue}| ${this._formatTaskDetails(task)}{/blue}\n`;
            });
        } else {
            content += '{red}No tasks in memory{/red}\n';
        }

        this.memoryDisplay.setContent(content);
    }

    _getTasksFromMemory() {
        // Try multiple possible methods to get tasks
        const methods = [
            () => this.nar.getTasks && typeof this.nar.getTasks === 'function' ? this.nar.getTasks() : null,
            () => this.nar.memory?.getTasks && typeof this.nar.memory.getTasks === 'function' ? this.nar.memory.getTasks() : null,
            () => {
                if (this.nar.memory?.concepts) {
                    const conceptEntries = this.nar.memory.concepts instanceof Map 
                        ? Array.from(this.nar.memory.concepts.entries()) 
                        : Object.entries(this.nar.memory.concepts);
                    return conceptEntries.flatMap(([, concept]) => concept?.tasks || []);
                }
                return null;
            }
        ];

        for (const method of methods) {
            try {
                const result = method();
                if (result !== null) return result;
            } catch (e) {
                // Continue to next method if current fails
            }
        }
        return [];
    }

    _formatTaskDetails(task) {
        return FormattingUtils.formatTaskDetails(task);
    }
    
    _formatType(type) {
        return FormattingUtils.formatType(type);
    }
    
    _formatTruthStr(truth) {
        return FormattingUtils.formatTruthStr(truth);
    }
    
    _formatPriorityStr(priority) {
        return FormattingUtils.formatPriorityStr(priority);
    }
    
    _formatStamp(stamp) {
        return FormattingUtils.formatStamp(stamp);
    }
    
    _formatOccurrenceTime(occurrenceTime) {
        return FormattingUtils.formatOccurrenceTime(occurrenceTime);
    }

    _help() {
        return `
{rainbow}⚡ Available commands{/rainbow}:
  {yellow}/help, /h, /?     {/yellow}- Show this help message 📚
  {yellow}/quit, /q, /exit  {/yellow}- Quit the REPL 🚪
  {yellow}/status, /s, /stats {/yellow}- Show system status 📊
  {yellow}/memory, /m       {/yellow}- Show memory statistics 💾
  {yellow}/trace, /t        {/yellow}- Show reasoning trace 🔍
  {yellow}/reset, /r        {/yellow}- Reset the NAR system 🔄
  {yellow}/save, /sv        {/yellow}- Save current agent state to file 💾
  {yellow}/load, /ld        {/yellow}- Load agent state from file 📁
  {yellow}/demo, /d         {/yellow}- Run an example/demo (use "/demo" for list) 🎭

{rainbow}🎯 Narsese input examples{/rainbow}:
  {green}(bird --> animal).{/green}                     (inheritance statement)
  {green}(robin --> bird). %1.0;0.9%{/green}           (with truth values)
  {green}(robin --> animal)?{/green}                   (question)
  {green}(robin --> fly)!{/green}                      (goal)
        `.trim();
    }

    _quit() {
        this.screen.destroy();
        process.exit(0);
    }

    _status() {
        const stats = this.nar.getStats();
        return `{bold}📊 System Status{/bold}
  {green}Running:{/green} ${stats.isRunning ? 'Yes' : 'No'}
  {green}Cycles:{/green} ${stats.cycleCount}
  {green}Memory Concepts:{/green} ${stats.memoryStats.conceptCount}
  {green}Focus Tasks:{/green} ${stats.memoryStats.focusTaskCount}
  {green}Total Tasks:{/green} ${stats.taskManagerStats?.totalTasks || 'N/A'}
  {green}Start Time:{/green} ${new Date(this.sessionState.startTime).toISOString()}`;
    }

    _memory() {
        const stats = this.nar.getStats();
        let content = `{bold}💾 Memory Statistics{/bold}
  {cyan}Concepts:{/cyan} ${stats.memoryStats.conceptCount}
  {cyan}Tasks in Memory:{/cyan} ${stats.memoryStats.taskCount}
  {cyan}Focus Set Size:{/cyan} ${stats.memoryStats.focusSize}
  {cyan}Concept Capacity:{/cyan} ${stats.memoryStats.capacity}
  {cyan}Forgetting Threshold:{/cyan} ${stats.memoryStats.forgettingThreshold}
  {cyan}Average Concept Priority:{/cyan} ${stats.memoryStats.avgPriority?.toFixed(3) || 'N/A'}

{bold}📋 Detailed Task Information{/bold}\n`;

        const tasks = this._getTasksFromMemory();

        if (tasks.length > 0) {
            tasks.slice(-10).forEach((task, index) => {
                const truthStr = task.truth ? `Truth: ${task.truth.toString()}` : 'Truth: N/A';
                const priority = task.priority !== undefined ? `Priority: ${task.priority.toFixed(3)}` : 'Priority: N/A';
                const occurrence = task.stamp ? `Occurrence: ${task.stamp}` : 'Occurrence: N/A';
                const occurrenceTime = task.occurrenceTime !== undefined ? `Occurrence Time: ${task.occurrenceTime}` : '';

                content += `{magenta}[${index + 1}]:{/magenta} {green}${task.term?.name || 'Unknown Task'}{/green}\n`;
                content += `    {blue}| ${truthStr} | ${priority} | ${occurrence} ${occurrenceTime}{/blue}\n`;
            });
        } else {
            content += '{red}No tasks in memory{/red}\n';
        }

        return content;
    }

    _trace() {
        const beliefs = this.nar.getBeliefs();
        if (beliefs.length === 0) {
            return '🔍 No recent beliefs found.';
        }

        let content = '{bold}🔍 Recent Beliefs (last 5){/bold}\n';
        beliefs.slice(-5).forEach(task => {
            content += `  {cyan}${task.term.name}{/cyan} ${this._formatBeliefDetails(task)}\n`;
        });

        return content;
    }

    _formatBeliefDetails(task) {
        return FormattingUtils.formatBeliefDetails(task);
    }
    
    _formatBeliefTruth(truth) {
        return FormattingUtils.formatBeliefTruth(truth);
    }
    
    _formatBeliefPriority(priority) {
        return FormattingUtils.formatBeliefPriority(priority);
    }
    
    _formatBeliefOccurrence(stamp) {
        return FormattingUtils.formatBeliefOccurrence(stamp);
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
            return `💾 NAR state saved successfully to {bold}${result.filePath}{/bold} ({bold}${Math.round(result.size / 1024)} KB{/bold})`;
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
                ? `💾 NAR state loaded successfully from {bold}${this.persistenceManager.defaultPath}{/bold}`
                : '❌ Failed to load NAR state - deserialization error';
        } catch (error) {
            return `❌ Error loading NAR state: ${error.message}`;
        }
    }

    async _demo(args) {
        const exampleName = args && args.length > 0 ? args[0] : null;

        if (!exampleName) {
            return `{rainbow}🎭 Available examples:{/rainbow}
  {cyan}agent-builder-demo     {/cyan}- Demonstrates building agents with various capabilities
  {cyan}causal-reasoning       {/cyan}- Shows causal reasoning capabilities
  {cyan}inductive-reasoning    {/cyan}- Demonstrates inductive inference
  {cyan}syllogism              {/cyan}- Classic syllogistic reasoning examples
  {cyan}temporal               {/cyan}- Temporal reasoning demonstrations
  {cyan}performance            {/cyan}- Performance benchmarking example
  {cyan}phase10-complete       {/cyan}- Full phase 10 reasoning demonstration
  {cyan}phase10-final          {/cyan}- Final comprehensive demonstration
  {cyan}websocket              {/cyan}- WebSocket monitoring example
  {cyan}lm-providers           {/cyan}- Language model provider integrations

{bold}Usage:{/bold} {yellow}/demo <example-name>{/yellow} (without the .js extension)`;
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
            return `❌ Unknown example: ${exampleName}. Use "{bold}/demo{/bold}" for a list of available examples.`;
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
                this._addToOutput(`\n🎭 Running example: {bold}${exampleName}{/bold}`);
                this._addToOutput('='.repeat(40));

                await exampleModule.default(this.nar);

                this._addToOutput('='.repeat(40));
                this._addToOutput(`🎭 Example {bold}${exampleName}{/bold} completed.`);

                return '✅ Example executed successfully.';
            } else {
                // If no default function, just show the import was successful
                return `✅ Example {bold}${exampleName}{/bold} imported successfully. (No default function to execute)`;
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