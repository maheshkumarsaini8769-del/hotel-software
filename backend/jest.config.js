process.env.JWT_SECRET = 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 20000,
  setupFiles: ['<rootDir>/src/__tests__/setupEnv.ts'],
};
