import blessed from 'blessed';
import { EventEmitter } from 'events';
import { FormattingUtils } from '../utils/FormattingUtils.js';

export class BlessedAdapter extends EventEmitter {
    constructor(engine) {
        super();
        
        this.engine = engine;
        this.animationState = { spinningIndex: 0 };
        this.screen = blessed.screen({ smartCSR: true, title: 'SeNARS Reasoning Engine 🚀', dockBorders: true });

        this._setupLayout();
        this._startAnimationLoop();
        this._setupEventListeners();

        this.screen.key(['C-c'], () => {
            this.engine.shutdown();
            this.screen.destroy();
            process.exit(0);
        });
    }

    _setupLayout() {
        this.elementConfigs = {
            header: { top: '0', left: '0', width: '100%', height: '6%', content: '{bold}{center}SeNARS Reasoning Engine 🚀{/center}{/bold}', tags: true, border: { type: 'line' }, style: { fg: 'white', bg: 'blue', border: { fg: '#f0f0f0' } } },
            input: { top: '6%', left: '0', width: '100%', height: '15%', border: { type: 'line' }, style: { fg: 'white', bg: 'black', border: { fg: 'green' } }, inputOnFocus: true },
            output: { top: '21%', left: '0', width: '70%', height: '54%', border: { type: 'line' }, style: { fg: 'white', bg: 'black', border: { fg: 'cyan' } }, scrollable: true, alwaysScroll: true, mouse: true, keys: true, vi: true },
            memoryDisplay: { top: '21%', left: '70%', width: '30%', height: '54%', border: { type: 'line' }, style: { fg: 'white', bg: 'black', border: { fg: 'magenta' } }, scrollable: true, alwaysScroll: true, mouse: true, keys: true, vi: true },
            statusBar: { bottom: '0', left: '0', width: '100%', height: '25%', border: { type: 'line' }, style: { fg: 'white', bg: 'red', border: { fg: 'yellow' } }, content: this._getStatusContent() }
        };

        [this.header, this.input, this.output, this.memoryDisplay, this.statusBar] = [
            blessed.box(this.elementConfigs.header),
            blessed.textarea(this.elementConfigs.input),
            blessed.box(this.elementConfigs.output),
            blessed.box(this.elementConfigs.memoryDisplay),
            blessed.box(this.elementConfigs.statusBar)
        ];

        [this.header, this.input, this.output, this.memoryDisplay, this.statusBar].forEach(el => this.screen.append(el));

        this.input.on('submit', (inputText) => {
            this._handleInput(inputText);
            this.input.clearValue();
            this.screen.render();
        });

        this.input.key(['enter'], () => {
            const inputText = this.input.getValue();
            if (inputText.trim()) {
                this._handleInput(inputText.trim());
                this.input.clearValue();
            }
        });

        this.screen.render();
        this._updateMemoryDisplay();
    }

    _setupEventListeners() {
        const eventHandlers = {
            'engine.ready': (data) => this._addToOutput(data.message),
            'narsese.processed': (data) => {
                this._addToOutput(data.result);
                if (data.beliefs?.length > 0) {
                    this._addToOutput('🎯 Latest beliefs:');
                    data.beliefs.slice(-3).forEach(task => {
                        const truthStr = task.truth?.toString() ?? '';
                        this._addToOutput(`  {blue}${task.term?.name ?? 'Unknown'}{/blue} ${truthStr} {magenta}[P: ${task.priority?.toFixed(3) ?? 'N/A'}]{/magenta}`);
                    });
                }
            },
            'narsese.error': (data) => this._addToOutput(`❌ Error: ${data.error}`),
            'command.error': (data) => this._addToOutput(`❌ Error executing command: ${data.error}`),
            'engine.quit': () => { this.screen.destroy(); process.exit(0); },
            'nar.cycle.step': (data) => this._addToOutput(`⏭️  Single cycle executed. Cycle: ${data.cycle}`),
            'nar.cycle.running': () => this._addToOutput('🏃 Running continuously...'),
            'nar.cycle.stop': () => this._addToOutput('🛑 Run stopped by user.'),
            'engine.reset': () => this._addToOutput('🔄 NAR system reset successfully.'),
            'engine.save': (data) => this._addToOutput(`💾 NAR state saved successfully to ${data.filePath}`),
            'engine.load': (data) => this._addToOutput(`💾 NAR state loaded successfully from ${data.filePath}`)
        };

        // Register handlers for commands that just output their result
        ['help', 'status', 'memory', 'trace', 'reset', 'save', 'load', 'demo'].forEach(cmd => {
            eventHandlers[`command.${cmd}`] = (data) => this._addToOutput(data.result);
        });

        Object.entries(eventHandlers).forEach(([event, handler]) => this.engine.on(event, handler));
    }

