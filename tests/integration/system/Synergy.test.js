import {NAR} from '../../../core/src/nar/NAR.js';
import {NARTool} from '../../../core/src/tool/NARTool.js';
import {PrologStrategy} from '../../../core/src/reason/strategy/PrologStrategy.js';
import {Task} from '../../../core/src/task/Task.js';

describe('NAL-Prolog Synergy', () => {
    let nar, narTool, tf;

    beforeEach(async () => {
        nar = new NAR({
            reasoning: {
                type: 'stream',
                strategies: [new PrologStrategy()],
                maxDerivationDepth: 10
            },
            debug: {reasoning: false}
        });
        await nar.initialize();
        narTool = new NARTool(nar);
        tf = nar._termFactory;
    });

    const createPrologTerm = (pred, ...args) => {
        const argTerms = args.map(a => a.startsWith('?') ? tf.variable(a) : tf.atomic(a));
        return tf.predicate(tf.atomic(pred), tf.tuple(argTerms));
    };

    test('Prolog feedback loop → NAL stream', async () => {
        await narTool.execute({action: 'assert_prolog', content: 'man(socrates).'});
        await narTool.execute({action: 'assert_prolog', content: 'mortal(X) :- man(X).'});

        const subgoalTask = new Task({
            term: createPrologTerm('mortal', 'socrates'),
            punctuation: '?'
        });

        const answers = await nar.ask(subgoalTask);
        expect(answers.length).toBeGreaterThan(0);

        const inputResult = await nar.input(answers[0]);
        expect(inputResult).toBe(true);

        const inMemory = nar.memory.getConcept(answers[0].term) || nar._focus?.hasTask(answers[0]);
        expect(inMemory).toBeTruthy();
    });
});
