module.exports = {
    testEnvironment: 'node',
    testPathIgnorePatterns: [
        'ui/',
        'exp'
    ],
    modulePathIgnorePatterns: [
        '<rootDir>/ui/'
    ],
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    collectCoverageFrom: [
        'core/src/**/*.js',
        'agent/src/**/*.js',
        'ui/src/**/*.js',
        '!**/*.test.js',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};
