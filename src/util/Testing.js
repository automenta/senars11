import {spawnSync} from 'child_process';

export const runTestsAndGetCoverage = async () => {
    return spawnSync('npx', ['jest', '--config', 'jest.config.cjs', '--json', '--coverage', '--coverageReporters=json-summary'], {
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
};
