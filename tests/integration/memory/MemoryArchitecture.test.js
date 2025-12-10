import {Memory} from '../../../core/src/memory/Memory.js';
import {Focus} from '../../../core/src/memory/Focus.js';
import {FocusSetSelector} from '../../../core/src/memory/FocusSetSelector.js';
import {MemoryIndex} from '../../../core/src/memory/MemoryIndex.js';
import {MemoryConsolidation} from '../../../core/src/memory/MemoryConsolidation.js';
import {Concept} from '../../../core/src/memory/Concept.js';
import {createTask, createTerm} from '../../support/factories.js';
import {TermFactory} from '../../../core/src/term/TermFactory.js';

describe('Memory Architecture', () => {
    let memory, focus, selector, index, consolidation, tf;

    beforeEach(() => {
        tf = new TermFactory();
        memory = new Memory({priorityThreshold: 0.3, consolidationInterval: 5, priorityDecayRate: 0.1});
        focus = new Focus({maxFocusSets: 3, defaultFocusSetSize: 10, attentionDecayRate: 0.05});
        selector = new FocusSetSelector({maxSize: 5});
        index = new MemoryIndex();
        consolidation = new MemoryConsolidation({activationThreshold: 0.1, decayRate: 0.05, propagationFactor: 0.3});
    });

    test('focus vs long-term', () => {
        const [tA, tB, tC] = ['A', 'B', 'C'].map(name => createTerm(`term_${name}`));
        const [taskHigh, taskMed, taskLow] = [0.9, 0.6, 0.2].map((p, i) => createTask({
            term: [tA, tB, tC][i],
            budget: {priority: p}
        }));

        focus.createFocusSet('primary', 5);
        focus.setFocus('primary');
        focus.addTaskToFocus(taskHigh);
        memory.addTask(taskLow);

        expect(focus.getTasks(10)).toContain(taskHigh);
        expect(memory.getConcept(tC)).toBeDefined();

        expect(focus.getTasks(10).find(t => t.term.equals(tB))).toBeUndefined();
        expect(memory.getConcept(tB)).toBeNull();
    });

    test('promotion to long-term', () => {
        const term = createTerm('important');
        const task = createTask({term, budget: {priority: 0.85}});

        focus.createFocusSet('test', 3);
        focus.setFocus('test');
        focus.addTaskToFocus(task);
        expect(focus.getTasks(5)).toContain(task);

        memory.addTask(task);
        expect(memory.getConcept(term).term.equals(term)).toBe(true);
    });

    test('indexing', () => {
        const [dog, animal] = [tf.atomic('dog'), tf.atomic('animal')];
        const inheritance = tf.inheritance(dog, animal);

        [inheritance, tf.similarity(tf.atomic('cat'), tf.atomic('feline')), tf.conjunction(tf.atomic('rain'), tf.atomic('wet'))]
            .map(term => new Concept(term, {}))
            .forEach(c => index.addConcept(c));

        expect(index.getStats()).toMatchObject({totalConcepts: 3, inheritanceEntries: 1, similarityEntries: 2});

        const related = index.findInheritanceConcepts(dog);
        expect(related).toHaveLength(1);
        expect(related[0].term.equals(inheritance)).toBe(true);
    });

    test('consolidation', () => {
        Array.from({length: 5}, (_, i) => createTask({
            term: createTerm(`cons_${i}`),
            budget: {priority: 0.5 - (i * 0.1)}
        })).forEach((task, i) => memory.addTask(task, Date.now() - (i * 1000)));

        const result = consolidation.consolidate(memory, Date.now());
        expect(result).toHaveProperty('conceptsDecayed');
        expect(memory.getAllConcepts()).toBeInstanceOf(Array);
    });

    test('focus sets', () => {
        const sets = ['high', 'recent', 'diverse'];
        sets.forEach((s, i) => focus.createFocusSet(s, 3 + i));

        const tasks = sets.map((_, i) => createTask({term: createTerm(`T${i}`), budget: {priority: 0.9 - i * 0.2}}));

        sets.forEach((s, i) => {
            focus.setFocus(s);
            focus.addTaskToFocus(tasks[i]);
        });

        sets.forEach((s, i) => {
            focus.setFocus(s);
            expect(focus.getTasks(10)).toContain(tasks[i]);
        });

        expect(focus.getStats().totalFocusSets).toBeGreaterThanOrEqual(3);
    });

    test('stress test', () => {
        const start = Date.now();
        focus.createFocusSet('stress', 10);
        focus.setFocus('stress');

        for (let i = 0; i < 50; i++) {
            const task = createTask({term: createTerm(`stress_${i}`), budget: {priority: Math.random()}});
            focus.addTaskToFocus(task);
            memory.addTask(task);
            index.addConcept(memory.getConcept(task.term));
        }

        expect(Date.now() - start).toBeLessThan(2000);
        expect(focus.getTasks(100)).toHaveLength(10);
        expect(memory.getAllConcepts()).toHaveLength(50);
        expect(index.getStats().totalConcepts).toBe(50);
    });
});
