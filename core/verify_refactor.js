import {TestNAR} from './src/testing/TestNAR.js';
import {TermFactory} from './src/term/TermFactory.js';

async function verify() {
    console.log('Starting verification...');

    // 1. Verify TermFactory and TermCache
    console.log('Verifying TermFactory and TermCache...');
    const termFactory = new TermFactory({maxCacheSize: 100});
    const term1 = termFactory.create('cat');
    const term2 = termFactory.create('cat');

    if (term1 !== term2) throw new Error('TermFactory caching failed: terms should be identical object references');
    console.log('TermFactory caching: OK');

    const term3 = termFactory.inheritance('cat', 'animal');
    if (term3.toString() !== '<cat --> animal>') throw new Error(`Term construction failed: ${term3.toString()}`);
    console.log('Term construction: OK');

    // 2. Verify Memory and Reasoning via TestNAR
    console.log('Verifying Memory and Reasoning...');
    const test = new TestNAR(true); // Enable trace

    try {
        await test
            .input('<cat --> animal>')
            .input('<animal --> living>')
            .run(20) // Give it some cycles
            .expect('(-->, cat, living)') // Expect deduction in prefix notation (reverted behavior)
            .execute();

        console.log('Reasoning verification: OK');
    } catch (error) {
        console.error('Reasoning verification failed:', error);
        process.exit(1);
    }

    console.log('All verifications passed!');
}

verify().catch(console.error);
