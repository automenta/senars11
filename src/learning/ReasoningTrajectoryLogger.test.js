import {ReasoningTrajectoryLogger} from '../learning/ReasoningTrajectoryLogger.js';
import {NAR} from '../nar/NAR.js';
import {jest} from '@jest/globals';

// Mock NAR
jest.mock('../nar/NAR.js');

describe('ReasoningTrajectoryLogger', () => {
    let logger;
    let mockNar;
    let mockBus;

    beforeEach(() => {
        mockBus = {
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn()
        };

        mockNar = {
            _eventBus: mockBus
        };

        logger = new ReasoningTrajectoryLogger();
    });

    test('attachToNAR subscribes to events', () => {
        logger.attachToNAR(mockNar);
        expect(mockBus.on).toHaveBeenCalledWith('task.input', expect.any(Function));
        expect(mockBus.on).toHaveBeenCalledWith('reasoning.derivation', expect.any(Function));
    });

    test('logs episodes correctly', () => {
        logger.attachToNAR(mockNar);
        const epId = logger.startNewEpisode({ userId: 'test' });

        expect(epId).toBeDefined();
        expect(logger.getEpisode(epId)).toBeDefined();

        // Simulate event
        const inputHandler = mockBus.on.mock.calls.find(c => c[0] === 'task.input')[1];
        inputHandler({ task: { toString: () => '<a-->b>.' } }, { traceId: 't1' });

        const episode = logger.getEpisode(epId);
        expect(episode.steps.length).toBe(1);
        expect(episode.steps[0].type).toBe('INPUT');
        expect(episode.steps[0].traceId).toBe('t1');

        logger.endCurrentEpisode();
        expect(logger.currentEpisode).toBeNull();
    });
});
