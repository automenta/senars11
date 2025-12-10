/**
 * Browser-safe entry point for Agent package
 * Exports only modules that don't rely on Node.js specific APIs
 */

export * from './app/message-handlers/MessageHandler.js';
export * from './app/model/ActivityViewModel.js';
export * from './app/model/ActionRegistry.js';
// Add other safe modules as needed
