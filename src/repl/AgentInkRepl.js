import React from 'react';
import {render} from 'ink';
import {AgentReplEngine} from './AgentReplEngine.js';
import {AgentInkTUI} from './components/AgentInkTUI.js';

export class AgentInkRepl {
    constructor(config = {}) {
        this.engine = new AgentReplEngine(config);
    }

    async start() {
        console.log('🤖 Starting Agent Ink TUI...');

        // Check for non-interactive environment
        if (!process.stdin.isTTY) {
            console.error('⚠️  Warning: TTY not detected, but proceeding with forced TUI mode.');
        }

        try {
            await this.engine.initialize();
            this.engine.addAgentCommands();
            render(React.createElement(AgentInkTUI, {engine: this.engine}));
        } catch (error) {
            console.error('❌ Failed to start Agent TUI:', error);
            process.exit(1);
        }
    }
}