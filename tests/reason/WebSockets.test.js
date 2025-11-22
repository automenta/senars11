/**
 * @file WebSockets.test.js
 * @description Unit tests for WebSocket pathway using TestNARRemote
 *              Verifies that WebSocket communication pathway produces identical results
 *              to direct reasoner tests, ensuring UI/REPL functionality is preserved.
 */

import { TestNARRemote } from '../../src/testing/TestNARRemote.js';
import { RemoteTaskMatch } from '../../src/testing/TaskMatch.js';

describe('WebSocket Pathway Tests', () => {
    test('Basic inheritance chain via WebSocket - should match repl:test behavior', async () => {
        // This test replicates the exact same logic as repl:test default case
        // Input: <a ==> b> and <b ==> c>, expect derivation of <a ==> c>
        await new TestNARRemote()
            .input('<a ==> b>', 1.0, 0.9)
            .input('<b ==> c>', 1.0, 0.9)
            .run(5) // matches repl:test stepsToRun config
            .expect('<a ==> c>')
            .execute();
    });

    test('Complex inheritance via WebSocket - should match repl:test behavior', async () => {
        // Test: <robinson ==> bird> and <bird ==> animal> should derive <robinson ==> animal>
        await new TestNARRemote()
            .input('<robinson ==> bird>', 1.0, 0.9)
            .input('<bird ==> animal>', 1.0, 0.9)
            .run(5)
            .expect('<robinson ==> animal>')
            .execute();
    });

    test('Multiple inheritance chain via WebSocket - should match repl:test behavior', async () => {
        // Test: <car ==> vehicle> and <vehicle ==> object> should derive <car ==> object>
        // but should NOT derive <car ==> entity> (verifying reasoning limits)
        await new TestNARRemote()
            .input('<car ==> vehicle>', 1.0, 0.9)
            .input('<vehicle ==> object>', 1.0, 0.9)
            .run(5)
            .expect('<car ==> object>')
            .expectNot('<car ==> entity>')
            .execute();
    });

    test('Truth value expectations via WebSocket pathway', async () => {
        // Test that derived tasks have expected truth values
        await new TestNARRemote()
            .input('<x ==> y>', 1.0, 0.9)
            .input('<y ==> z>', 1.0, 0.9)
            .run(5)
            .expect(new RemoteTaskMatch('<x ==> z>').withFlexibleTruth(1.0, 0.8, 0.1))
            .execute();
    });

    test('No spurious derivations via WebSocket pathway', async () => {
        // Ensure that unrelated concepts don't get spurious derivations
        await new TestNARRemote()
            .input('<cat ==> animal>', 1.0, 0.9)
            .run(3)
            .expectNot('<dog ==> animal>')
            .execute();
    });

    test('Sequential inputs via WebSocket produce correct derivations', async () => {
        // Test multiple inputs in sequence
        await new TestNARRemote()
            .input('<dog ==> animal>', 1.0, 0.9)
            .input('<animal ==> living_thing>', 1.0, 0.9)
            .input('<living_thing ==> thing>', 1.0, 0.9)
            .run(15)  // Increase cycles for longer chain derivation
            .expect('<dog ==> living_thing>')  // Should derive intermediate step
            .expect('<dog ==> thing>')         // Should derive final step
            .execute();
    });

    test('Basic property inheritance via WebSocket', async () => {
        // Simple property inheritance test
        await new TestNARRemote()
            .input('<robin ==> bird>', 1.0, 0.9)
            .input('<bird ==> [flying]>', 1.0, 0.9)  // bird has property flying
            .run(5)
            .expect('<robin ==> [flying]>')  // robin inherits flying property
            .execute();
    });
});