import { ReplEngine } from '../repl/ReplEngine.js';
import { BlessedAdapter } from '../repl/adapters/BlessedAdapter.js';

export class SeNARSInterface {
    constructor(config = {}) {
        this.engine = new ReplEngine(config);
        this.adapter = new BlessedAdapter(this.engine);
    }

    async start() {
        await this.adapter.start();
    }
}