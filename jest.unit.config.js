/** @type {import('jest').Config} */
import baseConfig from './tests/config/base.config.js';

export default {
    ...baseConfig,
    roots: ['<rootDir>/tests/unit'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup/unit.js'],
    testMatch: ['**/tests/unit/**/*.test.js'],
    testPathIgnorePatterns: [
        '<rootDir>/tests/unit/.*performance.*',
        '<rootDir>/tests/unit/.*benchmark.*',
    ],
};