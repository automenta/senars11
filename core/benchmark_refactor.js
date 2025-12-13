import {NAR} from './src/nar/NAR.js';
import {performance} from 'perf_hooks';

async function runBenchmark() {
    console.log('Starting benchmark...');

    const config = {
        memory: {
            maxConcepts: 10000,
            maxTasksPerConcept: 100
        },
        reasoning: {
            maxDerivationDepth: 10
        }
    };

    const nar = new NAR(config);
    await nar.initialize();
    await nar.start();

    const iterations = 1000;
    const startTime = performance.now();

    // Scenario: Chain of reasoning
    // A->B, B->C, C->D, ...

    const chainLength = 100;
    for (let i = 0; i < chainLength; i++) {
        await nar.input(`<T${i} --> T${i + 1}>.`);
    }

    // Run cycles
    const cycleStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        nar.step();
    }
    const cycleEnd = performance.now();

    const duration = cycleEnd - cycleStart;
    const opsPerSec = (iterations / duration) * 1000;

    console.log(`Benchmark completed:`);
    console.log(`Iterations: ${iterations}`);
    console.log(`Duration: ${duration.toFixed(2)}ms`);
    console.log(`Throughput: ${opsPerSec.toFixed(2)} cycles/sec`);

    await nar.stop();
}

runBenchmark().catch(console.error);
