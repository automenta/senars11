import { Task } from './core/src/task/Task.js';
import { TermFactory } from './core/src/term/TermFactory.js';

const factory = new TermFactory();
const term = factory.atomic('A');

// Test with partial budget
const task1 = new Task({ term, budget: { priority: 0.6 }, truth: { frequency: 0.9, confidence: 0.8 } });
console.log('Task1 budget:', JSON.stringify(task1.budget));

// Test with full budget
const task2 = new Task({
    term: factory.atomic('B'),
    budget: { priority: 0.8, durability: 0.5, quality: 0.5, cycles: 100, depth: 10 },
    truth: { frequency: 0.9, confidence: 0.8 }
});
console.log('Task2 budget:', JSON.stringify(task2.budget));
