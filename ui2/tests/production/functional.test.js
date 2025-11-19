/**
 * @file functional.test.js
 * @description Comprehensive functional tests using shared utilities
 */

import { UI2TestRunner, getSharedBrowser, closeSharedBrowser } from '../utils/test-utils.js';

describe('UI2 Functional Tests with Real Backend', () => {
    let testRunner = null;

    beforeAll(async () => {
        // Assumes backend is running via launcher script on default ports
    });

    afterAll(async () => {
        await closeSharedBrowser();
    });

    beforeEach(async () => {
        testRunner = new UI2TestRunner({ uiPort: 8210, wsPort: 8211 });
        await testRunner.setup();
    });

    afterEach(async () => {
        await testRunner.teardown();
    });

    test('Core functionality: Connection and basic command processing', async () => {
        // Test connection is established
        await testRunner.testConnection();
        
        // Test basic command execution
        await testRunner.testCommandExecution(
            '<{functional_test} --> concept>.', 
            'functional_test'
        );
    });

    test('Core functionality: Reasoning step execution', async () => {
        await testRunner.testCommandExecution('*step', '*step');
    });

    test('Core functionality: Question processing', async () => {
        await testRunner.testCommandExecution(
            '<{question_test} --> concept>?', 
            'question_test'
        );
    });

    test('Core functionality: UI controls work', async () => {
        await testRunner.testUIControls();
    });

    test('Core functionality: Debug commands work', async () => {
        await testRunner.testDebugCommands();
    });

    test('Core functionality: Quick commands work', async () => {
        await testRunner.testQuickCommands();
    });
});