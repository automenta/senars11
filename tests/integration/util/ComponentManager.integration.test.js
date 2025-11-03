import {NAR} from '../../../src/nar/NAR.js';
import {SystemConfig} from '../../../src/nar/SystemConfig.js';
import {ComponentManager} from '../../../src/util/ComponentManager.js';

describe('ComponentManager Integration', () => {
    it('should dynamically load components from config', async () => {
        const config = {
            components: {
                metacognition: {
                    enabled: true,
                    path: '../reasoning/Metacognition.js',
                    class: 'Metacognition',
                    dependencies: ['nar', 'eventBus'],
                },
            },
        };

        const nar = new NAR(config);

        const metacognition = nar.componentManager.getComponent('metacognition');
        expect(metacognition).toBeDefined();
        expect(metacognition.name).toBe('Metacognition');
    });
});
