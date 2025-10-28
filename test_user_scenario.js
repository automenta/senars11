import {Repl} from './src/tui/Repl.js';

// Test the exact scenario from the user
async function testUserScenario() {
    console.log('🧪 Testing exact user scenario: (a-->b). then (b-->c). then cycles');

    const repl = new Repl();
    await repl.nar.initialize();

    console.log('\\n1. Inputting: (a-->b).');
    await repl._processNarsese('(a-->b).');
    
    console.log('Beliefs after (a-->b).:');
    const beliefs1 = repl.nar.getBeliefs();
    console.log(`  Count: ${beliefs1.length}`);
    beliefs1.forEach((task, i) => {
        const term = task.term?.toString?.() || task.term || 'Unknown';
        const truth = task.truth ? `${task.truth.frequency},${task.truth.confidence}` : 'NULL';
        const type = task.type;
        console.log(`    ${i+1}. ${term} [${type}] ${truth}`);
    });

    console.log('\\n2. Inputting: (b-->c).');
    await repl._processNarsese('(b-->c).');
    
    console.log('Beliefs after (b-->c).:');
    const beliefs2 = repl.nar.getBeliefs();
    console.log(`  Count: ${beliefs2.length}`);
    beliefs2.forEach((task, i) => {
        const term = task.term?.toString?.() || task.term || 'Unknown';
        const truth = task.truth ? `${task.truth.frequency},${task.truth.confidence}` : 'NULL';
        const type = task.type;
        console.log(`    ${i+1}. ${term} [${type}] ${truth}`);
    });

    console.log('\\n3. Running single cycles (like pressing Enter):');
    for (let i = 0; i < 5; i++) {
        console.log(`  Cycle ${i+1}:`);
        await repl._next();
        
        const beliefs = repl.nar.getBeliefs();
        console.log(`    Total beliefs: ${beliefs.length}`);
        beliefs.forEach((task, j) => {
            const term = task.term?.toString?.() || task.term || 'Unknown';
            const truth = task.truth ? `${task.truth.frequency},${task.truth.confidence}` : 'NULL';
            const type = task.type;
            console.log(`      ${j+1}. ${term} [${type}] ${truth}`);
        });
        
        // Check if (a-->c) was derived
        const hasAC = beliefs.some(belief => {
            const termStr = (belief.term?.toString?.() || belief.term || '').toString();
            return termStr.includes('a-->c');
        });
        
        if (hasAC) {
            console.log(`    🎉 FOUND DERIVATION: (a-->c) at cycle ${i+1}!`);
            break;
        }
    }
}

testUserScenario();