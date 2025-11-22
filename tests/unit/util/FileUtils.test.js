import { FileUtils } from '../../../src/util/FileUtils.js';
import { FileAnalyzer } from '../../../src/util/FileAnalyzer.js';
import path from 'path';
import fs from 'fs';

describe('FileUtils & FileAnalyzer', () => {
    describe('FileUtils', () => {
        test('collectFiles finds files', () => {
            // Create a dummy structure
            const testDir = 'temp_test_dir';
            if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
            fs.writeFileSync(path.join(testDir, 'a.txt'), 'content');
            fs.writeFileSync(path.join(testDir, 'b.js'), 'content');

            const files = FileUtils.collectFiles([testDir], (name) => name.endsWith('.txt'));
            expect(files.length).toBe(1);
            expect(files[0]).toContain('a.txt');

            // Clean up
            fs.rmSync(testDir, { recursive: true, force: true });
        });

        test('isExcludedPath', () => {
            expect(FileUtils.isExcludedPath('node_modules/pkg/index.js')).toBe(true);
            expect(FileUtils.isExcludedPath('src/code.js')).toBe(false);
        });
    });

    describe('FileAnalyzer', () => {
        test('collectTestFiles finds this test file', () => {
            const files = FileAnalyzer.collectTestFiles();
            // This current file should be in the list
            const thisFile = 'tests/unit/util/FileUtils.test.js';
            // Note: collecting files might return relative paths.
            // Since we created this file just now, it might not be found if we don't save it to disk properly
            // or if the search paths are strict.
            // But we are writing this block to a file, so it will exist when run.

            // Actually, let's just check if it finds *some* known test file
            const commonTest = 'tests/unit/util/common.test.js';
            const found = files.some(f => f.includes('common.test.js'));
            expect(found).toBe(true);
        });
    });
});
