import { ReplEngine } from '../repl/ReplEngine.js';
import { BlessedAdapter } from '../repl/adapters/BlessedAdapter.js';

export class Repl {
    constructor(config = {}) {
        this.engine = new ReplEngine(config);
        this.adapter = new BlessedAdapter(this.engine);
    }

    async start() {
        console.log('SeNARS Reasoning Engine - TUI Mode');
        await this.adapter.start();
    }
}