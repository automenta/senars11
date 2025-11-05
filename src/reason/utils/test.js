/**
 * Test utilities for the new reasoner architecture
 */

import { Task } from '../../task/Task.js';
import { Truth } from '../../Truth.js';
import { ArrayStamp } from '../../Stamp.js';
import { Term } from '../../term/Term.js';
import { Memory } from '../../memory/Memory.js';

// Create a test task
export function createTestTask(termStr, type = 'BELIEF', freq = 0.9, conf = 0.9, priority = 0.5) {
  const term = new Term(termStr); // Create proper Term object
  const truth = new Truth(freq, conf);
  const stamp = new ArrayStamp({ source: 'INPUT' });
  
  return new Task({
    term,
    type,
    truth,
    stamp,
    budget: { priority }
  });
}

// Create a test memory (using real Memory component)
export function createTestMemory(tasks = []) {
  const memory = new Memory();
  
  // Add initial tasks to memory if provided
  for (const task of tasks) {
    memory.addTask(task);
  }
  
  return memory;
}

// Create a test task bag
export function createTestTaskBag(tasks = []) {
  return {
    tasks: [...tasks],
    take: () => tasks.shift() || null,
    size: () => tasks.length,
    add: (task) => tasks.push(task),
    getAll: () => [...tasks]
  };
}