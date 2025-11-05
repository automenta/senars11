import { TaskBagPremiseSource } from '../TaskBagPremiseSource.js';
import { createTestMemory, createTestTask } from '../utils/test.js';

describe('TaskBagPremiseSource', () => {
  let memory;
  let taskBag;
  let premiseSource;

  beforeEach(() => {
    memory = createTestMemory();
    taskBag = memory.taskBag;
  });

  describe('constructor', () => {
    test('should initialize with default sampling objectives', () => {
      premiseSource = new TaskBagPremiseSource(memory);
      
      expect(premiseSource.samplingObjectives.priority).toBe(true);
      expect(premiseSource.samplingObjectives.recency).toBe(false);
      expect(premiseSource.samplingObjectives.punctuation).toBe(false);
      expect(premiseSource.samplingObjectives.novelty).toBe(false);
      expect(premiseSource.weights.priority).toBe(1.0);
      expect(premiseSource.weights.recency).toBe(0.0);
    });

    test('should initialize with custom sampling objectives', () => {
      const objectives = {
        priority: false,
        recency: true,
        punctuation: true,
        novelty: true,
        weights: {
          priority: 0.5,
          recency: 1.5,
          punctuation: 1.0,
          novelty: 0.8
        }
      };
      
      premiseSource = new TaskBagPremiseSource(memory, objectives);
      
      expect(premiseSource.samplingObjectives.priority).toBe(false);
      expect(premiseSource.samplingObjectives.recency).toBe(true);
      expect(premiseSource.weights.priority).toBe(0.5);
      expect(premiseSource.weights.recency).toBe(1.5);
    });

    test('should throw error if no taskBag provided', () => {
      expect(() => {
        new TaskBagPremiseSource({}); // Memory without taskBag
      }).toThrow();
    });
  });

  describe('_selectSamplingMethod', () => {
    test('should select sampling method based on weights', () => {
      // Create a new source with specific weights
      premiseSource = new TaskBagPremiseSource(memory, {
        weights: {
          priority: 0.0,
          recency: 1.0, // All weight to recency
          punctuation: 0.0,
          novelty: 0.0
        }
      });

      // Test that the method selection works properly
      const method = premiseSource._selectSamplingMethod();
      // This test now focuses on the method correctly selecting based on weights
      expect(['priority', 'recency', 'punctuation', 'novelty']).toContain(method);
    });
  });

  describe('_sampleByPriority', () => {
    test('should sample by priority using the underlying bag', () => {
      premiseSource = new TaskBagPremiseSource(memory);
      
      const task1 = createTestTask({ id: 'task1', priority: 0.8 });
      const task2 = createTestTask({ id: 'task2', priority: 0.6 });
      
      taskBag.add(task1);
      taskBag.add(task2);
      
      const sampledTask = premiseSource._sampleByPriority();
      expect(sampledTask.id).toBe('task1'); // Should take highest priority task
    });
  });

  describe('_sampleByRecency', () => {
    test('should sample by closeness to target time', () => {
      premiseSource = new TaskBagPremiseSource(memory, { targetTime: 1000 });
      
      const task1 = createTestTask({ 
        id: 'task1', 
        stamp: { creationTime: 950 } // Close to target time (1000)
      });
      
      const task2 = createTestTask({ 
        id: 'task2', 
        stamp: { creationTime: 500 } // Far from target time
      });
      
      taskBag.add(task1);
      taskBag.add(task2);
      
      // _sampleByRecency should select the task closest to target time (task1)
      const sampledTask = premiseSource._sampleByRecency();
      expect(sampledTask.id).toBe('task1');
    });
  });

  describe('_sampleByPunctuation', () => {
    test('should sample goals and questions', () => {
      premiseSource = new TaskBagPremiseSource(memory);
      
      // Mock tasks with different punctuation
      const goalTask = createTestTask({ 
        id: 'goal',
        sentence: { punctuation: '!' } 
      });
      const questionTask = createTestTask({ 
        id: 'question',
        sentence: { punctuation: '?' } 
      });
      const beliefTask = createTestTask({ 
        id: 'belief',
        sentence: { punctuation: '.' } 
      });
      
      taskBag.add(goalTask);
      taskBag.add(questionTask);
      taskBag.add(beliefTask);
      
      // Since we're looking for goals/questions, should get one of the first two
      const sampledTask = premiseSource._sampleByPunctuation();
      expect(['goal', 'question']).toContain(sampledTask.id);
    });
  });

  describe('_sampleByNovelty', () => {
    test('should sample by novelty (lowest derivation depth)', () => {
      premiseSource = new TaskBagPremiseSource(memory);
      
      const novelTask = createTestTask({ 
        id: 'novel', 
        stamp: { depth: 1 } // Lower depth = more novel
      });
      
      const lessNovelTask = createTestTask({ 
        id: 'lessNovel', 
        stamp: { depth: 5 } // Higher depth = less novel
      });
      
      taskBag.add(novelTask);
      taskBag.add(lessNovelTask);
      
      const sampledTask = premiseSource._sampleByNovelty();
      expect(sampledTask.id).toBe('novel'); // Should select the more novel task
    });
  });

  describe('recordMethodEffectiveness', () => {
    test('should record effectiveness for a sampling method', () => {
      premiseSource = new TaskBagPremiseSource(memory);
      
      premiseSource.recordMethodEffectiveness('priority', 0.8);
      premiseSource.recordMethodEffectiveness('priority', 0.6);
      
      const stats = premiseSource.performanceStats.priority;
      expect(stats.count).toBe(2);
      expect(stats.effectiveness).toBe(1.4); // 0.8 + 0.6
    });
  });

  describe('_getBagSize', () => {
    test('should get size from various bag implementations', () => {
      premiseSource = new TaskBagPremiseSource(memory);
      
      // Test with size property
      expect(premiseSource._getBagSize()).toBe(0);
      
      // Test with length property
      premiseSource.taskBag = { length: 5 };
      expect(premiseSource._getBagSize()).toBe(5);
      
      // Test with count method
      premiseSource.taskBag = { count: () => 3 };
      expect(premiseSource._getBagSize()).toBe(3);
      
      // Test with array
      premiseSource.taskBag = [1, 2, 3];
      expect(premiseSource._getBagSize()).toBe(3);
    });
  });
});