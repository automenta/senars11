import {NAR} from '../../../src/nar/NAR.js';
import {NARTool} from '../../../src/tool/NARTool.js';
import {PrologStrategy} from '../../../src/reason/strategy/PrologStrategy.js';
import {Task} from '../../../src/task/Task.js';

describe('NAL and Prolog Synergy', () => {
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

    test('Prolog feedback loop into NAL stream', async () => {
        await narTool.execute({action: 'assert_prolog', content: 'man(socrates).'});
        await narTool.execute({action: 'assert_prolog', content: 'mortal(X) :- man(X).'});

        const createPrologTerm = (pred, ...args) => {
            const argTerms = args.map(a => a.startsWith('?') ? tf.variable(a) : tf.atomic(a));
            return tf.predicate(tf.atomic(pred), tf.tuple(argTerms));
        };

        const subgoalTask = new Task({
            term: createPrologTerm('mortal', 'socrates'),
            punctuation: '?'
        });

        const answers = await nar.ask(subgoalTask);
        expect(answers.length).toBeGreaterThan(0);

        const answerTask = answers[0];
        const inputResult = await nar.input(answerTask);
        expect(inputResult).toBe(true);

        const inMemory = nar.memory.getConcept(answerTask.term) || nar._focus?.hasTask(answerTask);
        expect(inMemory).toBeTruthy();
    });
});
