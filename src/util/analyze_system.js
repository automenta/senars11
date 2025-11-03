import { NAR } from './src/nar/NAR.js';
import { SystemConfig } from './src/nar/SystemConfig.js';

const config = SystemConfig.from({
  memory: { capacity: 100 },
  cycle: { delay: 10 },
  metacognition: { 
    selfOptimization: { enabled: true }
  }
});

const nar = new NAR(config);
await nar.initialize();

// Add a mix of beliefs, goals, and questions
await nar.input('(SeNARS --> system). %0.9;0.8%'); // Belief
await nar.input('(development --> progress). %0.7;0.9%'); // Belief
await nar.input('(implementation --> complete)! %0.8;0.7%'); // Goal
await nar.input('(planning --> needed)?'); // Question

// Run more cycles to allow for reasoning
for (let i = 0; i < 20; i++) {
  await nar.step();
}

// Get comprehensive system analysis
const state = nar.getReasoningState();
console.log('=== ENHANCED SYSTEM ANALYSIS ===');
console.log('Cycles completed:', state.cycleCount);
console.log('Beliefs:', state.taskCount?.beliefs);
console.log('Goals:', state.taskCount?.goals);
console.log('Questions:', state.taskCount?.questions);
console.log('Total tasks:', state.taskCount?.totalTasks);
console.log('Memory concepts:', state.memoryStats?.conceptCount || 0);

// Get meta-cognitive analysis
const analysis = await nar.performMetaCognitiveReasoning();
console.log('\n=== META-COGNITIVE INSIGHTS ===');
console.log('Number of suggestions:', analysis?.suggestions?.length || 0);
analysis?.suggestions?.forEach((s, i) => {
  console.log(`Suggestion ${i+1}: ${s.type} - ${s.message}`);
});

// Perform self-correction analysis
const correction = await nar.performSelfCorrection();
console.log('\n=== SELF-CORRECTION OUTPUT ===');
console.log('Corrections:', correction?.corrections?.length || 0);
correction?.corrections?.forEach((c, i) => {
  console.log(`Correction ${i+1}: ${c.action} - ${c.message || c.reason}`);
});

// Get the system to think about its own development
await nar.input('(system_analysis --> useful). %0.9;0.9%'); // Belief
await nar.input('(understanding_system --> important)! %0.9;0.8%'); // Goal
await nar.input('(how_to_improve)?'); // Question

// Run more cycles
for (let i = 0; i < 10; i++) {
  await nar.step();
}

// Final analysis
const finalState = nar.getReasoningState();
console.log('\n=== FINAL SYSTEM STATE ===');
console.log('Total concepts after analysis:', finalState.memoryStats?.conceptCount || 0);
console.log('Total tasks after analysis:', finalState.taskCount?.totalTasks);

// Get reasoning trace to see what happened
const trace = nar.getReasoningTrace();
console.log('Reasoning trace events:', trace.length);
if (trace.length > 0) {
  console.log('Last few events:');
  trace.slice(-3).forEach((event, i) => {
    console.log(`  ${i+1}. ${event.eventType} at cycle ${event.cycleCount}`);
  });
}

await nar.dispose();