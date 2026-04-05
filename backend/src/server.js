/**
 * UniEvent Backend Server
 * Entry point for the Express application
 */

require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set it in your backend .env before starting the server.');
}

const app = require('./app');
const connectDB = require('./config/database');
const { ensureDemoData } = require('./services/demoSeedService');
const { ensureAdminAccount } = require('./services/adminBootstrapService');
const os = require('os');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

async function startServer() {
  await connectDB();

  try {
    const adminResult = await ensureAdminAccount();
    if (adminResult.created) {
      console.log(`[admin-bootstrap] Admin account ready: ${adminResult.email}`);
    }
  } catch (adminError) {
    console.error('[admin-bootstrap] Failed to prepare admin account:', adminError.message);
  }

  if (process.env.NODE_ENV !== 'production' && process.env.AUTO_SEED_DEMO_DATA !== 'false') {
    try {
      const seedResult = await ensureDemoData();
      if (seedResult.seeded) {
        console.log('[demo-seed] Demo data ready');
        console.log(`[demo-seed] Organizer login: ${seedResult.credentials.organizer.email} / ${seedResult.credentials.organizer.password}`);
        console.log(`[demo-seed] Student login:   ${seedResult.credentials.student.email} / ${seedResult.credentials.student.password}`);
      }
    } catch (seedError) {
      console.error('[demo-seed] Failed to prepare demo data:', seedError.message);
    }
  }

  app.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    console.log('\nUniEvent API Server');
    console.log('--------------------------------');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Local:       http://localhost:${PORT}/api`);
    console.log(`Network:     http://${localIP}:${PORT}/api`);
    console.log('--------------------------------\n');
  });
}

startServer();
