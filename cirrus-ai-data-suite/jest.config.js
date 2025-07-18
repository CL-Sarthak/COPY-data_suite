const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/smoke/',
    '/__tests__/integration/',
    '.smoke.test.',
    '.integration.test.'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/not-found.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/page.tsx',
    '!src/app/api/**/*', // API routes need integration tests, not unit tests
    '!src/entities/**/*', // TypeORM entities show 0% due to decorators
    '!src/database/**/*', // Database connection and migrations
    '!src/scripts/**/*', // CLI scripts
    '!src/types/**/*', // Type definitions
    '!**/*.config.{js,ts}', // Config files
    '!**/*.setup.{js,ts}', // Setup files
  ],
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageDirectory: 'coverage',
  testTimeout: 10000,
  // Set reasonable thresholds based on current coverage
  coverageThreshold: {
    global: {
      statements: 6,
      branches: 6,
      functions: 8,
      lines: 6,
    },
    // Higher thresholds for well-tested components
    './src/components/TagManager.tsx': {
      statements: 85,
      branches: 80,
      functions: 80,
      lines: 85,
    },
    './src/components/HelpSystem.tsx': {
      statements: 75,
      branches: 85,
      functions: 70,
      lines: 75,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)