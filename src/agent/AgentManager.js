/**
 * Agent management for SeNARS
 */
import {AgentBuilder} from './AgentBuilder.js';

export class AgentManager {
    constructor() {
        this.agents = new Map();
        this.currentAgentId = null;
    }

    /**
     * Create a new agent
     */
    async createAgent(agentId = null, config = {}) {
        if (!agentId) {
            agentId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        }

        // Use AgentBuilder to create the agent
        const builder = new AgentBuilder(config);
        const agent = await builder.build();

        // Ensure ID matches
        agent.id = agentId;

        this.agents.set(agentId, {
            id: agentId,
            agent: agent, // The Agent instance
            createdAt: new Date(),
            lastAccessed: new Date(),
            config: config,
            metadata: {}
        });

        this.currentAgentId = agentId;
        return agentId;
    }

    /**
     * Get an agent by ID
     */
    getAgent(agentId) {
        const agentEntry = this.agents.get(agentId);
        if (agentEntry) {
            agentEntry.lastAccessed = new Date();
            return agentEntry.agent;
        }
        return null;
    }

    /**
     * Get the full agent entry (with metadata)
     */
    getAgentEntry(agentId) {
        return this.agents.get(agentId);
    }

    /**
     * Switch to a different agent (set as current)
     */
    switchAgent(agentId) {
        if (!this.agents.has(agentId)) {
            throw new Error(`Agent ${agentId} does not exist`);
        }
        this.currentAgentId = agentId;
        return this.getAgent(agentId);
    }

    /**
     * Get the current active agent
     */
    getCurrentAgent() {
        if (!this.currentAgentId) return null;
        return this.getAgent(this.currentAgentId);
    }

    /**
     * Execute an operation in a specific agent context
     */
    async executeInAgentContext(agentId, operation) {
        const originalAgentId = this.currentAgentId;
        try {
            this.currentAgentId = agentId;
            const agent = this.getAgent(agentId);
            return await operation(agent);
        } finally {
            this.currentAgentId = originalAgentId;
        }
    }

    /**
     * Save agent state
     */
    async saveAgent(agentId) {
        const agentEntry = this.agents.get(agentId);
        if (!agentEntry) {
            throw new Error(`Agent ${agentId} does not exist`);
        }

        const agent = agentEntry.agent;
        // Serialize agent state
        let agentState = null;
        if (agent && typeof agent.serialize === 'function') {
            agentState = agent.serialize();
        }

        // Also save history etc if available
        const history = agent.getHistory ? agent.getHistory() : [];

        return {
            id: agentEntry.id,
            config: agentEntry.config,
            createdAt: agentEntry.createdAt,
            lastAccessed: agentEntry.lastAccessed,
            agentState: agentState,
            history: history,
            metadata: agentEntry.metadata
        };
    }

    /**
     * Load agent state
     */
    async loadAgent(agentId, state) {
        if (this.agents.has(agentId)) {
            throw new Error(`Agent ${agentId} already exists`);
        }

        // Rebuild the agent using the saved config
        await this.createAgent(agentId, state.config);
        const agent = this.getAgent(agentId);

        // Restore agent state
        if (state.agentState && agent && typeof agent.deserialize === 'function') {
            await agent.deserialize(state.agentState);
        }

        // Restore history if needed
        if (state.history && agent.sessionState) {
            agent.sessionState.history = [...state.history];
        }

        const agentEntry = this.getAgentEntry(agentId);
        agentEntry.metadata = state.metadata || {};
        agentEntry.createdAt = state.createdAt ? new Date(state.createdAt) : agentEntry.createdAt;

        return agent;
    }

    /**
     * List all agents
     */
    listAgents() {
        return Array.from(this.agents.entries()).map(([id, entry]) => ({
            id: entry.id,
            createdAt: entry.createdAt,
            lastAccessed: entry.lastAccessed,
            isActive: entry.id === this.currentAgentId
        }));
    }

    /**
     * Remove an agent
     */
    async removeAgent(agentId) {
        if (this.agents.has(agentId)) {
            const entry = this.agents.get(agentId);
            const agent = entry.agent;

            // Shutdown agent if possible
            if (agent && typeof agent.stop === 'function') {
                agent.stop(); // Stop run loop
            }
            if (agent && typeof agent.dispose === 'function') {
                await agent.dispose();
            }

            this.agents.delete(agentId);

            if (this.currentAgentId === agentId) {
                this.currentAgentId = this.agents.size > 0
                    ? this.agents.keys().next().value
                    : null;
            }

            return true;
        }
        return false;
    }

    /**
     * Clear all agents
     */
    async clearAllAgents() {
        for (const [id, entry] of this.agents) {
             const agent = entry.agent;
             if (agent && typeof agent.dispose === 'function') {
                await agent.dispose();
            }
        }
        this.agents.clear();
        this.currentAgentId = null;
    }
}

// Export a default instance for convenience
export default new AgentManager();
