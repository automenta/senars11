#!/usr/bin/env node

import React from 'react';
import {render} from 'ink';
import {Config} from '../app/Config.js';
import {App} from '../app/App.js';
import {AgentInkTUI} from './components/AgentInkTUI.js';

class Repl {
    constructor() {
        this.config = Config.parse();
        this.app = new App(this.config);
        this.inkInstance = null;
    }

    async start() {
        console.log('🤖 SeNARS Unified Agent REPL - Hybrid Intelligence Lab\n');

        // If LM is not enabled via args, it remains disabled.
        // Users should provide --modelName or similar args to enable it.
        if (!this.config.lm.enabled && !this.config.demo) {
            console.log('ℹ️ LM not enabled. Use --modelName <name> to enable Agent capabilities.');
        }

        await this.startRepl();
    }

    async startRepl() {
        console.log('🚀 Starting REPL engine...\n');

        // Initialize app/agent
        const agent = await this.app.start({startAgent: false});

        console.log('✅ Engine ready. Rendering UI...');

        // Pass exitOnCtrlC: false so we can handle it gracefully in the UI or via our own logic
        // However, Ink's default is true.
        // If the user says "not even ctrl-c" works, it means something is blocking.
        // We will rely on AgentInkTUI to handle input.
        this.inkInstance = render(React.createElement(AgentInkTUI, {engine: agent}));

        // Register shutdown handler for TUI specific cleanup
        // We don't need to manually handle SIGINT if Ink handles it,
        // but if we want graceful shutdown of the agent, we might need to intercept.
        // For now, let's trust the App/Agent cleanup.
    }

    async shutdown() {
        this.inkInstance?.unmount();
        await this.app.shutdown();
        console.log('\n👋 Agent REPL session ended.');
    }
}

async function main() {
    const repl = new Repl();

    try {
        await repl.start();
    } catch (error) {
        console.error('❌ Error starting Agent REPL:', {error: error.message, stack: error.stack});
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
