// Must be imported FIRST in every test file: config/env.ts reads process.env at import time.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.JWT_EXPIRES_IN = "1h";
delete process.env.DATABASE_URL;
