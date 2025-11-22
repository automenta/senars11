import {spawnSync} from 'child_process';
import { FileUtils } from './FileUtils.js';

export class TestUtils {
    static async runTestsAndGetCoverage() {
        // Try running tests with coverage enabled
        const testResult = spawnSync('npx', ['jest', '--config', 'jest.config.cjs', '--json', '--coverage', '--coverageReporters=json-summary'], {
            cwd: process.cwd(),
            timeout: 180000,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_NO_WARNINGS: '1',
                NODE_OPTIONS: '--experimental-vm-modules'
            }
        });

        return testResult;
    }
}

export class FileAnalyzer {
    static collectTestFiles() {
         const searchPaths = ['./tests', './test', './src'];

        const isTestFile = (fileName) => {
            return fileName.endsWith('.test.js') ||
                fileName.endsWith('.spec.js') ||
                fileName.includes('_test.js') ||
                fileName.includes('_spec.js');
        };

        return FileUtils.collectFiles(searchPaths, isTestFile);
    }
}
