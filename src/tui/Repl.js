import {NAR} from '../nar/NAR.js';
import readline from 'readline';
import {PersistenceManager} from '../io/PersistenceManager.js';
import {CommandProcessor} from './CommandProcessor.js';

export class Repl {
    constructor(config = {}) {
        this.nar = new NAR(config.nar || {});
        this.rl = readline.createInterface({input: process.stdin, output: process.stdout});
        this.sessionState = {history: [], lastResult: null, startTime: Date.now()};
        this.persistenceManager = new PersistenceManager({
            defaultPath: config.persistence?.defaultPath || './agent.json'
        });
        
        this.commandProcessor = new CommandProcessor(this.nar, this.persistenceManager, this.sessionState);

        this.animationState = {spinningIndex: 0};
        this.isRunningLoop = false;
        this.originalTraceState = false;
        this.traceEnabled = false;
    }

    async start() {
        console.log('SeNARS Reasoning Engine');
        console.log('Type "/help" for available commands, "/quit" to exit');

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
        if (cmd === 'next' || cmd === 'n') {
            const result = await this._next();
            if (result) console.log(result.trim());
            return;
        }
        
        if (cmd === 'run' || cmd === 'go') {
            const result = await this._run();
            if (result) console.log(result.trim());
            return;
        }
        
        if (cmd === 'stop' || cmd === 'st') {
            const result = this._stop();
            if (result) console.log(result.trim());
            return;
        }

        const result = await this.commandProcessor.executeCommand(cmd, ...args);
        if (result) {
            console.log(result.trim());
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

            await this.nar.step();
            const duration = Date.now() - startTime;
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

        this.originalTraceState = this.traceEnabled;

        this.isRunningLoop = true;
        console.log('🏃 Running continuously... Use "/stop" to stop.');

        if (!this.traceEnabled) {
            this.traceEnabled = true;
            console.log('👁️ Trace enabled for this run session');
        }

        this.runInterval = setInterval(async () => {
            try {
                await this.nar.step();
            } catch (error) {
                console.error(`❌ Error during run: ${error.message}`);
                this._stopRun();
            }
        }, 10);

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

        if (!this.originalTraceState && this.traceEnabled) {
            this.traceEnabled = false;
            console.log('↩️  Trace restored to original state');
        }

        console.log('\n🛑 Run stopped by user.');
        return '✅ Run stopped.';
    }

    _isTraceEnabled() {
        return this.traceEnabled;
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
            const path = await import('path');
            const url = await import('url');

            const __filename = url.fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const filePath = path.resolve(__dirname, examplePath);

            const exampleModule = await import(`file://${filePath}`);

            if (exampleModule.default && typeof exampleModule.default === 'function') {
                console.log(`\n🎭 Running example: ${exampleName}`);
                console.log('='.repeat(40));

                await exampleModule.default(this.nar);

                console.log('='.repeat(40));
                console.log(`🎭 Example ${exampleName} completed.`);

                return '✅ Example executed successfully.';
            } else {
                return `✅ Example ${exampleName} imported successfully. (No default function to execute)`;
            }
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                return `📁 Example file not found: ${examplePath}. Make sure the file exists in the examples directory.`;
            }
            return `❌ Error running example ${exampleName}: ${error.message}`;
        }
    }
}