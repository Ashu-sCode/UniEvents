/**
 * UniEvent Backend Server
 * Entry point for the Express application
 */

require('dotenv').config();

// Fail fast if critical security config is missing
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set it in your backend .env before starting the server.');
}

const app = require('./app');
const connectDB = require('./config/database');
const os = require('os');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

// Get local IP for logging
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

// Connect to MongoDB
connectDB();

// Start server
app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log(`\n🚀 UniEvent API Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Local:       http://localhost:${PORT}/api`);
  console.log(`🌐 Network:     http://${localIP}:${PORT}/api`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
