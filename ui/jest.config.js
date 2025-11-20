export default {
    testEnvironment: 'jsdom',
    // resolver: './jest-resolver.cjs',
    testPathIgnorePatterns: [
        '/node_modules/',
        '/tests/advanced/',
        '/tests/debug/',
        '/tests/e2e/',
        '/tests/graph/',
        '/tests/production/',
        '/tests/server/',
        '/tests/verification/',
        '/tests/websocket/'
    ],
    setupFilesAfterEnv: [],
    // setupFiles: ['<rootDir>/tests/setup.js'],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/advanced/',
        '/tests/debug/',
        '/tests/e2e/',
        '/tests/graph/',
        '/tests/production/',
        '/tests/server/',
        '/tests/verification/',
        '/tests/websocket/'
    ],
    transform: {
        '^.+\\.(js|jsx|mjs)$': 'babel-jest'
    },
    moduleFileExtensions: ['js', 'jsx', 'json', 'mjs', 'cjs']
};
