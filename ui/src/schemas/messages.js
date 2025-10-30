import { z } from 'zod';

// Base schema
export const messageSchema = z.object({
  type: z.string(),
  payload: z.unknown().optional(),
  timestamp: z.number().optional(),
});

// Payload schemas
export const reasoningStepSchema = z.object({
  id: z.string(),
  step: z.number(),
  description: z.string(),
  result: z.string().optional(),
  timestamp: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export const sessionUpdateSchema = z.object({
  action: z.enum(['start', 'end', 'update']),
  session: z.object({
    id: z.string(),
    name: z.string(),
    timestamp: z.number(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
});

export const notificationSchema = z.object({
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string(),
  message: z.string(),
  timestamp: z.number(),
  duration: z.number().optional(),
});

// Specific message schemas
export const layoutUpdateSchema = messageSchema.extend({
  type: z.literal('layoutUpdate'),
  payload: z.object({ layout: z.record(z.unknown()) }),
});

export const panelUpdateSchema = messageSchema.extend({
  type: z.literal('panelUpdate'),
  payload: z.object({ id: z.string(), config: z.record(z.unknown()) }),
});

export const reasoningStepSchemaMsg = messageSchema.extend({
  type: z.literal('reasoningStep'),
  payload: z.object({ step: reasoningStepSchema }),
});

export const sessionUpdateSchemaMsg = messageSchema.extend({
  type: z.literal('sessionUpdate'),
  payload: sessionUpdateSchema,
});

export const notificationSchemaMsg = messageSchema.extend({
  type: z.literal('notification'),
  payload: notificationSchema,
});

export const errorSchema = messageSchema.extend({
  type: z.literal('error'),
  payload: z.object({ message: z.string(), code: z.number().optional() }),
});

export const logSchema = messageSchema.extend({
  type: z.literal('log'),
  level: z.enum(['log', 'info', 'warn', 'error']),
  data: z.array(z.unknown()),
  timestamp: z.number(),
});

// SeNARS-specific schemas
export const taskSchema = z.object({
  id: z.string(),
  term: z.string(),
  type: z.enum(['input', 'belief', 'question', 'goal']),
  truth: z.object({
    frequency: z.number(),
    confidence: z.number(),
  }).optional(),
  budget: z.object({
    priority: z.number(),
    durability: z.number(),
    quality: z.number(),
  }).optional(),
  occurrenceTime: z.number().optional(),
  creationTime: z.number(),
});

export const conceptSchema = z.object({
  term: z.string(),
  priority: z.number(),
  occurrenceTime: z.number().optional(),
  taskCount: z.number(),
  beliefCount: z.number(),
  questionCount: z.number(),
  lastAccess: z.number(),
});

export const cycleUpdateSchema = z.object({
  cycle: z.number(),
  timestamp: z.number(),
  tasksProcessed: z.number(),
  beliefsAdded: z.number(),
  questionsAnswered: z.number(),
});

export const conceptUpdateSchema = messageSchema.extend({
  type: z.literal('conceptUpdate'),
  payload: z.object({ 
    concept: conceptSchema,
    changeType: z.enum(['added', 'updated', 'removed'])
  }),
});

export const taskUpdateSchema = messageSchema.extend({
  type: z.literal('taskUpdate'),
  payload: z.object({ 
    task: taskSchema,
    changeType: z.enum(['input', 'processed', 'added', 'answered'])
  }),
});

export const cycleUpdateSchemaMsg = messageSchema.extend({
  type: z.literal('cycleUpdate'),
  payload: z.object({ cycle: cycleUpdateSchema }),
});

export const systemMetricsSchema = messageSchema.extend({
  type: z.literal('systemMetrics'),
  payload: z.object({
    cycleCount: z.number(),
    taskCount: z.number(),
    conceptCount: z.number(),
    runtime: z.number(),
    connectedClients: z.number(),
    startTime: z.number(),
  }),
});

export const narseseInputSchema = messageSchema.extend({
  type: z.literal('narseseInput'),
  payload: z.object({
    input: z.string(),
    success: z.boolean(),
    message: z.string().optional(),
  }),
});

// Schema registry for validation
const schemaRegistry = {
  'layoutUpdate': layoutUpdateSchema,
  'panelUpdate': panelUpdateSchema,
  'reasoningStep': reasoningStepSchemaMsg,
  'sessionUpdate': sessionUpdateSchemaMsg,
  'notification': notificationSchemaMsg,
  'error': errorSchema,
  'log': logSchema,
  'conceptUpdate': conceptUpdateSchema,
  'taskUpdate': taskUpdateSchema,
  'cycleUpdate': cycleUpdateSchemaMsg,
  'systemMetrics': systemMetricsSchema,
  'narseseInput': narseseInputSchema,
};

// Validate incoming messages
export const validateMessage = (data) => {
  try {
    const schema = schemaRegistry[data.type] || messageSchema;
    return schema.parse(data);
  } catch (error) {
    console.error('Message validation error:', error.errors);
    return null;
  }
};