import {EventEmitter} from 'events';
import blessed from 'blessed';

/**
 * Agent Status Component - Shows the current agent's status and goals
 */
export class AgentStatusComponent {
    constructor(options = {}) {
        this.elementConfig = options.elementConfig || {};
        this.parent = options.parent;
        this.eventEmitter = options.eventEmitter;
        this.engine = options.engine;
        this.element = null;
    }

    init() {
        this.element = blessed.box({
            ...this.elementConfig,
            content: '🤖 Agent Status: No active agent',
            tags: true,
            border: {type: 'line'},
            style: {
                fg: 'white',
                bg: 'black',
                border: {fg: 'magenta'}
            }
        });

        this.parent.append(this.element);

        // Listen for agent events to update status
        this.eventEmitter.on('agent.action', (data) => {
            this.updateContent();
        });

        this.eventEmitter.on('agent.decision', (data) => {
            this.updateContent();
        });

        // Also update periodically
        setInterval(() => {
            this.updateContent();
        }, 5000); // Update every 5 seconds

        return this;
    }

    updateContent() {
        if (!this.engine || !this.element) return;

        try {
            // Only call if the engine has the _getAgentStatus method
            if (typeof this.engine._getAgentStatus === 'function') {
                const agentInfo = this.engine._getAgentStatus(this.engine.activeAgent || 'current');
                this.element.setContent(agentInfo);
            } else {
                this.element.setContent('🤖 Agent Status: No engine status available');
            }
            this.parent.render();
        } catch (error) {
            // Handle errors gracefully
            this.element.setContent(`🤖 Agent Status Error: ${error.message}`);
            this.parent.render();
        }
    }

    getElement() {
        return this.element;
    }
}