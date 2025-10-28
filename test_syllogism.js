import {Repl} from './src/tui/Repl.js';

// Create a simple test to verify syllogistic reasoning
async function testSyllogisticReasoning() {
    console.log('🧪 Testing syllogistic reasoning: (a-->b) + (b-->c) -> (a-->c)');
    
    const repl = new Repl();
    
    // Start the REPL (this will initialize the NAR)
    console.log('Starting REPL...');
    
    // Simulate the initialization by calling the internal initialization
    try {
        await repl.nar.initialize();
        console.log('✅ NAR initialized');
    } catch (error) {
        console.error('❌ Failed to initialize NAR:', error);
        return;
    }

    console.log('\nInputting: (a-->b).');
    await repl.nar.input('(a-->b).');
    await repl.nar.step(); // Process the input
    
    console.log('Inputting: (b-->c).');
    await repl.nar.input('(b-->c).'); 
    await repl.nar.step(); // Process the input
    
    console.log('\nCurrent beliefs after inputs:');
    const beliefs1 = repl.nar.getBeliefs();
    console.log(`Found ${beliefs1.length} beliefs:`);
    beliefs1.forEach((task, i) => {
        const term = task.term?.toString?.() || task.term || 'Unknown';
        const truth = task.truth ? `${task.truth.frequency},${task.truth.confidence}` : 'N/A';
        console.log(`  ${i+1}. ${term} with truth ${truth}`);
    });
    
    console.log('\nRunning 10 reasoning cycles to allow for syllogistic inference...');
    for (let i = 0; i < 10; i++) {
        await repl.nar.step();
    }
    
    console.log('\nBeliefs after reasoning cycles:');
    const beliefs2 = repl.nar.getBeliefs();
    console.log(`Found ${beliefs2.length} beliefs:`);
    beliefs2.forEach((task, i) => {
        const term = task.term?.toString?.() || task.term || 'Unknown';
        const truth = task.truth ? `${task.truth.frequency},${task.truth.confidence}` : 'N/A';
        console.log(`  ${i+1}. ${term} with truth ${truth}`);
    });
    
    // Check if (a-->c) was derived
    const hasAC = beliefs2.some(belief => {
        const termStr = (belief.term?.toString?.() || belief.term || '').toString();
        return termStr.includes('a-->c') || termStr.includes('(a-->c)');
    });
    
    if (hasAC) {
        console.log('\n✅ SUCCESS: (a-->c) was derived!');
    } else {
        console.log('\n❌ FAILURE: (a-->c) was not derived.');
        console.log('This indicates the syllogistic reasoning is not working properly.');
    }
    
    return hasAC;
}

// Run the test
testSyllogisticReasoning().then(success => {
    console.log(`\nTest ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
});