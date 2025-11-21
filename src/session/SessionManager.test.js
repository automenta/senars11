import {SessionManager} from '../session/SessionManager.js';
import {NAR} from '../nar/NAR.js';
import {jest} from '@jest/globals';

// Mock NAR to avoid full initialization overhead in unit tests
jest.mock('../nar/NAR.js');

describe('SessionManager', () => {
    let sessionManager;
    let mockNarInstance;

    beforeEach(() => {
        mockNarInstance = {
            initialize: jest.fn().mockResolvedValue(true),
            dispose: jest.fn().mockResolvedValue(true),
            serialize: jest.fn().mockReturnValue({some: 'state'}),
            deserialize: jest.fn().mockResolvedValue(true),
            getStats: jest.fn().mockReturnValue({})
        };
        NAR.mockImplementation(() => mockNarInstance);

        sessionManager = new SessionManager();
    });

    test('createSession creates a new session', async () => {
        const session = await sessionManager.createSession('test-session');
        expect(session).toBeDefined();
        expect(session.id).toBe('test-session');
        expect(sessionManager.sessions.has('test-session')).toBe(true);
        expect(NAR).toHaveBeenCalled();
        expect(mockNarInstance.initialize).toHaveBeenCalled();
    });

    test('getSession returns existing session', async () => {
        await sessionManager.createSession('session-1');
        const session = sessionManager.getSession('session-1');
        expect(session).toBeDefined();
        expect(session.id).toBe('session-1');
    });

    test('deleteSession removes session and disposes NAR', async () => {
        await sessionManager.createSession('session-to-delete');
        const result = await sessionManager.deleteSession('session-to-delete');
        expect(result).toBe(true);
        expect(sessionManager.sessions.has('session-to-delete')).toBe(false);
        expect(mockNarInstance.dispose).toHaveBeenCalled();
    });

    test('forkSession creates a copy', async () => {
        await sessionManager.createSession('source');
        const newSession = await sessionManager.forkSession('source', 'forked');

        expect(newSession).toBeDefined();
        expect(newSession.id).toBe('forked');
        expect(mockNarInstance.serialize).toHaveBeenCalled();
        expect(mockNarInstance.deserialize).toHaveBeenCalledWith({some: 'state'});
    });
});
