/**
 * Main entry point for SeNARS REPL
 */

// Import modules to initialize the REPL
import SessionManager from './session-manager.js';
import './repl-core.js'; // Import repl-core for side effects

console.log('SeNARS REPL initialized');

// Expose session manager to global scope for debugging
if (typeof window !== 'undefined') {
  window.NARS_SESSIONS = window.sessionManager?.activeSessions || {};
}