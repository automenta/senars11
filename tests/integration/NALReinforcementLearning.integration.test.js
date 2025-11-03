import { jest } from '@jest/globals';
import { NAR } from '../../src/nar/NAR.js';
import { IntrospectionEvents } from '../../src/util/IntrospectionEvents.js';
import { Term } from '../../src/term/Term.js';
import { TermFactory } from '../../src/term/TermFactory.js';
import { NarseseParser } from '../../src/parser/NarseseParser.js';


jest.setTimeout(10000); // Set a longer timeout for this integration test

describe('NAL Reinforcement Learning Integration Test', () => {
    let nar;
    let termFactory;
    let parser;

    beforeEach(async () => {
        nar = new NAR();
        await nar.initialize();
        termFactory = nar.componentManager.getComponent('termFactory');
        parser = new NarseseParser(termFactory);
    });

    afterEach(async () => {
        if (nar) {
            await nar.stop();
        }
    });

    test('should fire a GOAL_SATISFIED event when a derived belief matches a system goal', (done) => {
        const goalTerm = parser.parse('(<A> --> <B>).').term;
        nar.addGoal(goalTerm);

        const eventSpy = jest.fn();
        nar.on(IntrospectionEvents.GOAL_SATISFIED, eventSpy);

        // Input a belief that will lead to the satisfaction of the goal
        nar.input('A.');
        nar.input('(<A> --> <B>).');


        // We need to run a few cycles to allow the belief to be processed and inference to occur
        setTimeout(async () => {
            await nar.runCycles(5);

            expect(eventSpy).toHaveBeenCalled();
            const eventPayload = eventSpy.mock.calls[0][0];
            expect(eventPayload.goal.name).toEqual(goalTerm.name);
            expect(eventPayload.belief.term.name).toEqual(goalTerm.name);

            done();
        }, 500);
    });
});
