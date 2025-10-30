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

// Schema registry for validation
const schemaRegistry = {
  'layoutUpdate': layoutUpdateSchema,
  'panelUpdate': panelUpdateSchema,
  'reasoningStep': reasoningStepSchemaMsg,
  'sessionUpdate': sessionUpdateSchemaMsg,
  'notification': notificationSchemaMsg,
  'error': errorSchema,
  'log': logSchema,
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