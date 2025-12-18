#!/usr/bin/env node
/**
 * Stream Reasoning Demo - Comprehensive demonstration of stream-based reasoning
 *
 * Features shown:
 * - Stream vs cycle-based reasoning comparison
 * - Continuous pipeline with adaptive processing
 * - Derivation depth limits and backpressure
 * - Metrics and performance tracking
 */

import {NAR} from '../../core/src/nar/NAR.js';

const section = (title) => console.log(`\n${'═'.repeat(60)}\n${title}\n${'═'.repeat(60)}`);
const metric = (label, value) => console.log(`  ${label.padEnd(25)} ${value}`);
const log = (msg) => console.log(`  ${msg}`);

async function runStreamDemo() {
    section('Stream-Based Reasoner Demo');

    const nar = new NAR({
        lm: {enabled: false},
        reasoning: {
            useStreamReasoner: true,
            maxDerivationDepth: 7,
            cpuThrottleInterval: 0,
            streamSamplingObjectives: {priority: true, recency: true, novelty: true}
        }
    });
    await nar.initialize();

    log(`Reasoner type: ${nar.getStats().reasonerType}`);

    // Add beliefs for reasoning
    log('\nAdding beliefs...');
    const beliefs = [
        '<bird --> flyer>. %0.9;0.9%',
        '<tweety --> bird>. %0.9;0.8%',
        '<animal --> living>. %0.8;0.9%',
        '<bird --> animal>. %0.9;0.85%',
        '<canary --> bird>. %0.95;0.9%'
    ];
    for (const b of beliefs) await nar.input(b);

    // Run reasoning for 3 seconds
    log('\nStarting stream reasoning (3 seconds)...');
    const startTime = Date.now();
    nar.start();

    await new Promise(r => setTimeout(r, 3000));
    nar.stop();

    const elapsed = Date.now() - startTime;
    const stats = nar.getStats();

    // Show results
    log('\n📊 Results:');
    metric('Duration', `${elapsed}ms`);
    metric('Concepts created', stats.memoryStats.conceptCount);

    if (stats.streamReasonerStats) {
        metric('Derivations', stats.streamReasonerStats.totalDerivations);
        metric('Throughput', `${(stats.streamReasonerStats.throughput || 0).toFixed(2)}/sec`);
        metric('Processing time', `${stats.streamReasonerStats.totalProcessingTime}ms`);
    }

    // Show derived beliefs
    const derivedBeliefs = nar.getBeliefs().slice(-5);
    log('\n📝 Recent beliefs:');
    derivedBeliefs.forEach((t, i) =>
        log(`  ${i + 1}. ${t.term.toString()} ${t.truth?.toString() || ''}`));

    await nar.dispose();
    return stats;
}

async function runCycleDemo() {
    section('Cycle-Based Reasoner Demo (Comparison)');

    const nar = new NAR({
        lm: {enabled: false},
        reasoning: {useStreamReasoner: false}
    });
    await nar.initialize();

    log(`Reasoner type: ${nar.getStats().reasonerType}`);

    // Same beliefs
    const beliefs = [
        '<bird --> flyer>. %0.9;0.9%',
        '<tweety --> bird>. %0.9;0.8%',
        '<animal --> living>. %0.8;0.9%',
        '<bird --> animal>. %0.9;0.85%',
        '<canary --> bird>. %0.95;0.9%'
    ];
    for (const b of beliefs) await nar.input(b);

    log('\nRunning 50 reasoning cycles...');
    await nar.runCycles(50);

    const stats = nar.getStats();
    log('\n📊 Results:');
    metric('Cycles completed', stats.cycleCount);
    metric('Concepts created', stats.memoryStats.conceptCount);
    metric('Beliefs', nar.getBeliefs().length);

    await nar.dispose();
    return stats;
}

async function main() {
    console.log('🚀 SeNARS Stream Reasoning Demonstration\n');
    console.log('Comparing stream-based vs cycle-based reasoning approaches.\n');

    try {
        const streamStats = await runStreamDemo();
        const cycleStats = await runCycleDemo();

        section('Summary');
        log('Stream reasoner: Continuous, reactive, backpressure-aware');
        log('Cycle reasoner:  Discrete steps, deterministic, traditional');
        log('\nBoth derive similar conclusions from the same knowledge base.');
        log('Stream is better for real-time, cycle is better for deterministic testing.\n');

        console.log('✅ Demo complete!');
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {runStreamDemo, runCycleDemo};
