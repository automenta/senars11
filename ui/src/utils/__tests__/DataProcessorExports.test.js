// Unit test to verify dataProcessor.js can import getNestedValue from OptimizedDataProcessor.js
import {describe, expect, it} from 'vitest';

describe('dataProcessor.js imports', () => {
    it('can import getNestedValue from OptimizedDataProcessor.js', async () => {
        // This verifies that dataProcessor.js can import getNestedValue without error
        const dataProcessorModule = await import('../dataProcessor.js');
        expect(dataProcessorModule.getNestedValue).toBeDefined();
    });

    it('getNestedValue function works correctly', async () => {
        const {getNestedValue} = await import('../OptimizedDataProcessor.js');

        // Test with simple object
        const obj = {a: {b: {c: 'value'}}};
        expect(getNestedValue(obj, 'a.b.c')).toBe('value');

        // Test with non-existent path
        expect(getNestedValue(obj, 'a.b.x')).toBeUndefined();

        // Test with direct property
        expect(getNestedValue(obj, 'a')).toEqual({b: {c: 'value'}});
    });

    it('dataProcessor imports all expected functions', async () => {
        const module = await import('../dataProcessor.js');

        // Check that all the functions dataProcessor tries to import exist
        expect(module.processDataWithFilters).toBeDefined();
        expect(module.groupRelatedItems).toBeDefined();
        expect(module.extractDisplayProperties).toBeDefined();
        expect(module.createDataDisplayElement).toBeDefined();
        expect(module.createDataSummary).toBeDefined();
        expect(module.safeTransformData).toBeDefined();
        expect(module.createSearchableCollection).toBeDefined();
        expect(module.process).toBeDefined();
        expect(module.getNestedValue).toBeDefined();
    });
});