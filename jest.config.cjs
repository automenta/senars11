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
        'src/**/*.js',
        '!src/**/*.test.js',
        'ui2/**/*.js',
        '!ui2/**/*.test.js'
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
