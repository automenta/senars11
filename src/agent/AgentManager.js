/**
 * Agent management for SeNARS
 */
import {AgentBuilder} from './AgentBuilder.js';

export class AgentManager {
    constructor() {
        this.agents = new Map();
        this.currentAgentId = null;
    }

    async createAgent(agentId = null, config = {}) {
        const id = agentId || `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const agent = await new AgentBuilder(config).build();
        agent.id = id;

        this.agents.set(id, {
            id,
            agent,
            createdAt: new Date(),
            lastAccessed: new Date(),
            config,
            metadata: {}
        });

        this.currentAgentId = id;
        return id;
    }

    getAgent(agentId) {
        const entry = this.agents.get(agentId);
        if (entry) {
            entry.lastAccessed = new Date();
            return entry.agent;
        }
        return null;
    }

    getAgentEntry(agentId) {
        return this.agents.get(agentId);
    }

    switchAgent(agentId) {
        if (!this.agents.has(agentId)) {
            throw new Error(`Agent ${agentId} does not exist`);
        }
        this.currentAgentId = agentId;
        return this.getAgent(agentId);
    }

    getCurrentAgent() {
        return this.currentAgentId ? this.getAgent(this.currentAgentId) : null;
    }

    async executeInAgentContext(agentId, operation) {
        const originalAgentId = this.currentAgentId;
        try {
            this.currentAgentId = agentId;
            return await operation(this.getAgent(agentId));
        } finally {
            this.currentAgentId = originalAgentId;
        }
    }

    async saveAgent(agentId) {
        const entry = this.agents.get(agentId);
        if (!entry) throw new Error(`Agent ${agentId} does not exist`);

        const {agent} = entry;
        const agentState = agent?.serialize?.() ?? null;
        const history = agent?.getHistory?.() ?? [];

        return {
            id: entry.id,
            config: entry.config,
            createdAt: entry.createdAt,
            lastAccessed: entry.lastAccessed,
            agentState,
            history,
            metadata: entry.metadata
        };
    }

    async loadAgent(agentId, state) {
        if (this.agents.has(agentId)) throw new Error(`Agent ${agentId} already exists`);

        await this.createAgent(agentId, state.config);
        const agent = this.getAgent(agentId);

        if (state.agentState && agent?.deserialize) await agent.deserialize(state.agentState);
        if (state.history && agent?.sessionState) agent.sessionState.history = [...state.history];

        const entry = this.getAgentEntry(agentId);
        entry.metadata = state.metadata || {};
        if (state.createdAt) entry.createdAt = new Date(state.createdAt);

        return agent;
    }

    listAgents() {
        return Array.from(this.agents.entries()).map(([id, entry]) => ({
            id: entry.id,
            createdAt: entry.createdAt,
            lastAccessed: entry.lastAccessed,
            isActive: entry.id === this.currentAgentId
        }));
    }

    async removeAgent(agentId) {
        if (!this.agents.has(agentId)) return false;

        const {agent} = this.agents.get(agentId);
        agent?.stop?.();
        if (agent?.dispose) await agent.dispose();

        this.agents.delete(agentId);

        if (this.currentAgentId === agentId) {
            this.currentAgentId = this.agents.size > 0 ? this.agents.keys().next().value : null;
        }

        return true;
    }

    async clearAllAgents() {
        for (const {agent} of this.agents.values()) {
            if (agent?.dispose) await agent.dispose();
        }
        this.agents.clear();
        this.currentAgentId = null;
    }
}

export default new AgentManager();
