/**
 * Attendance Routes
 * Handles attendance tracking and reports
 */

const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticate, organizerOnly } = require('../middleware/auth.middleware');

// Student route
router.get('/my-attendance', authenticate, attendanceController.getMyAttendance);

// Organizer routes
router.get('/event/:eventId', authenticate, organizerOnly, attendanceController.getEventAttendance);
router.get('/event/:eventId/stats', authenticate, organizerOnly, attendanceController.getEventStats);

module.exports = router;
