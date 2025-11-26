import {AgentBuilder} from '../agent/AgentBuilder.js';
import EventEmitter from 'events';

export class App extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.agents = new Map();
        this.activeAgentId = null;
    }

    get agent() {
        return this.agents.get(this.activeAgentId)?.agent ?? null;
    }

    async initialize() {
        if (this.agent) return this.agent;
        return this.createAgent('default', this.config);
    }

    async createAgent(agentId = null, config = {}) {
        const id = agentId ?? `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const effectiveConfig = Object.keys(config).length > 0 ? config : this.config;

        const agent = await new AgentBuilder(effectiveConfig).build();
        agent.id = id;

        this.agents.set(id, {
            id,
            agent,
            createdAt: new Date(),
            lastAccessed: new Date(),
            config: effectiveConfig
        });

        this.activeAgentId ??= id;
        return agent;
    }

    getAgent(agentId) {
        const entry = this.agents.get(agentId);
        if (entry) {
            entry.lastAccessed = new Date();
            return entry.agent;
        }
        return null;
    }

    switchAgent(agentId) {
        if (!this.agents.has(agentId)) {
            throw new Error(`Agent ${agentId} does not exist`);
        }
        this.activeAgentId = agentId;
        return this.getAgent(agentId);
    }

    listAgents() {
        return Array.from(this.agents.entries()).map(([id, entry]) => ({
            id: entry.id,
            createdAt: entry.createdAt,
            lastAccessed: entry.lastAccessed,
            isActive: entry.id === this.activeAgentId
        }));
    }

    async removeAgent(agentId) {
        if (!this.agents.has(agentId)) return false;

        const {agent} = this.agents.get(agentId);
        await this._cleanupAgent(agent, agentId);

        this.agents.delete(agentId);

        if (this.activeAgentId === agentId) {
            this.activeAgentId = this.agents.size > 0 ? this.agents.keys().next().value : null;
        }

        return true;
    }

    async start(options = {}) {
        const {startAgent = true, setupSignals = false} = options;

        if (!this.agent) await this.initialize();

        if (startAgent && this.agent && typeof this.agent.start === 'function') {
            this.agent.start();
        }

        if (setupSignals) {
            this.setupGracefulShutdown();
        }

        this.emit('started', this.agent);
        return this.agent;
    }

    async shutdown() {
        console.log('\nShutting down application...');

        for (const [id, {agent}] of this.agents) {
            if (!agent) continue;

            console.log(`Stopping agent ${id}...`);
            try {
                if (typeof agent.save === 'function') await agent.save();
                if (typeof agent.shutdown === 'function') {
                    await agent.shutdown();
                } else if (typeof agent.stop === 'function') {
                    agent.stop();
                }
            } catch (error) {
                console.error(`Error stopping agent ${id}:`, error.message);
            }
        }

        this.emit('stopped');
    }

    async _cleanupAgent(agent, agentId) {
        if (!agent) return;
        try {
            if (typeof agent.stop === 'function') agent.stop();
            if (typeof agent.dispose === 'function') await agent.dispose();
        } catch (error) {
            console.error(`Error cleaning up agent ${agentId}:`, error);
        }
    }

    setupGracefulShutdown() {
        const handleSignal = async () => {
            await this.shutdown();
            process.exit(0);
        };

        process.on('SIGINT', handleSignal);
        process.on('SIGTERM', handleSignal);
    }
}
