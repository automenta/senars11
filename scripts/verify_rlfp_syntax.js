import {ReasoningTrajectoryLogger} from '../src/rlfp/ReasoningTrajectoryLogger.js';
import {PreferenceCollector} from '../src/rlfp/PreferenceCollector.js';

console.log('Imports successful!');
const logger = new ReasoningTrajectoryLogger({_eventBus: {on: () => {}}}); // Mock agent
console.log('Logger initialized');
