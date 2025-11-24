import {NAR} from '../../src/nar/NAR.js';
import {SystemConfig} from '../../src/config/SystemConfig.js';

const DEFAULT_CONFIG = {
    memory: {capacity: 100},
    cycle: {delay: 10},
    metacognition: {selfOptimization: {enabled: true}}
};

const INPUT_STATEMENTS = [
    {statement: '(SeNARS --> system). %0.9;0.8%', type: 'belief'},
    {statement: '(development --> progress). %0.7;0.9%', type: 'belief'},
    {statement: '(implementation --> complete)! %0.8;0.7%', type: 'goal'},
    {statement: '(planning --> needed)?', type: 'question'}
];

const REFLECTIVE_STATEMENTS = [
    {statement: '(system_analysis --> useful). %0.9;0.9%', type: 'belief'},
    {statement: '(understanding_system --> important)! %0.9;0.8%', type: 'goal'},
    {statement: '(how_to_improve)?', type: 'question'}
];

export async function runSystemAnalysis(config = DEFAULT_CONFIG) {
    const systemConfig = SystemConfig.from(config);
    const nar = new NAR(systemConfig);

    try {
        await nar.initialize();

        // Input initial statements
        for (const {statement} of INPUT_STATEMENTS) await nar.input(statement);

        // Run initial cycles
        for (let i = 0; i < 20; i++) await nar.step();

        // Capture state and perform meta-analysis
        const initialState = nar.getReasoningState();
        const metaAnalysis = await nar.performMetaCognitiveReasoning();
        const correction = await nar.performSelfCorrection();

        // Input reflective statements
        for (const {statement} of REFLECTIVE_STATEMENTS) await nar.input(statement);

        // Run additional cycles
        for (let i = 0; i < 10; i++) await nar.step();

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
    const {initialState, metaAnalysis, correction, finalState, trace} = results;

    // Initial state information
    console.log('=== ENHANCED SYSTEM ANALYSIS ===');
    console.log('Cycles completed:', initialState.cycleCount);
    console.log('Beliefs:', initialState.taskCount?.beliefs);
    console.log('Goals:', initialState.taskCount?.goals);
    console.log('Questions:', initialState.taskCount?.questions);
    console.log('Total tasks:', initialState.taskCount?.totalTasks);
    console.log('Memory concepts:', initialState.memoryStats?.conceptCount || 0);

    // Meta-cognitive insights
    console.log('\n=== META-COGNITIVE INSIGHTS ===');
    console.log('Number of suggestions:', metaAnalysis?.suggestions?.length || 0);
    metaAnalysis?.suggestions?.forEach((s, i) => {
        console.log(`Suggestion ${i + 1}: ${s.type} - ${s.message}`);
    });

    // Self-correction output
    console.log('\n=== SELF-CORRECTION OUTPUT ===');
    console.log('Corrections:', correction?.corrections?.length || 0);
    correction?.corrections?.forEach((c, i) => {
        console.log(`Correction ${i + 1}: ${c.action} - ${c.message || c.reason}`);
    });

    // Final system state
    console.log('\n=== FINAL SYSTEM STATE ===');
    console.log('Total concepts after analysis:', finalState.memoryStats?.conceptCount || 0);
    console.log('Total tasks after analysis:', finalState.taskCount?.totalTasks);

    // Reasoning trace
    console.log('Reasoning trace events:', trace.length);
    trace.length > 0 && console.log('Last few events:') &&
    trace.forEach((event, i) => {
        console.log(`  ${i + 1}. ${event.eventType} at cycle ${event.cycleCount}`);
    });
}