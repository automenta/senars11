import {NAR} from '../nar/NAR.js';
import blessed from 'blessed';
import {PersistenceManager} from '../io/PersistenceManager.js';
import {FormattingUtils} from './FormattingUtils.js';
import {CommandProcessor} from './CommandProcessor.js';

export class SeNARSInterface {
    constructor(config = {}) {
        this.nar = new NAR(config.nar || {});
        this.sessionState = {history: [], lastResult: null, startTime: Date.now()};
        this.persistenceManager = new PersistenceManager({
            defaultPath: config.persistence?.defaultPath || './agent.json'
        });
        
        // Create shared command processor
        this.commandProcessor = new CommandProcessor(this.nar, this.persistenceManager, this.sessionState);

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
        // Get command map from shared processor
        const commandMap = this.commandProcessor.getCommandMap();
        
        // Override demo command with interface-specific implementation
        commandMap.set('demo', this._demo.bind(this));
        commandMap.set('d', this._demo.bind(this));
        
        // Add interface-specific commands
        commandMap.set('quit', this._quit.bind(this));
        commandMap.set('q', this._quit.bind(this));
        commandMap.set('exit', this._quit.bind(this));
        
        return commandMap;
    }

    _setupLayout() {
        // Define element configurations using a configuration object
        this.elementConfigs = {
            header: {
                top: '0', left: '0', width: '100%', height: '6%',
                content: '{bold}{rainbow}🌈 SeNARS Reasoning Engine 🚀{/rainbow}{/bold}',
                tags: true,
                border: { type: 'line' },
                style: { fg: 'white', bg: 'blue', border: { fg: '#f0f0f0' } }
            },
            input: {
                top: '6%', left: '0', width: '100%', height: '15%',
                border: { type: 'line' },
                style: { fg: 'white', bg: 'black', border: { fg: 'green' } },
                inputOnFocus: true
            },
            output: {
                top: '21%', left: '0', width: '70%', height: '54%',
                border: { type: 'line' },
                style: { fg: 'white', bg: 'black', border: { fg: 'cyan' } },
                scrollable: true, alwaysScroll: true, mouse: true, keys: true, vi: true
            },
            memoryDisplay: {
                top: '21%', left: '70%', width: '30%', height: '54%',
                border: { type: 'line' },
                style: { fg: 'white', bg: 'black', border: { fg: 'magenta' } },
                scrollable: true, alwaysScroll: true, mouse: true, keys: true, vi: true
            },
            statusBar: {
                bottom: '0', left: '0', width: '100%', height: '25%',
                border: { type: 'line' },
                style: { fg: 'white', bg: 'red', border: { fg: 'yellow' } },
                content: this._getStatusContent()
            }
        };

        // Create UI elements from configuration
        this.header = blessed.box(this.elementConfigs.header);
        this.input = blessed.textarea(this.elementConfigs.input);
        this.output = blessed.box(this.elementConfigs.output);
        this.memoryDisplay = blessed.box(this.elementConfigs.memoryDisplay);
        this.statusBar = blessed.box(this.elementConfigs.statusBar);

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
            const [cmd, ...args] = inputText.slice(1).split(' ');
            await this._executeCommand(cmd, ...args);
        } else {
            await this._processNarsese(inputText);
        }

        // Update memory display after processing
        this._updateMemoryDisplay();
        this.screen.render();
    }

    async _executeCommand(cmd, ...args) {
        // Handle quit command specially
        if (cmd === 'quit' || cmd === 'q' || cmd === 'exit') {
            this._quit();
            return;
        }

        // Delegate to shared command processor for standard commands
        try {
            const result = await this.commandProcessor.executeCommand(cmd, ...args);
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
                
                // Show latest beliefs
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
        const content = [
            '{bold}🧠 Memory Status{/bold}',
            ` Concepts: ${stats.memoryStats.conceptCount}`,
            ` Tasks: ${stats.memoryStats.taskCount}`,
            ` Focus Size: ${stats.memoryStats.focusSize}`,
            '',
            '{bold}📋 Recent Tasks{/bold}',
            ...this._getTasksFromMemory().length > 0
                ? this._getTasksFromMemory()
                    .slice(-10)
                    .map((task, index) => [
                        `{cyan}[${index + 1}]{/cyan} {green}${task.term?.name || 'Unknown Task'}{/green}`,
                        `    {blue}| ${this._formatTaskDetails(task)}{/blue}`
                    ])
                    .flat()
                : ['{red}No tasks in memory{/red}']
        ].join('\n');

        this.memoryDisplay.setContent(content);
    }

    _getTasksFromMemory() {
        // Try multiple possible methods to get tasks
        const methods = [
            () => this.nar.getTasks?.(),
            () => this.nar.memory?.getTasks?.(),
            () => this.nar.memory?.concepts && (
                this.nar.memory.concepts instanceof Map 
                    ? Array.from(this.nar.memory.concepts.values())
                    : Object.values(this.nar.memory.concepts)
            ).flatMap(concept => concept?.tasks || [])
        ];

        for (const method of methods) {
            try {
                const result = method();
                if (result != null) return result;
            } catch (e) {
                // Continue to next method if current fails
            }
        }
        return [];
    }

    // Delegating formatting methods to FormattingUtils for better modularity
    _formatTaskDetails(task) { return FormattingUtils.formatTaskDetails(task); }
    _formatType(type) { return FormattingUtils.formatType(type); }
    _formatTruthStr(truth) { return FormattingUtils.formatTruthStr(truth); }
    _formatPriorityStr(priority) { return FormattingUtils.formatPriorityStr(priority); }
    _formatStamp(stamp) { return FormattingUtils.formatStamp(stamp); }
    _formatOccurrenceTime(occurrenceTime) { return FormattingUtils.formatOccurrenceTime(occurrenceTime); }

    _help() {
        return `
{rainbow}⚡ Available commands{/rainbow}:
  {yellow}/help, /h, /?     {/yellow}- Show this help message 📚
  {yellow}/quit, /q, /exit  {/yellow}- Quit the interface 🚪
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