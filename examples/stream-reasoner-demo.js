#!/usr/bin/env node

/**
 * Example demonstrating the new stream-based reasoner
 */

import {NAR} from '../src/nar/NAR.js';

async function demonstrateStreamReasoner() {
    console.log('🚀 Demonstrating Stream-Based Reasoner');

    // Configuration with stream reasoner enabled
    const config = {
        lm: {enabled: false},
        reasoningAboutReasoning: {enabled: true},
        reasoning: {
            useStreamReasoner: true,  // Enable the new stream-based reasoner
            maxDerivationDepth: 5,
            cpuThrottleInterval: 1,  // Small throttle to be nice to other processes
            streamSamplingObjectives: {
                priority: true,      // Sample based on task priority
                recency: false,      // Don't prioritize recent tasks
                punctuation: false,  // Don't prioritize goals/questions
                novelty: false       // Don't prioritize novel tasks
            }
        }
    };

    // Create NAR with stream reasoner
    const nar = new NAR(config);
    await nar.initialize();

    console.log('✅ NAR initialized with stream reasoner');
    console.log(`📊 Reasoner type: ${nar.getStats().reasonerType}`);

    // Add a simple belief to the system
    console.log('\n📝 Adding a simple belief: <bird --> flyer>');
    await nar.input('<bird --> flyer>. %0.9;0.9%');

    // Add another related belief
    console.log('📝 Adding another belief: <tweety --> bird>');
    await nar.input('<tweety --> bird>. %0.9;0.9%');

    // Start the reasoning process
    console.log('\n🧠 Starting stream-based reasoning...');
    nar.start();

    // Let it run for a few seconds to see derivations
    setTimeout(() => {
        console.log('\n📈 Current Stats:');
        const stats = nar.getStats();
        console.log(`  Reasoner Type: ${stats.reasonerType}`);
        console.log(`  Cycle Count / Derivations: ${stats.cycleCount}`);
        console.log(`  Memory Concepts: ${stats.memoryStats.conceptCount}`);

        if (stats.streamReasonerStats) {
            console.log('  Stream Reasoner Stats:');
            console.log(`    Total Derivations: ${stats.streamReasonerStats.totalDerivations}`);
            console.log(`    Processing Time: ${stats.streamReasonerStats.totalProcessingTime}ms`);
            console.log(`    Throughput: ${stats.streamReasonerStats.throughput?.toFixed(2)}/sec`);
        }

        // Stop the NAR
        nar.stop();
        console.log('\n🛑 Stream reasoner stopped');

        // Show available concepts
        const concepts = nar.getConcepts();
        console.log(`\n📚 Concepts in memory: ${concepts.length}`);
        for (const concept of concepts.slice(0, 5)) { // Show first 5
            console.log(`  - ${concept.term.toString()}`);
        }
    }, 3000); // Run for 3 seconds
}

// Also demonstrate the traditional cycle-based reasoner for comparison
async function demonstrateCycleReasoner() {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 Demonstrating Traditional Cycle-Based Reasoner');

    // Configuration with traditional reasoner
    const config = {
        lm: {enabled: false},
        reasoningAboutReasoning: {enabled: true},
        reasoning: {
            useStreamReasoner: false  // Use traditional cycle-based reasoner
        },
        cycle: {
            delay: 100  // 100ms delay between cycles
        }
    };

    const nar = new NAR(config);
    await nar.initialize();

    console.log('✅ NAR initialized with cycle reasoner');
    console.log(`📊 Reasoner type: ${nar.getStats().reasonerType}`);

    // Add beliefs
    await nar.input('<cat --> animal>. %0.9;0.9%');
    await nar.input('<whiskers --> cat>. %0.9;0.9%');

    // Start reasoning
    console.log('\n⚙️  Starting cycle-based reasoning...');
    nar.start();

    setTimeout(() => {
        console.log('\n📈 Current Stats:');
        const stats = nar.getStats();
        console.log(`  Reasoner Type: ${stats.reasonerType}`);
        console.log(`  Cycle Count: ${stats.cycleCount}`);
        console.log(`  Memory Concepts: ${stats.memoryStats.conceptCount}`);

        nar.stop();
        console.log('\n🛑 Cycle reasoner stopped');

        // Perform some steps manually - would need to use a different approach
        console.log('\n🔄 Manual reasoning steps would go here (outside setTimeout)');
        console.log('   (This would require restructuring the demo to avoid async/await in setTimeout)');
    }, 2000); // Run for 2 seconds
}

// Run demonstrations
async function main() {
    try {
        await demonstrateStreamReasoner();

        // Wait a bit before the next demo
        await new Promise(resolve => setTimeout(resolve, 2000));

        await demonstrateCycleReasoner();

        console.log('\n🎯 Demonstrations completed!');
    } catch (error) {
        console.error('❌ Error during demonstration:', error);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export {demonstrateStreamReasoner, demonstrateCycleReasoner, main};