import {Agent} from '../src/agent/Agent.js';
import {ReasoningTrajectoryLogger} from '../src/rlfp/ReasoningTrajectoryLogger.js';
import {PreferenceCollector} from '../src/rlfp/PreferenceCollector.js';
import {RLFPLearner} from '../src/rlfp/RLFPLearner.js';
import {DummyProvider} from '../src/lm/DummyProvider.js';
import fs from 'fs';

async function main() {
    console.log("Initializing Agent...");
    const agent = new Agent({
        lm: {
            enabled: true,
            provider: 'dummy',
            providers: {
                dummy: {
                    type: 'dummy',
                    name: 'Dummy Provider',
                    model: 'dummy-model',
                    baseURL: 'http://localhost:1234',
                    apiKey: 'dummy-key'
                }
            }
        },
        inputProcessing: {
            lmTemperature: 0.7
        }
    });

    await agent.initialize();

    // Manual registration
    if (agent.lm) {
        const provider = new DummyProvider({name: 'Dummy', model: 'dummy-model'});
        agent.lm.registerProvider('dummy', provider);
        agent.lm.providers.defaultProviderId = 'dummy';
    }

    // Setup Logger
    const logger = new ReasoningTrajectoryLogger(agent);

    // --- Trajectory A ---
    console.log("\n--- Generating Trajectory A ---");
    logger.startTrajectory();

    const resA = await agent.processInput("Hello, please solve 2+2.");
    console.log("Result A:", resA);

    const trajAFile = 'trajectory_a.json';
    const trajA = logger.endTrajectory(trajAFile);
    console.log(`Trajectory A saved to ${trajAFile} (${trajA.length} steps)`);

    // --- Trajectory B ---
    console.log("\n--- Generating Trajectory B ---");
    logger.startTrajectory();

    const resB = await agent.processInput("Hi, what is the sum of 2 and 2?");
    console.log("Result B:", resB);

    const trajBFile = 'trajectory_b.json';
    const trajB = logger.endTrajectory(trajBFile);
    console.log(`Trajectory B saved to ${trajBFile} (${trajB.length} steps)`);

    // --- Preference Collection ---
    const collector = new PreferenceCollector();
    let preferenceData = null;

    if (process.argv.includes('--non-interactive')) {
        console.log("\nRunning in non-interactive mode. Simulating preference 'A'.");
        preferenceData = {
            trajectoryA: trajA,
            trajectoryB: trajB,
            preference: 'A',
            timestamp: Date.now()
        };
    } else {
        console.log("\nStarting Preference Collector...");
        preferenceData = await collector.collectPreference(trajAFile, trajBFile);
    }

    // --- Learning ---
    if (preferenceData) {
        console.log("\nUpdating Model...");
        const learner = new RLFPLearner(agent);
        learner.updateModel(preferenceData);

        if (fs.existsSync('rlfp_training_data.jsonl')) {
            console.log("Success! rlfp_training_data.jsonl updated.");
        }
    } else {
        console.log("No preference selected.");
    }

    // Cleanup
    if (process.argv.includes('--cleanup')) {
        if (fs.existsSync(trajAFile)) fs.unlinkSync(trajAFile);
        if (fs.existsSync(trajBFile)) fs.unlinkSync(trajBFile);
    }

    await agent.stop();
    process.exit(0);
}

main().catch(error => {
    console.error("Error in demo:", error);
    process.exit(1);
});
