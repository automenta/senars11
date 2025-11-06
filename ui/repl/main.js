/**
 * Main entry point for SeNARS REPL
 */

// This file is intentionally left minimal since most initialization
// happens in the session-manager.js and repl-core.js files

console.log('SeNARS REPL initialized');

// Expose session manager to global scope for debugging
if (typeof window !== 'undefined') {
  window.NARS_SESSIONS = window.sessionManager?.activeSessions || {};
}