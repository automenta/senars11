import {NAR} from './src/nar/NAR.js';

// Create a detailed test to see what's happening with the input
async function debugNarseseInput() {
    console.log('🔍 Debugging Narsese input processing...');
    
    const nar = new NAR();
    await nar.initialize();
    
    console.log('\\nTesting (a-->b). input:');
    try {
        const result = await nar.input('(a-->b).');
        console.log('Input result:', result);
        
        // Check after input but before step
        console.log('\\nBefore reasoning step:');
        const beliefsBefore = nar.getBeliefs();
        console.log(`Beliefs: ${beliefsBefore.length}`);
        beliefsBefore.forEach((task, i) => {
            const term = task.term?.toString?.() || task.term || 'Unknown';
            const truth = task.truth ? `freq:${task.truth.frequency}, conf:${task.truth.confidence}` : 'NO TRUTH';
            const type = task.type || 'Unknown Type';
            const budget = task.budget ? `pri:${task.budget.priority}` : 'NO BUDGET';
            console.log(`  ${i+1}. ${term} [${type}] {${truth}} [${budget}]`);
        });
        
        // Run one step to process the task
        await nar.step();
        
        console.log('\\nAfter reasoning step:');
        const beliefsAfter = nar.getBeliefs();
        console.log(`Beliefs: ${beliefsAfter.length}`);
        beliefsAfter.forEach((task, i) => {
            const term = task.term?.toString?.() || task.term || 'Unknown';
            const truth = task.truth ? `freq:${task.truth.frequency}, conf:${task.truth.confidence}` : 'NO TRUTH';
            const type = task.type || 'Unknown Type';
            const budget = task.budget ? `pri:${task.budget.priority}` : 'NO BUDGET';
            console.log(`  ${i+1}. ${term} [${type}] {${truth}} [${budget}]`);
        });
        
        console.log('\\nMemory stats:');
        const stats = nar.getStats();
        console.log('Memory concepts:', stats.memoryStats?.memoryUsage?.concepts || stats.memoryStats?.totalConcepts || 0);
        console.log('Total tasks:', stats.memoryStats?.memoryUsage?.totalTasks || stats.memoryStats?.totalTasks || 0);
        
    } catch (error) {
        console.error('Error during input:', error);
    }
    
    console.log('\\nTesting (a-->b). %1.0;0.9% (with explicit truth):');
    try {
        const result = await nar.input('(a-->b). %1.0;0.9%');
        console.log('Input result:', result);
        
        await nar.step();
        
        console.log('\\nAfter input with explicit truth:');
        const beliefs = nar.getBeliefs();
        console.log(`Beliefs: ${beliefs.length}`);
        beliefs.forEach((task, i) => {
            const term = task.term?.toString?.() || task.term || 'Unknown';
            const truth = task.truth ? `freq:${task.truth.frequency}, conf:${task.truth.confidence}` : 'NO TRUTH';
            const type = task.type || 'Unknown Type';
            const budget = task.budget ? `pri:${task.budget.priority}` : 'NO BUDGET';
            console.log(`  ${i+1}. ${term} [${type}] {${truth}} [${budget}]`);
        });
    } catch (error) {
        console.error('Error with explicit truth:', error);
    }
}

debugNarseseInput();