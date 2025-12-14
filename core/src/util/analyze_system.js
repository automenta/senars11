import { NAR } from '../nar/NAR.js';
import { SystemConfig } from '../config/SystemConfig.js';
import { Logger } from './Logger.js';

const DEFAULT_CONFIG = {
    memory: { capacity: 100 },
    cycle: { delay: 10 },
    metacognition: { selfOptimization: { enabled: true } }
};

const INPUT_STATEMENTS = [
    { statement: '(SeNARS --> system). %0.9;0.8%', type: 'belief' },
    { statement: '(development --> progress). %0.7;0.9%', type: 'belief' },
    { statement: '(implementation --> complete)! %0.8;0.7%', type: 'goal' },
    { statement: '(planning --> needed)?', type: 'question' }
];

const REFLECTIVE_STATEMENTS = [
    { statement: '(system_analysis --> useful). %0.9;0.9%', type: 'belief' },
    { statement: '(understanding_system --> important)! %0.9;0.8%', type: 'goal' },
    { statement: '(how_to_improve)?', type: 'question' }
];

export async function runSystemAnalysis(config = DEFAULT_CONFIG) {
    const systemConfig = SystemConfig.from(config);
    const nar = new NAR(systemConfig);

    try {
        await nar.initialize();

        // Input initial statements
        for (const { statement } of INPUT_STATEMENTS) await nar.input(statement);

        // Run initial cycles using Array.from for cleaner iteration
        await Promise.all(Array.from({ length: 20 }, () => nar.step()));

        // Capture state and perform meta-analysis
        const initialState = nar.getReasoningState();
        const metaAnalysis = await nar.performMetaCognitiveReasoning();
        const correction = await nar.performSelfCorrection();

        // Input reflective statements
        for (const { statement } of REFLECTIVE_STATEMENTS) await nar.input(statement);

        // Run additional cycles
        await Promise.all(Array.from({ length: 10 }, () => nar.step()));

        // Return final state
        return {
            initialState,
            metaAnalysis,
            correction,
            finalState: nar.getReasoningState(),
            trace: nar.getReasoningTrace().slice(-3)
        };
    } finally {
        await nar.dispose();
    }
}

export function displayResults(results) {
    const { initialState, metaAnalysis, correction, finalState, trace } = results;

    // Initial state information
    Logger.info('=== ENHANCED SYSTEM ANALYSIS ===');
    Logger.info(`Cycles completed: ${initialState.cycleCount}`);
    Logger.info(`Beliefs: ${initialState.taskCount?.beliefs}`);
    Logger.info(`Goals: ${initialState.taskCount?.goals}`);
    Logger.info(`Questions: ${initialState.taskCount?.questions}`);
    Logger.info(`Total tasks: ${initialState.taskCount?.totalTasks}`);
    Logger.info(`Memory concepts: ${initialState.memoryStats?.conceptCount || 0}`);

    // Meta-cognitive insights
    Logger.info('\n=== META-COGNITIVE INSIGHTS ===');
    Logger.info(`Number of suggestions: ${metaAnalysis?.suggestions?.length || 0}`);
    metaAnalysis?.suggestions?.forEach((s, i) => {
        Logger.info(`Suggestion ${i + 1}: ${s.type} - ${s.message}`);
    });

    // Self-correction output
    Logger.info('\n=== SELF-CORRECTION OUTPUT ===');
    Logger.info(`Corrections: ${correction?.corrections?.length || 0}`);
    correction?.corrections?.forEach((c, i) => {
        Logger.info(`Correction ${i + 1}: ${c.action} - ${c.message || c.reason}`);
    });

    // Final system state
    Logger.info('\n=== FINAL SYSTEM STATE ===');
    Logger.info(`Total concepts after analysis: ${finalState.memoryStats?.conceptCount || 0}`);
    Logger.info(`Total tasks after analysis: ${finalState.taskCount?.totalTasks}`);

    // Reasoning trace
    Logger.info(`Reasoning trace events: ${trace.length}`);
    if (trace.length > 0) {
        Logger.info('Last few events:');
        trace.forEach((event, i) => {
            Logger.info(`  ${i + 1}. ${event.eventType} at cycle ${event.cycleCount}`);
        });
    }
}