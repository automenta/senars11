import {z} from 'zod';

// Schema for demo-related messages
const demoControlSchema = z.object({
  type: z.literal('demoControl'),
  payload: z.object({
    command: z.enum(['start', 'stop', 'pause', 'resume', 'step', 'configure']),
    demoId: z.string(),
    parameters: z.record(z.unknown()).optional(),
  }),
});

const demoStateSchema = z.object({
  type: z.literal('demoState'),
  payload: z.object({
    demoId: z.string(),
    state: z.enum(['ready', 'running', 'paused', 'stopped', 'error']),
    progress: z.number().optional(), // 0-100%
    currentStep: z.number().optional(),
    totalSteps: z.number().optional(),
    parameters: z.record(z.unknown()).optional(),
  }),
});

const demoStepSchema = z.object({
  type: z.literal('demoStep'),
  payload: z.object({
    demoId: z.string(),
    step: z.number(),
    description: z.string(),
    data: z.record(z.unknown()),
    timestamp: z.number(),
  }),
});

const demoMetricsSchema = z.object({
  type: z.literal('demoMetrics'),
  payload: z.object({
    demoId: z.string(),
    systemMetrics: z.object({
      tasksProcessed: z.number(),
      conceptsActive: z.number(),
      cyclesCompleted: z.number(),
      memoryUsage: z.number(),
      priorityFluctuations: z.array(z.object({
        concept: z.string(),
        oldPriority: z.number(),
        newPriority: z.number(),
        timestamp: z.number(),
      })).optional(),
    }),
  }),
});

const demoListSchema = z.object({
  type: z.literal('demoList'),
  payload: z.object({
    demos: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      parameters: z.array(z.object({
        name: z.string(),
        type: z.string(),
        defaultValue: z.unknown(),
        description: z.string(),
      })).optional(),
    })),
  }),
});

// Export all schemas
export {
  demoControlSchema,
  demoStateSchema,
  demoStepSchema,
  demoMetricsSchema,
  demoListSchema,
};

// Add to the main validation registry
export const demoSchemas = {
  'demoControl': demoControlSchema,
  'demoState': demoStateSchema,
  'demoStep': demoStepSchema,
  'demoMetrics': demoMetricsSchema,
  'demoList': demoListSchema,
};