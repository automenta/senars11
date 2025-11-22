import readline from 'readline';
import {Reasoner} from '../engine/Reasoner.js';
import {parse} from '../core/parser/narsese.js';

export class REPL {
    constructor() {
        this.reasoner = new Reasoner();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'NARS> '
        });

        this._setupEvents();
    }

    _setupEvents() {
        this.reasoner.eventBus.on('derivation', (data) => {
            console.log(`\nDERIVED: ${data.task.toString()}`);
            this.rl.prompt();
        });

        this.reasoner.eventBus.on('input', (data) => {
            // console.log(`Input accepted: ${data.task.toString()}`);
        });
    }

    start() {
        console.log('SeNARS (Lean Core) Started. Type Narsese or "exit".');
        this.reasoner.eventBus.emit('system.start');

        this.rl.prompt();

        this.rl.on('line', (line) => {
            line = line.trim();
            if (!line) {
                this.rl.prompt();
                return;
            }

            if (line === 'exit') {
                this.rl.close();
                process.exit(0);
            }

            if (line === 'step') {
                const count = this.reasoner.step();
                this.rl.prompt();
                return;
            }

            try {
                const parsed = parse(line, {termFactory: this.reasoner.termFactory});
                this.reasoner.input(parsed);
                // Run a few steps immediately?
                // NARS is a stream. Ideally it runs in background.
                // For REPL, let's run X steps.
                this.reasoner.run(10);
            } catch (e) {
                console.error(`Error: ${e.message}`);
                if (e.location) {
                    console.error(`At line ${e.location.start.line}, column ${e.location.start.column}`);
                }
            }

            this.rl.prompt();
        });
    }
}

// Auto-start if run directly
// Use a check for import.meta.url === process.argv[1] if possible, but simple export is safer.
