/**
 * @file constants.js
 * @description Centralized constants to parameterize hardcoded values
 */

// Priority constants
export const PRIORITY = Object.freeze({
    DEFAULT: 0.5,
    MINIMUM: 0.0,
    MAXIMUM: 1.0,
    BELIEF_DEFAULT: 0.8,
    GOAL_DEFAULT: 0.9,
    QUESTION_DEFAULT: 0.7,
    MAX_PRIORITY: 1.0
});

// Timing constants
export const TIMING = Object.freeze({
    DEFAULT_CYCLE_DELAY: 50, // milliseconds
    MAX_EXECUTION_TIME: 100, // milliseconds
    DEFAULT_TIMEOUT: 10000, // milliseconds
    CONNECTION_TIMEOUT: 10000, // milliseconds
    RECONNECTION_INTERVAL: 5000, // milliseconds
    MAX_RECONNECTION_ATTEMPTS: 10,
    HEARTBEAT_INTERVAL: 30000, // milliseconds
    HEARTBEAT_TIMEOUT: 15000 // milliseconds
});


// WebSocket constants
export const WEBSOCKET = Object.freeze({
    DEFAULT_PORT: 8080,
    DEFAULT_HOST: 'localhost',
    DEFAULT_PATH: '/ws',
    MAX_CONNECTIONS: 10,
    MAX_CONNECTIONS_LIMIT: 20
});

// UI constants
export const UI = Object.freeze({
    DEFAULT_LAYOUT_LIMIT: 50,
    MAX_NOTIFICATIONS: 100,
    NOTIFICATION_TIMEOUT: 5000, // milliseconds
    DEFAULT_THEME: 'light',
    MAX_TASK_HISTORY: 1000,
    MAX_REASONING_HISTORY: 100
});

// Logging constants
export const LOGGING = Object.freeze({
    DEFAULT_LEVEL: 'info',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    RETENTION_DAYS: 7,
    MAX_MESSAGE_LENGTH: 1000
});

// Error handling constants
export const ERROR_HANDLING = Object.freeze({
    MAX_ERROR_RATE: 0.1,
    RECOVERY_ATTEMPTS: 3,
    DEFAULT_RETRY_ATTEMPTS: 2
});

// Language Model constants
export const LM = Object.freeze({
    DEFAULT_PROVIDER: 'dummy',
    MAX_CONCURRENT_REQUESTS: 5,
    DEFAULT_CACHE_SIZE: 100,
    DEFAULT_TEMPERATURE: 0.7,
    DEFAULT_MAX_TOKENS: 1000
});

// Task-related constants
export const TASK = Object.freeze({
    DEFAULT_MAX_PER_CYCLE: 10,
    DEFAULT_RULE_APPLICATION_LIMIT: 50,
    MAX_RULE_APPLICATIONS_PER_CYCLE: 20
});

// Component-related constants
export const COMPONENT = Object.freeze({
    DEFAULT_DEPENDENCY_CHECK_INTERVAL: 1000 // milliseconds
});

// Memory constants
export const MEMORY = Object.freeze({
    DEFAULT_CAPACITY: 1000,
    CONSOLIDATION_THRESHOLD: 0.1,
    FORGETTING_THRESHOLD: 0.05,
    CONCEPT_ACTIVATION_DECAY: 0.95,
    FOCUS_SIZE: 100,
    FOCUS_SET_SIZE: 100,
    CONSOLIDATION_INTERVAL: 1000,
    ACTIVATION_DECAY: 0.95
});

// Cycle constants
export const CYCLE = Object.freeze({
    DEFAULT_DELAY: 50,
    DEFAULT_MAX_PER_CYCLE: 10,
    MAX_RULE_APPLICATIONS_PER_CYCLE: 20
});

// Performance constants
export const PERFORMANCE = Object.freeze({
    TIMEOUT_MS: 100,
    CACHE_SIZE: 100,
    BATCH_SIZE: 10
});

// System constants
export const SYSTEM = Object.freeze({
    DEFAULT_PORT: 8080,
    DEFAULT_HOST: 'localhost',
    MAX_ERROR_RATE: 0.1,
    RECOVERY_ATTEMPTS: 3,
    GRACEFUL_DEGRADATION_THRESHOLD: 0.7
});

// Truth value constants
export const TRUTH = Object.freeze({
    DEFAULT_FREQUENCY: 1.0,
    DEFAULT_CONFIDENCE: 0.9,
    MIN_FREQUENCY: 0.0,
    MAX_FREQUENCY: 1.0,
    MIN_CONFIDENCE: 0.0,
    MAX_CONFIDENCE: 1.0,
    MIN_PRIORITY: 0.0,
    MAX_PRIORITY: 1.0,
    WEAKENING_FACTOR: 0.1,
    EPSILON: 0.01,
    PRECISION: 2
});

// Validation and safety limits
export const VALIDATION = Object.freeze({
    MAX_STRING_LENGTH: 10000,
    MAX_ARRAY_LENGTH: 1000
});