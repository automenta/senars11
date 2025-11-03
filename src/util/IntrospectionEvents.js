/**
 * Centralized registry for introspection event names.
 *
 * This provides a single source of truth for all introspection events,
 * ensuring consistency and preventing typos.
 */
export const IntrospectionEvents = Object.freeze({
    // System Lifecycle
    SYSTEM_START: 'system:start',
    SYSTEM_STOP: 'system:stop',

    // Reasoning Cycle
    CYCLE_START: 'cycle:start',
    CYCLE_END: 'cycle:end',
    CYCLE_STEP: 'cycle:step',

    // Memory
    MEMORY_CONCEPT_CREATED: 'memory:concept:created',
    MEMORY_CONCEPT_ACCESSED: 'memory:concept:accessed',
    MEMORY_TASK_ADDED: 'memory:task:added',
    MEMORY_CONSOLIDATION_START: 'memory:consolidation:start',
    MEMORY_CONSOLIDATION_END: 'memory:consolidation:end',

    // TermFactory
    TERM_CREATED: 'term:created',
    TERM_CACHE_HIT: 'term:cache:hit',
    TERM_CACHE_MISS: 'term:cache:miss',

    // Rule Engine
    RULE_FIRED: 'rule:fired',
    RULE_NOT_FIRED: 'rule:not_fired',

    // Metacognition & Reinforcement Learning
    META_PATTERN_DETECTED: 'meta:pattern:detected',
    META_SELF_OPTIMIZATION: 'meta:self_optimization',
    GOAL_SATISFIED: 'goal:satisfied',
});

/**
 * Creates a standardized event payload.
 *
 * @param {string} sourceComponent - The name of the component emitting the event.
 * @param {object} payload - The event-specific data.
 * @returns {object} The standardized event object.
 */
export function createEventPayload(sourceComponent, payload) {
    return {
        timestamp: Date.now(),
        sourceComponent,
        payload,
    };
}
