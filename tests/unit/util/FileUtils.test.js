import { collectFiles, isExcludedPath, collectTestFiles } from '../../../src/util/FileUtils.js';
import path from 'path';
import fs from 'fs';

describe('FileUtils', () => {
    describe('collectFiles', () => {
        test('finds files', () => {
            // Create a dummy structure
            const testDir = 'temp_test_dir_' + Date.now();
            if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
            fs.writeFileSync(path.join(testDir, 'a.txt'), 'content');
            fs.writeFileSync(path.join(testDir, 'b.js'), 'content');

            const files = collectFiles([testDir], (name) => name.endsWith('.txt'));
            expect(files.length).toBe(1);
            expect(files[0]).toContain('a.txt');

            // Clean up
            fs.rmSync(testDir, { recursive: true, force: true });
        });
    });

    describe('isExcludedPath', () => {
        test('identifies excluded paths', () => {
            expect(isExcludedPath('node_modules/pkg/index.js')).toBe(true);
            expect(isExcludedPath('src/code.js')).toBe(false);
        });
    });

    describe('collectTestFiles', () => {
        test('finds test files', () => {
            const files = collectTestFiles();
            // Check if it finds *some* known test file
            const found = files.some(f => f.includes('common.test.js'));
            expect(found).toBe(true);
        });
    });
});
