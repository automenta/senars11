/**
 * Browser-safe entry point for Core package
 * Exports only modules that don't rely on Node.js specific APIs (fs, path, etc.)
 */

export * from './util/UIConstants.js';
export * from './util/MessageTypes.js';
export * from './config/constants.js';
export * from './util/FormattingUtils.js';
export * from './util/DesignTokens.js';
// Add other safe modules as needed
