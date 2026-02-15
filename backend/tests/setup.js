jest.setTimeout(900000);

const mongoose = require('mongoose');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.RESET_PASSWORD_EXPIRES_MINUTES = '30';

  const uri = process.env.MONGO_URL;
  if (!uri) {
    throw new Error('MONGO_URL is not set. globalSetup should set it.');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
});

beforeEach(async () => {
  const { db } = mongoose.connection;
  if (!db) return;

  const collections = await db.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
