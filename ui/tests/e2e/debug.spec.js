import {test} from './fixtures/base-fixture.js';

test.describe('Debug Commands', () => {
    test('/help command shows available commands', async ({narPage}) => {
        await narPage.sendCommand('/help');
        await narPage.expectLog('Available debug commands:');
        await narPage.expectLog('/help');
        await narPage.expectLog('/state');
    });

    test('/state command shows status information', async ({narPage}) => {
        await narPage.sendCommand('/state');
        await narPage.expectLog('Connection:');
    });

    test('/refresh command requests graph refresh', async ({narPage}) => {
        await narPage.refreshGraph();
    });

    test('/clear command clears logs', async ({narPage}) => {
        await narPage.sendCommand('<test --> command>.');
        await narPage.expectLog('<test --> command>.');
        await narPage.clearLogs();
    });
});
