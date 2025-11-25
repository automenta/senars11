import { runExample } from './utils/example-runner.js';
import { ReasoningTrajectoryLogger } from '../src/rlfp/ReasoningTrajectoryLogger.js';

/**
 * Demonstrates a more advanced reasoning scenario with the SeNARS agent.
 *
 * This example presents the agent with a simple decision-making problem and uses
 * the ReasoningTrajectoryLogger to capture the agent's thought process.
 */
async function main() {
  const logger = new ReasoningTrajectoryLogger();

  const inputs = [
    'There are two buttons, a red one and a green one. The red button is dangerous. The green button is safe. Which button should I press?',
  ];

  await runExample({
    model: 'Xenova/LaMini-Flan-T5-248M',
    inputs,
    onStep: (step) => {
      logger.logStep(step);
    },
  });

  console.log('\n--- Reasoning Trajectory ---');
  console.log(JSON.stringify(logger.endTrajectory(), null, 2));
}

main();
