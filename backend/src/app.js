const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const eventRoutes = require('./routes/event.routes');
const ticketRoutes = require('./routes/ticket.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const certificateRoutes = require('./routes/certificate.routes');

const errorHandler = require('./middleware/errorHandler');

const app = express();

/* ---------- CORS ---------- */
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

app.options('*', cors());

/* ---------- BODY PARSERS ---------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------- STATIC ---------- */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* ---------- ROUTES ---------- */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'UniEvent API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/certificates', certificateRoutes);

/* ---------- ERRORS ---------- */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
