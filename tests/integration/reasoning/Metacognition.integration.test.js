import { jest } from '@jest/globals';
import { NAR } from '../../../src/nar/NAR.js';
import { IntrospectionEvents } from '../../../src/util/IntrospectionEvents.js';

// Set a longer timeout for this integration test
jest.setTimeout(10000);

describe('Metacognition Integration Test', () => {
    let nar;
    let metacognition;
    let eventBus;

    beforeEach(async () => {
        const config = {
            components: {
                metacognition: {
                    enabled: true,
                    path: '../../reasoning/Metacognition.js',
                    class: 'Metacognition',
                    dependencies: ['nar', 'eventBus'],
                },
            },
        };

        nar = new NAR(config);
        await nar.initialize();

        metacognition = nar.componentManager.getComponent('metacognition');
        eventBus = nar.eventBus;
    });

    afterEach(async () => {
        if (nar) {
            await nar.stop();
        }
    });

    test('Metacognition component should be loaded and receive an introspection event', (done) => {
        // Spy on the handleEvent method to verify it's called
        const handleEventSpy = jest.spyOn(metacognition, 'handleEvent');

        const testEvent = {
            type: IntrospectionEvents.TERM_CREATED,
            data: { term: { name: 'testTerm' } },
            timestamp: Date.now(),
        };

        eventBus.emit(testEvent.type, testEvent.data);

        // Give the event bus a moment to process
        setTimeout(() => {
            expect(handleEventSpy).toHaveBeenCalled();
            expect(handleEventSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: IntrospectionEvents.TERM_CREATED,
                data: { term: { name: 'testTerm' } },
            }));

            handleEventSpy.mockRestore();
            done();
        }, 100);
    });
});
