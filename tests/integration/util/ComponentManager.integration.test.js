import {NAR} from '../../../src/nar/NAR.js';
import {SystemConfig} from '../../../src/nar/SystemConfig.js';
import {ComponentManager} from '../../../src/util/ComponentManager.js';

describe('ComponentManager Integration', () => {
    it('should dynamically load components from config', async () => {
        const config = {
            components: {
                focus: {
                    enabled: true,
                    path: 'memory/Focus.js',
                    class: 'Focus',
                    dependencies: [],
                    config: { capacity: 100 }  // Example config
                },
            },
        };

        const nar = new NAR(config);

        const focusComponent = nar.componentManager.getComponent('focus');
        expect(focusComponent).toBeDefined();
        expect(focusComponent.isInitialized !== undefined).toBe(true); // Check that component was loaded
    });
});
