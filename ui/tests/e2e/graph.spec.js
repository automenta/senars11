import {test} from './fixtures/production-fixture.js';
import {TestNARPlaywright} from './utils/TestNARPlaywright.js';

test.describe('Graph Functionality', () => {
    test('Graph reflects new concepts', async ({productionPage}) => {
        const nar = new TestNARPlaywright(productionPage.page);

        await nar.input('<graph_test_concept --> test>.')
            .run(5)
            .expectGraph('graph_test_concept')
            .execute();
    });
});
