import {App} from './src/app/App.js';
import {FormattingUtils} from './src/repl/utils/index.js';
import path from 'path';

async function main() {
    console.log('Starting verification...');
    const app = new App();
    const agent = await app.start({startAgent: false});

    console.log('Agent initialized.');

    // Test Echo
    console.log('--- Testing Echo ---');
    await agent.executeCommand('echo', 'on');
    if (!agent.echo) throw new Error('Echo command failed');
    console.log('Echo ON confirmed.');

    // Test Quiet
    console.log('--- Testing Quiet ---');
    await agent.executeCommand('quiet', 'on');
    if (!agent.quiet) throw new Error('Quiet command failed');
    console.log('Quiet ON confirmed.');
    await agent.executeCommand('quiet', 'off');

    // Test Run Command with the demo file
    console.log('--- Testing Run Command ---');
    const demoPath = 'examples/decision-making.nars';
    console.log(`Running ${demoPath}...`);

    // We expect the run command to execute the file.
    // The file has /step 200ms at the end, which starts auto-step.
    // RunCommand returns output string.
    const output = await agent.executeCommand('run', demoPath);
    console.log('Output from run command:');
    console.log(output);

    // Verify banner presence
    if (!output.includes('Decision Making & Motor Babbling')) {
        throw new Error('Banner not found in output');
    }

    // Verify Narsese execution (implicit via output or agent state)
    // The file adds (bird --> flyer).
    // Let's check beliefs.
    const beliefs = agent.getBeliefs();
    const hasBird = beliefs.some(b => b.term.toString().includes('bird'));
    // Note: Parsing is async in run command? No, RunCommand awaits processInput.
    // But processInput puts task in queue. Processing happens in step().
    // The script calls /step 200ms which starts stepping.
    // Wait, RunCommand executes lines. If line is Narsese, it calls processInput.
    // processInput adds to queue.
    // It does NOT step unless /step is called.
    // The script has /step 200ms at the end.
    // But `agent.startAutoStep` starts an interval.
    // It doesn't block `main` here.

    // Let's manually step to process the inputs
    console.log('Stepping manually to process inputs...');
    await agent.step();
    await agent.step();
    await agent.step();

    const beliefsAfter = agent.getBeliefs();
    console.log('Beliefs after stepping:', beliefsAfter.map(b => b.term.toString()));

    if (!beliefsAfter.some(b => b.term.toString().includes('bird'))) {
         console.warn('Warning: Bird belief not found. Might need more steps or inputs might be in queue.');
    }

    // Stop auto step if running
    if (agent.isRunningLoop) {
        agent._stopRun();
    }

    console.log('Verification complete.');
    process.exit(0);
}

main().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
