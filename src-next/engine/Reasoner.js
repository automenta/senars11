import {EventBus} from '../infra/EventBus.js';
import {Memory} from './Memory.js';
import {TermFactory} from '../core/TermFactory.js';
import {Task, TaskType} from '../core/Task.js';
import {Truth} from '../core/Truth.js';

import {PremiseSource} from './PremiseSource.js';
import {Strategy} from './Strategy.js';
import {RuleProcessor} from './RuleProcessor.js';
import {SyllogisticRule} from '../logic/rules/SyllogisticRule.js';
import {AnalogyRule} from '../logic/rules/AnalogyRule.js';

export class Reasoner {
    constructor(config = {}) {
        this.memory = new Memory();
        this.eventBus = new EventBus();
        this.termFactory = new TermFactory();
        this.config = config;

        // Stream Components
        this.source = new PremiseSource(this.memory);
        this.strategy = new Strategy(this.memory);
        this.processor = new RuleProcessor();

        // Register Rules
        this.processor.register(new SyllogisticRule());
        this.processor.register(new AnalogyRule());

        this.inputBuffer = [];
    }

    input(data) {
        let task = data;
        if (!(task instanceof Task)) {
             if (data.term && data.taskType) {
                 const truth = data.truthValue ? new Truth(data.truthValue.frequency, data.truthValue.confidence) : null;
                 task = new Task(data.term, data.taskType, truth);
             } else {
                 console.warn('Reasoner input invalid:', data);
                 return;
             }
        }

        this.inputBuffer.push(task);
        this.eventBus.emit('input', {task});

        // Add to Memory (Entry point)
        this.memory.addResult(task);
    }

    step() {
        // 1. Premise Selection (Stream Source)
        const task = this.source.getTask();
        if (!task) return; // Nothing to do

        const context = {termFactory: this.termFactory};

        // 2. Strategy (Select Beliefs)
        const beliefs = this.strategy.selectPremises(task);

        // 3. Rule Processing
        for (const belief of beliefs) {
            const derivedTasks = this.processor.process(task, belief, context);

            for (const derived of derivedTasks) {
                this.eventBus.emit('derivation', {
                    task: derived,
                    parent1: task,
                    parent2: belief
                });

                // Feedback loop: Add derived task to Memory
                this.memory.addResult(derived);
            }
        }

        // Decay / Cleanup?
        // For now, task is removed from focus by source.getTask().
        // If we want to keep it, we'd put it back with lower priority.
    }

    run(steps = 10) {
        for (let i = 0; i < steps; i++) {
            this.step();
        }
    }
}
