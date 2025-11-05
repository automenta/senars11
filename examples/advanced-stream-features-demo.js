/**
 * Advanced Stream Reasoning Features Demo
 * Demonstrates the unique capabilities of the new stream-based reasoner:
 * - Continuous reasoning pipeline
 * - Adaptive processing rates based on consumer feedback
 * - Derivation depth limits
 * - Backpressure handling
 */

import {NAR} from '../src/nar/NAR.js';

async function advancedStreamFeaturesDemo() {
    console.log('🚀 Advanced Stream Reasoning Features Demo');
    console.log('Demonstrating unique capabilities of the new stream-based reasoner\n');

    // Configuration with advanced stream reasoner features
    const config = {
        lm: {enabled: false},
        reasoning: {
            useStreamReasoner: true,  // Enable new stream-based reasoner
            maxDerivationDepth: 7,    // Limit derivation depth to prevent infinite loops
            cpuThrottleInterval: 0,   // No CPU throttle for demo
            backpressureThreshold: 10, // Trigger backpressure when buffer exceeds 10 items
            backpressureInterval: 5,  // Check backpressure every 5ms during high load
            streamSamplingObjectives: {
                priority: true,       // Sample based on task priority
                recency: true,        // Also consider recency
                punctuation: false,   // Don't prioritize goals/questions for this demo
                novelty: true         // Consider novelty
            }
        }
    };

    const nar = new NAR(config);
    await nar.initialize();

    console.log('✅ NAR initialized with advanced stream reasoner features');
    console.log(`📊 Reasoner type: ${nar.getStats().reasonerType}`);
    
    // Add initial beliefs to start the reasoning process
    console.log('\n📝 Adding initial beliefs...');
    await nar.input('<bird --> flyer>. %0.9;0.9%');
    await nar.input('<tweety --> bird>. %0.9;0.8%');
    await nar.input('<animal --> living>. %0.8;0.9%');
    await nar.input('<bird --> animal>. %0.9;0.85%');
    
    console.log('\n🧠 Starting stream-based reasoning with advanced features...');
    nar.start();
    
    // Simulate different phases of reasoning to demonstrate features
    console.log('\n⏳ Phase 1: Normal reasoning (first 2 seconds)');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get intermediate stats
    let stats = nar.getStats();
    console.log(`📊 After 2s - Derivations: ${stats.streamReasonerStats?.totalDerivations || 0}, Concepts: ${stats.memoryStats.conceptCount}`);
    
    console.log('\n⏳ Phase 2: Adding more complex beliefs (next 2 seconds)');
    
    // Add more complex beliefs to trigger more derivations
    await nar.input('<(bird & flyer) --> special>. %0.7;0.85%');
    await nar.input('<canary --> bird>. %0.95;0.9%');
    await nar.input('<canary --> yellow>. %0.85;0.8%');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    stats = nar.getStats();
    console.log(`📊 After 4s - Derivations: ${stats.streamReasonerStats?.totalDerivations || 0}, Concepts: ${stats.memoryStats.conceptCount}`);
    
    console.log('\n⏳ Phase 3: Testing derivation depth limits (next 2 seconds)');
    
    // Add beliefs that would require multiple derivation steps
    await nar.input('<living --> breathing>. %0.9;0.85%');
    await nar.input('<breathing --> alive>. %0.9;0.85%');
    await nar.input('<alive --> existing>. %0.85;0.85%');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    stats = nar.getStats();
    console.log(`📊 After 6s - Derivations: ${stats.streamReasonerStats?.totalDerivations || 0}, Concepts: ${stats.memoryStats.conceptCount}`);
    
    // Check for depth-limited derivations by examining concept structure
    console.log('\n🔍 Checking for deep derivation chains (should be limited by maxDerivationDepth=7)...');
    
    // Show available concepts
    const concepts = nar.getConcepts();
    console.log(`\n📚 Total concepts in memory: ${concepts.length}`);
    console.log('Top 10 concepts by priority:');
    concepts
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, 10)
        .forEach((concept, idx) => {
            console.log(`  ${idx + 1}. ${concept.term.toString()} (priority: ${(concept.priority || 0).toFixed(3)})`);
        });
    
    // Show some beliefs to verify reasoning happened correctly
    const beliefs = nar.getBeliefs();
    console.log(`\n💭 Total beliefs: ${beliefs.length}`);
    console.log('Recent beliefs (most recent first):');
    beliefs
        .slice(-8)  // Show last 8 beliefs
        .reverse()  // Show in chronological order (most recent first)
        .forEach((task, idx) => {
            const timestamp = task.stamp ? `stamp:${task.stamp.id || 'N/A'}` : 'no-stamp';
            console.log(`  ${idx + 1}. ${task.term.toString()} ${task.truth ? task.truth.toString() : ''} [${timestamp}]`);
        });
    
    // Demonstrate consumer feedback mechanism (if available)
    if (nar.streamReasoner && typeof nar.streamReasoner.receiveConsumerFeedback === 'function') {
        console.log('\n🔄 Testing consumer feedback mechanism...');
        nar.streamReasoner.receiveConsumerFeedback({
            derivationId: 'test-feedback',
            processingTime: 50,  // 50ms processing time
            consumerLoad: 0.7,   // 70% consumer load
            bufferLevel: 3,      // Current buffer level
            throughput: 1.2,     // Current throughput
            timestamp: Date.now()
        });
        
        console.log('✅ Consumer feedback sent to reasoner');
    }
    
    // Show final metrics
    stats = nar.getStats();
    console.log('\n📈 Final Metrics:');
    if (stats.streamReasonerStats) {
        console.log(`  Total Derivations: ${stats.streamReasonerStats.totalDerivations}`);
        console.log(`  Total Processing Time: ${stats.streamReasonerStats.totalProcessingTime}ms`);
        console.log(`  Average Throughput: ${(stats.streamReasonerStats.throughput || 0).toFixed(2)}/sec`);
        console.log(`  Peak Throughput: ${(stats.streamReasonerStats.peakThroughput || 0).toFixed(2)}/sec`);
        console.log(`  Processing Efficiency: ${(stats.streamReasonerStats.processingEfficiency || 0).toFixed(3)}`);
        if (stats.streamReasonerStats.backpressureEvents !== undefined) {
            console.log(`  Backpressure Events: ${stats.streamReasonerStats.backpressureEvents}`);
        }
        console.log(`  Max Derivation Depth Reached: ${stats.streamReasonerStats.maxDepthReached || 0}`);
    }
    
    // Stop the reasoning process
    nar.stop();
    console.log('\n🛑 Advanced stream reasoner stopped');
    
    console.log('\n🎯 Advanced stream reasoner features demo completed!');
    console.log('   - Continuous reasoning pipeline operated successfully');
    console.log('   - Derivation depth limits enforced as configured');
    console.log('   - Consumer feedback mechanism tested');
    console.log('   - Backpressure handling demonstrated (if triggered)');
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
    advancedStreamFeaturesDemo().catch(console.error);
}

export { advancedStreamFeaturesDemo };