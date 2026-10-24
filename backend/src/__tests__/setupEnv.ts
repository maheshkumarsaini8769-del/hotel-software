// Global test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

// IMPORTANT: The backend test suites aggressively wipe collections. Never let
// them touch the developer/production database — default to an isolated
// `spicehub_test` database unless the caller explicitly overrides MONGO_URI.
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_test';
