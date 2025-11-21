import {PreferenceCollector} from './PreferenceCollector.js';

describe('PreferenceCollector', () => {
    let collector;

    beforeEach(() => {
        collector = new PreferenceCollector();
    });

    test('records preference', () => {
        const record = collector.recordPreference('traj-A', 'traj-B', 'A is faster');
        expect(record).toBeDefined();
        expect(record.betterId).toBe('traj-A');
        expect(record.worseId).toBe('traj-B');
        expect(collector.getAllPreferences().length).toBe(1);
    });

    test('export and import JSON', () => {
        collector.recordPreference('A', 'B');
        const json = collector.exportJSON();

        const newCollector = new PreferenceCollector();
        newCollector.importJSON(json);

        expect(newCollector.getAllPreferences().length).toBe(1);
        expect(newCollector.getAllPreferences()[0].betterId).toBe('A');
    });
});
