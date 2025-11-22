/**
 * @file TestNARRemote.test.js
 * @description Unit tests for TestNARRemote functionality
 */

import { TestNARRemote } from '../../src/testing/TestNARRemote.js';
import { RemoteTaskMatch } from '../../src/testing/TaskMatch.js';

describe('TestNARRemote', () => {
    test('Basic input and expectation via WebSocket', async () => {
        await new TestNARRemote()
            .input('<a --> b>', 0.9, 0.9)
            .expect('<a --> b>')
            .execute();
    });

    test('Inference test via WebSocket - should derive <a --> c> from <a --> b> and <b --> c>', async () => {
        await new TestNARRemote()
            .input('<a --> b>', 0.9, 0.9)
            .input('<b --> c>', 0.9, 0.9)
            .run(10)
            .expect('<a --> c>')
            .execute();
    });

    test('Truth value expectations via WebSocket', async () => {
        await new TestNARRemote()
            .input('<x --> y>', 0.8, 0.7)
            .expect(new RemoteTaskMatch('<x --> y>').withTruth(0.7, 0.6))
            .execute();
    });

    test('expectNot functionality via WebSocket', async () => {
        await new TestNARRemote()
            .input('<cat --> animal>', 1.0, 0.9)
            .run(3)
            .expectNot('<dog --> animal>')
            .execute();
    });

    test('Convenience methods work correctly', async () => {
        await new TestNARRemote()
            .input('<p --> q>', 0.8, 0.7)
            .expectWithTruth('<p --> q>', 0.7, 0.6)
            .execute();
    });

    test('Flexible truth matching via WebSocket', async () => {
        await new TestNARRemote()
            .input('<x --> y>', 0.9, 0.8)
            .expectWithFlexibleTruth('<x --> y>', 0.9, 0.8, 0.1)
            .execute();
    });
});