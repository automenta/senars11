/**
 * Session management for SeNARS to provide isolated reasoning contexts
 */

export class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.currentSessionId = null;
    }

    /**
     * Create a new reasoning session
     */
    async createSession(sessionId = null, config = {}) {
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        }

        // Import SeNARS NAR (NARS Reasoner Engine) to create a new instance
        const {NAR} = await import('../nar/NAR.js');
        const nar = new NAR(config);

        this.sessions.set(sessionId, {
            id: sessionId,
            nar: nar,
            createdAt: new Date(),
            lastAccessed: new Date(),
            config: config,
            metadata: {}
        });

        this.currentSessionId = sessionId;
        return sessionId;
    }

    /**
     * Get a session by ID
     */
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastAccessed = new Date();
        }
        return session;
    }

    /**
     * Switch to a different session
     */
    switchSession(sessionId) {
        if (!this.sessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} does not exist`);
        }
        this.currentSessionId = sessionId;
        return this.getSession(sessionId);
    }

    /**
     * Get the current active session
     */
    getCurrentSession() {
        return this.sessions.get(this.currentSessionId);
    }

    /**
     * Execute an operation in a specific session context
     */
    async executeInSession(sessionId, operation) {
        const originalSessionId = this.currentSessionId;
        try {
            this.currentSessionId = sessionId;
            const session = this.getSession(sessionId);
            return await operation(session);
        } finally {
            this.currentSessionId = originalSessionId;
        }
    }

    /**
     * Save session state
     */
    saveSession(sessionId) {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} does not exist`);
        }

        // Get the memory state from the NAR if available
        let memoryState = null;
        if (session.nar?.memory && typeof session.nar.memory.exportState === 'function') {
            memoryState = session.nar.memory.exportState();
        }

        return {
            id: session.id,
            config: session.config,
            createdAt: session.createdAt,
            lastAccessed: session.lastAccessed,
            memoryState: memoryState,
            metadata: session.metadata
        };
    }

    /**
     * Load session state
     */
    async loadSession(sessionId, state) {
        if (this.sessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} already exists`);
        }

        // Create a new NAR instance with the original config
        const {NAR} = await import('../nar/NAR.js');
        const nar = new NAR(state.config);

        // If we have memory state, try to restore it
        if (state.memoryState && nar.memory && typeof nar.memory.importState === 'function') {
            nar.memory.importState(state.memoryState);
        }

        this.sessions.set(sessionId, {
            id: state.id,
            nar: nar,
            createdAt: state.createdAt || new Date(),
            lastAccessed: state.lastAccessed || new Date(),
            config: state.config,
            metadata: state.metadata || {}
        });

        return this.sessions.get(sessionId);
    }

    /**
     * List all sessions
     */
    listSessions() {
        return Array.from(this.sessions.entries()).map(([id, session]) => ({
            id: session.id,
            createdAt: session.createdAt,
            lastAccessed: session.lastAccessed,
            isActive: session.id === this.currentSessionId
        }));
    }

    /**
     * Remove a session
     */
    removeSession(sessionId) {
        if (this.sessions.has(sessionId)) {
            const session = this.sessions.get(sessionId);
            // Optionally clean up the NAR instance
            if (session.nar && typeof session.nar.dispose === 'function') {
                session.nar.dispose();
            }
            this.sessions.delete(sessionId);

            if (this.currentSessionId === sessionId) {
                this.currentSessionId = this.sessions.size > 0
                    ? this.sessions.keys().next().value
                    : null;
            }

            return true;
        }
        return false;
    }

    /**
     * Clear all sessions
     */
    clearAllSessions() {
        for (const [id, session] of this.sessions) {
            if (session.nar && typeof session.nar.dispose === 'function') {
                session.nar.dispose();
            }
        }
        this.sessions.clear();
        this.currentSessionId = null;
    }
}

// Export a default instance for convenience
export default new SessionManager();