import {NAR} from '../nar/NAR.js';
import {ConfigValidator} from '../config/Config.js';

/**
 * Wrapper for a NAR instance within a session.
 */
class Session {
    constructor(id, nar, config, trajectoryLogger = null) {
        this.id = id;
        this.nar = nar;
        this.config = config;
        this.trajectoryLogger = trajectoryLogger;
        this.createdAt = Date.now();
        this.lastActiveAt = Date.now();
        this.clients = new Set(); // Connected WebSocket clients
    }

    /**
     * Updates the last active timestamp.
     */
    touch() {
        this.lastActiveAt = Date.now();
    }

    /**
     * Adds a client to this session.
     * @param {Object} client - The WebSocket client object.
     */
    addClient(client) {
        this.clients.add(client);
    }

    /**
     * Removes a client from this session.
     * @param {Object} client - The WebSocket client object.
     */
    removeClient(client) {
        this.clients.delete(client);
    }

    /**
     * Serialize session metadata (not the full NAR state, unless requested).
     */
    toJSON() {
        return {
            id: this.id,
            createdAt: this.createdAt,
            lastActiveAt: this.lastActiveAt,
            clientCount: this.clients.size,
            narStats: this.nar.getStats() // Basic stats
        };
    }
}

/**
 * Manages multiple NAR sessions.
 */
export class SessionManager {
    constructor(config = {}) {
        this.sessions = new Map();
        this.defaultConfig = config;
    }

    /**
     * Creates a new session with a new NAR instance.
     * @param {string} [sessionId] - Optional custom session ID. If not provided, one is generated.
     * @param {Object} [config] - Configuration for the new NAR instance.
     * @returns {Promise<Session>} The created session.
     */
    async createSession(sessionId = null, config = {}) {
        const id = sessionId || `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        if (this.sessions.has(id)) {
            throw new Error(`Session with ID ${id} already exists.`);
        }

        const mergedConfig = ConfigValidator.mergeWithDefaults({...this.defaultConfig, ...config});
        const nar = new NAR(mergedConfig);

        // Initialize the NAR instance
        await nar.initialize();

        // TODO: Initialize TrajectoryLogger here once implemented
        const trajectoryLogger = null;

        const session = new Session(id, nar, mergedConfig, trajectoryLogger);
        this.sessions.set(id, session);

        console.log(`[SessionManager] Created session: ${id}`);
        return session;
    }

    /**
     * Retrieves a session by ID.
     * @param {string} sessionId
     * @returns {Session|undefined}
     */
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.touch();
        }
        return session;
    }

    /**
     * Deletes a session and cleans up its resources.
     * @param {string} sessionId
     * @returns {Promise<boolean>} True if deleted, false if not found.
     */
    async deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        // Clean up NAR
        await session.nar.dispose();

        // Notify clients? (Optional, clients might just get disconnected)

        this.sessions.delete(sessionId);
        console.log(`[SessionManager] Deleted session: ${sessionId}`);
        return true;
    }

    /**
     * Lists all active sessions.
     * @returns {Array<Object>} Array of session metadata.
     */
    listSessions() {
        return Array.from(this.sessions.values()).map(s => s.toJSON());
    }

    /**
     * Forks an existing session (creates a copy).
     * This is useful for A/B testing from a common state.
     * @param {string} sourceSessionId
     * @param {string} [newSessionId]
     * @returns {Promise<Session>} The new forked session.
     */
    async forkSession(sourceSessionId, newSessionId = null) {
        const sourceSession = this.sessions.get(sourceSessionId);
        if (!sourceSession) {
            throw new Error(`Source session ${sourceSessionId} not found.`);
        }

        // Serialize the source state
        const state = sourceSession.nar.serialize();

        // Create new session
        const newSession = await this.createSession(newSessionId, sourceSession.config);

        // Load state into new session
        await newSession.nar.deserialize(state);

        console.log(`[SessionManager] Forked session ${sourceSessionId} to ${newSession.id}`);
        return newSession;
    }

    /**
     * Cleans up all sessions.
     */
    async destroyAll() {
        for (const id of this.sessions.keys()) {
            await this.deleteSession(id);
        }
    }
}
