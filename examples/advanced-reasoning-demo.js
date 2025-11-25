import { runExample } from './utils/example-runner.js';
import { ReasoningTrajectoryLogger } from '../src/rlfp/ReasoningTrajectoryLogger.js';

/**
 * Demonstrates a more advanced reasoning scenario with the SeNARS agent.
 *
 * This example presents the agent with a simple decision-making problem and uses
 * the ReasoningTrajectoryLogger to capture the agent's thought process.
 */
async function main() {
    const agent = AgentBuilder.createAdvancedAgent({
        lm: {
            provider: 'transformers',
            modelName: 'Xenova/LaMini-Flan-T5-248M'
        }
    });
    await agent.initialize();

    const logger = new ReasoningTrajectoryLogger(agent);
    logger.startTrajectory();

    const inputs = [
        'There are two buttons, a red one and a green one. The red button is dangerous. The green button is safe. Which button should I press?',
    ];

    await runExample({
        agent,
        inputs
    });

    console.log('\n--- Reasoning Trajectory ---');
    const trajectory = logger.endTrajectory('trajectory.json');
    console.log(JSON.stringify(trajectory, null, 2));
}

main();
