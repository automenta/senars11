import {ReasoningTrajectoryLogger} from '../src/rlfp/ReasoningTrajectoryLogger.js';
import {AGENT_EVENTS} from '../src/agent/constants.js';
import fs from 'fs';
import {EventEmitter} from 'events';

const mockAgent = {
    _eventBus: new EventEmitter(),
    emit: function(event, data) { this._eventBus.emit(event, data); }
};

const logger = new ReasoningTrajectoryLogger(mockAgent);
logger.startTrajectory();

// Simulate events
mockAgent.emit(AGENT_EVENTS.LLM_PROMPT, {messages: [{content: "Hello"}]});
mockAgent.emit(AGENT_EVENTS.TOOL_CALL, {name: "calculator", args: {expr: "1+1"}});

setTimeout(() => {
    const trajectory = logger.endTrajectory('test_trajectory.json');
    console.log('Trajectory length:', trajectory.length);
    const saved = JSON.parse(fs.readFileSync('test_trajectory.json', 'utf-8'));
    console.log('Saved length:', saved.length);
    console.log('Content:', JSON.stringify(saved, null, 2));
    fs.unlinkSync('test_trajectory.json');
}, 100);
