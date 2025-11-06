#!/usr/bin/env node

/**
 * Simple example demonstrating the new stream-based reasoner
 */

import {NAR} from '../src/nar/NAR.js';

async function simpleDemo() {
    console.log('🚀 Simple Stream Reasoner Demo');

    // Create NAR with stream reasoner enabled
    const nar = new NAR({
        lm: {enabled: false},
        reasoningAboutReasoning: {enabled: true},
        reasoning: {
            useStreamReasoner: true,  // Enable the new stream-based reasoner
            maxDerivationDepth: 3,
            streamSamplingObjectives: {priority: true}
        }
    });

    await nar.initialize();
    console.log('✅ NAR initialized with stream reasoner');

    // Add some simple beliefs
    console.log('\n📝 Adding beliefs to the system...');
    await nar.input('<animal --> living>. %0.9;0.8%');
    await nar.input('<dog --> animal>. %0.95;0.85%');
    console.log('   - <animal --> living>');
    console.log('   - <dog --> animal>');

    // Check initial state
    console.log('\n📊 Initial stats:');
    const initialStats = nar.getStats();
    console.log(`   Reasoner type: ${initialStats.reasonerType}`);
    console.log(`   Memory concepts: ${initialStats.memoryStats.conceptCount}`);

    // Start the stream reasoner
    console.log('\n🧠 Starting stream reasoner...');
    nar.start();

    // Wait a bit and then check results
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\n📈 Stats after reasoning:');
    const finalStats = nar.getStats();
    console.log(`   Derivations processed: ${finalStats.cycleCount}`);
    console.log(`   Memory concepts: ${finalStats.memoryStats.conceptCount}`);
    console.log(`   Stream reasoner active: ${!!finalStats.streamReasonerStats}`);

    if (finalStats.streamReasonerStats) {
        console.log(`   Stream throughput: ${(finalStats.streamReasonerStats.throughput || 0).toFixed(2)}/sec`);
        console.log(`   Total processing time: ${finalStats.streamReasonerStats.totalProcessingTime}ms`);
    }

    // Stop and clean up
    nar.stop();
    await nar.dispose();

    console.log('\n✅ Demo completed!');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    simpleDemo().catch(console.error);
}