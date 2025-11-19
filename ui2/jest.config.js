export default {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: [],
  transform: {},
  moduleNameMapper: {
    '^./utils/(.*)$': '<rootDir>/tests/utils/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  coveragePathIgnorePatterns: ['/node_modules/']
};