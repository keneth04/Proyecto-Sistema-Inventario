module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test/jest'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/index.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  clearMocks: true
};