    _startAnimationLoop() {
        setInterval(() => {
            this.animationState.spinningIndex = (this.animationState.spinningIndex + 1) % 4;
            this.statusBar.setContent(this._getStatusContent());
            this.screen.render();
        }, 500);
    }

    _getStatusContent() {
        const spins = ['🌀', '◕', '◔', '◕'];
        const stats = this.engine.getStats();
        return `{bold}⚡ Status: ${spins[this.animationState.spinningIndex]} | Concepts: ${stats.memoryStats?.conceptCount ?? 0} | Cycles: ${stats.cycleCount ?? 0} | Tasks: ${stats.memoryStats?.taskCount ?? 0}{/bold}`;
    }

    async start() {
        this.output.setContent('Welcome to SeNARS! Type {bold}/help{/bold} for commands or enter Narsese statements.\n');
        this.screen.render();
        await this.engine.initialize();
    }

    _handleInput(inputText) {
        this.engine.processInput(inputText).catch(error => this._addToOutput(`❌ Error: ${error.message}`));
        
        setTimeout(() => {
            this._updateMemoryDisplay();
            this.screen.render();
        }, 100);
    }

    _addToOutput(text) {
        const formattedText = `[${new Date().toLocaleTimeString()}] ${text}`;
        this.output.pushLine(formattedText);
        this.output.setScrollPerc(100);
        this.screen.render();
    }

    _updateMemoryDisplay() {
        const stats = this.engine.getStats();
        const memoryStats = stats.memoryStats ?? {};

        const tasks = this._getTasksFromMemory();
        const taskDetails = tasks.length 
            ? tasks.slice(-10).flatMap((task, index) => [
                `{cyan}[${index + 1}]{/cyan} {green}${task.term?.name ?? 'Unknown Task'}{/green}`,
                `    {blue}| ${FormattingUtils.formatTaskDetails(task)}{/blue}`
            ])
            : ['{red}No tasks in memory{/red}'];

        const content = [
            '{bold}🧠 Memory Status{/bold}',
            ` Concepts: ${memoryStats.conceptCount ?? 0}`,
            ` Tasks: ${memoryStats.taskCount ?? 0}`,
            ` Focus Size: ${memoryStats.focusSize ?? 0}`,
            '',
            '{bold}📋 Recent Tasks{/bold}',
            ...taskDetails
        ].join('\n');

        this.memoryDisplay.setContent(content);
        this.screen.render();
    }

    _getTasksFromMemory() {
        try {
            if (this.engine.nar.getTasks) return this.engine.nar.getTasks() ?? [];
            if (this.engine.nar.memory?.getTasks) return this.engine.nar.memory.getTasks() ?? [];
            if (this.engine.nar.memory?.concepts) {
                const concepts = this.engine.nar.memory.concepts;
                return concepts instanceof Map 
                    ? Array.from(concepts.values()).flatMap(concept => concept?.tasks ?? [])
                    : Array.isArray(concepts) || typeof concepts === 'object' 
                        ? Object.values(concepts).flatMap(concept => concept?.tasks ?? [])
                        : [];
            }
        } catch (e) {}
        return [];
    }
}