require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const { ensureDemoData } = require('../services/demoSeedService');

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required to seed demo data.');
    }

    await connectDB();
    const result = await ensureDemoData();
    console.log('[demo-seed]', result);
  } catch (error) {
    console.error('[demo-seed] failed:', error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

run();
