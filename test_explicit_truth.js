import {Repl} from './src/tui/Repl.js';

// Test if syllogistic reasoning works with explicit truth values
async function testSyllogisticExplicitTruth() {
    console.log('🧪 Testing syllogistic reasoning with explicit truth values...');
    
    const repl = new Repl();
    
    try {
        await repl.nar.initialize();
        console.log('✅ NAR initialized');
    } catch (error) {
        console.error('❌ Failed to initialize NAR:', error);
        return;
    }

    console.log('\nInputting: (a-->b). %1.0;0.9%');
    try {
        const result1 = await repl.nar.input('(a-->b). %1.0;0.9%');
        if (result1) {
            await repl.nar.step();
            console.log('✅ First statement input and processed');
        } else {
            console.log('❌ Failed to input first statement');
        }
    } catch (error) {
        console.log('❌ Error with first statement:', error.message);
    }
    
    console.log('Inputting: (b-->c). %1.0;0.9%');
    try {
        const result2 = await repl.nar.input('(b-->c). %1.0;0.9%');
        if (result2) {
            await repl.nar.step();
            console.log('✅ Second statement input and processed');
        } else {
            console.log('❌ Failed to input second statement');
        }
    } catch (error) {
        console.log('❌ Error with second statement:', error.message);
    }
    
    console.log('\nBeliefs after inputs:');
    const beliefs1 = repl.nar.getBeliefs();
    console.log(`Found ${beliefs1.length} beliefs:`);
    beliefs1.forEach((task, i) => {
        const term = task.term?.toString?.() || task.term || 'Unknown';
        const truth = task.truth ? `${task.truth.frequency},${task.truth.confidence}` : 'NULL TRUTH';
        console.log(`  ${i+1}. ${term} with truth [${truth}]`);
    });
    
    console.log('\nRunning 20 reasoning cycles...');
    for (let i = 0; i < 20; i++) {
        await repl.nar.step();
    }
    
    console.log('\nBeliefs after reasoning cycles:');
    const beliefs2 = repl.nar.getBeliefs();
    console.log(`Found ${beliefs2.length} beliefs:`);
    beliefs2.forEach((task, i) => {
        const term = task.term?.toString?.() || task.term || 'Unknown';
        const truth = task.truth ? `${task.truth.frequency},${task.truth.confidence}` : 'NULL TRUTH';
        console.log(`  ${i+1}. ${term} with truth [${truth}]`);
    });
    
    // Check if (a-->c) was derived
    const hasAC = beliefs2.some(belief => {
        const termStr = (belief.term?.toString?.() || belief.term || '').toString();
        return termStr.includes('a-->c');
    });
    
    if (hasAC) {
        console.log('\n✅ SUCCESS: (a-->c) was derived!');
    } else {
        console.log('\n❌ FAILURE: (a-->c) was not derived.');
    }
    
    return hasAC;
}

testSyllogisticExplicitTruth().then(success => {
    console.log(`\nTest ${success ? 'PASSED' : 'FAILED'}`);
}).catch(err => {
    console.error('Test error:', err);
});