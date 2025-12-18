#!/usr/bin/env node

import { LM } from '../../core/src/lm/LM.js';
import { DummyProvider } from '../../core/src/lm/DummyProvider.js';

class FailingProvider extends DummyProvider {
    constructor(config = {}) {
        super(config);
        this.failureCount = 0;
        this.shouldFail = config.shouldFail ?? true;
    }

    async generateText(prompt, options = {}) {
        if (this.shouldFail) {
            this.failureCount++;
            throw new Error(`Simulated failure #${this.failureCount}`);
        }
        return super.generateText(prompt, options);
    }
}

async function main() {
    console.log('=== Circuit Breaker Demo ===\n');

    const lm = new LM({
        circuitBreaker: {
            failureThreshold: 3,
            timeout: 5000,
            resetTimeout: 2000
        }
    });

    const failingProvider = new FailingProvider({
        id: 'failing-provider',
        shouldFail: true
    });

    lm.registerProvider('failing-provider', failingProvider);

    console.log('Phase 1: Triggering failures...\n');

    // Trigger failures to open circuit breaker
    for (let i = 1; i <= 5; i++) {
        try {
            console.log(`Attempt ${i}:`);
            await lm.generateText('Test prompt', {}, 'failing-provider');
            console.log('  ✅ Success\n');
        } catch (error) {
            console.log(`  ❌ ${error.message}`);

            const state = lm.getCircuitBreakerState();
            console.log(`  Circuit breaker state: ${state.state}`);

            if (state.state === 'OPEN') {
                console.log('  ⚠️  Circuit is OPEN - subsequent calls will fail fast!\n');
                break;
            }
            console.log('');
        }
    }

    console.log('Phase 2: Attempting call with OPEN circuit...\n');

    try {
        await lm.generateText('Test prompt', {}, 'failing-provider');
    } catch (error) {
        console.log(`❌ ${error.message}`);
        console.log('   (Failed immediately without calling provider)\n');
    }

    console.log('Phase 3: Waiting for circuit to enter HALF_OPEN...\n');
    await new Promise(resolve => setTimeout(resolve, 2500));

    console.log(`Circuit breaker state: ${lm.getCircuitBreakerState().state}\n`);

    console.log('Phase 4: Recovery - Fix provider and reset circuit...\n');

    failingProvider.shouldFail = false;
    console.log('✅ Provider fixed');

    lm.resetCircuitBreaker();
    console.log('✅ Circuit breaker reset');
    console.log(`   State: ${lm.getCircuitBreakerState().state}\n`);

    console.log('Phase 5: Testing recovery...\n');

    try {
        const result = await lm.generateText('Hello, world!', {}, 'failing-provider');
        console.log(`✅ Success! Result: "${result}"`);
    } catch (error) {
        console.log(`❌ Still failing: ${error.message}`);
    }

    console.log('\n📊 Final Metrics:');
    const metrics = lm.getMetrics();
    console.log(`  Total calls: ${metrics.lmStats.totalCalls}`);
    console.log(`  Avg response time: ${Math.round(metrics.lmStats.avgResponseTime)}ms`);
    console.log(`  Circuit state: ${lm.getCircuitBreakerState().state}`);

    console.log('\n✅ Circuit breaker demo completed!');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
