import {z} from 'zod';
import {demoSchemas} from './demoMessages.js';

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

export const reasoningStepMessageSchema = messageSchema.extend({
  type: z.literal('reasoningStep'),
  payload: z.object({ step: reasoningStepSchema }),
});

export const sessionUpdateMessageSchema = messageSchema.extend({
  type: z.literal('sessionUpdate'),
  payload: sessionUpdateSchema,
});

export const notificationMessageSchema = messageSchema.extend({
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

// Helper function to create update schemas
const createUpdateSchema = (type, payloadSchema) =>
  messageSchema.extend({
    type: z.literal(type),
    payload: payloadSchema,
  });

export const conceptUpdateSchema = createUpdateSchema('conceptUpdate',
  z.object({
    concept: conceptSchema,
    changeType: z.enum(['added', 'updated', 'removed'])
  })
);

export const taskUpdateSchema = createUpdateSchema('taskUpdate',
  z.object({
    task: taskSchema,
    changeType: z.enum(['input', 'processed', 'added', 'answered'])
  })
);

export const cycleUpdateMessageSchema = createUpdateSchema('cycleUpdate',
  z.object({ cycle: cycleUpdateSchema })
);

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

// Combine all schemas
const schemaRegistry = {
  'layoutUpdate': layoutUpdateSchema,
  'panelUpdate': panelUpdateSchema,
  'reasoningStep': reasoningStepMessageSchema,
  'sessionUpdate': sessionUpdateMessageSchema,
  'notification': notificationMessageSchema,
  'error': errorSchema,
  'log': logSchema,
  'conceptUpdate': conceptUpdateSchema,
  'taskUpdate': taskUpdateSchema,
  'cycleUpdate': cycleUpdateMessageSchema,
  'systemMetrics': systemMetricsSchema,
  'narseseInput': narseseInputSchema,
  // Add demo schemas
  ...demoSchemas,
};

// Validation result types
export const ValidationError = {
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  MISSING_REQUIRED: 'MISSING_REQUIRED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// Validate incoming messages with detailed error reporting
export const validateMessage = (data) => {
  if (!data || typeof data !== 'object') {
    console.error('Message validation error: Invalid message format - message is not an object');
    return null;
  }

  if (!data.type) {
    console.error('Message validation error: Missing message type');
    return null;
  }

  try {
    const schema = schemaRegistry[data.type] || messageSchema;
    return schema.parse(data);
  } catch (error) {
    // Extract detailed error information
    if (error && typeof error === 'object' && error.issues) {
      const validationErrors = error.issues.map(issue => ({
        path: issue.path?.join('.') || 'unknown',
        message: issue.message || 'Unknown validation error',
        code: issue.code || 'unknown'
      }));

      console.error('Message validation error:', {
        type: data.type,
        errors: validationErrors,
        originalData: JSON.stringify(data, null, 2)
      });
    } else {
      console.error('Message validation error:', {
        type: data.type,
        error: error?.message || error || 'Unknown validation error'
      });
    }

    return null;
  }
};

// Helper function to validate and return detailed error info
export const validateMessageDetailed = (data) => {
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      errorType: ValidationError.INVALID_FORMAT,
      errorMessage: 'Message is not an object',
      data: null
    };
  }

  if (!data.type) {
    return {
      success: false,
      errorType: ValidationError.MISSING_REQUIRED,
      errorMessage: 'Missing message type',
      data: null
    };
  }

  try {
    const schema = schemaRegistry[data.type] || messageSchema;
    const validatedData = schema.parse(data);

    return {
      success: true,
      errorType: null,
      errorMessage: null,
      data: validatedData
    };
  } catch (error) {
    const validationErrors = error?.issues || [];
    const firstError = validationErrors[0] || { message: 'Unknown validation error' };

    return {
      success: false,
      errorType: ValidationError.INVALID_FORMAT,
      errorMessage: firstError.message,
      data: null,
      originalData: data,
      validationDetails: validationErrors
    };
  }
};