/**
 * Standardized Activity Types for the Unified UI Model
 */
export const ActivityTypes = Object.freeze({
    // Reasoning Activities (NAL, Inference)
    REASONING: {
        DERIVATION: 'activity.reasoning.derivation', // Single inference step
        GOAL: 'activity.reasoning.goal',             // Goal processing
        QUESTION: 'activity.reasoning.question',     // Question answering
        CYCLE: 'activity.reasoning.cycle',           // Cycle update (often high frequency)
        FOCUS: 'activity.reasoning.focus'            // Task focus attention
    },

    // Agent/Cognitive Activities
    AGENT: {
        DECISION: 'activity.agent.decision',
        ACTION: 'activity.agent.action',
        HYBRID: 'activity.agent.hybrid'
    },

    // LLM Activities (Neural)
    LLM: {
        PROMPT: 'activity.llm.prompt',      // Input sent to LLM
        RESPONSE: 'activity.llm.response',  // Output received from LLM
        TOOL_CALL: 'activity.llm.tool_call',// LLM calling a tool
        ERROR: 'activity.llm.error'         // LLM specific error
    },

    // I/O Activities (Interaction)
    IO: {
        USER_INPUT: 'activity.io.user_input',    // Input from user (Text/Voice)
        SYSTEM_OUTPUT: 'activity.io.system_output' // Output to user
    },

    // System Activities
    SYSTEM: {
        ERROR: 'activity.system.error',
        STATUS: 'activity.system.status',
        LOG: 'activity.system.log'
    }
});

/**
 * Standardized Action Types for Interactivity
 */
export const ActionTypes = Object.freeze({
    // Generic Actions
    INSPECT: 'action.inspect',       // Inspect details of an item
    DELETE: 'action.delete',         // Delete an item

    // RLFP Actions
    RATE: 'action.rate',             // Rate an item (Thumbs up/down, 1-5)
    COMPARE: 'action.compare',       // Compare two items

    // Reasoning Actions
    TRACE: 'action.trace',           // Show derivation trace
    EXPLAIN: 'action.explain'        // Ask for explanation
});
