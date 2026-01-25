/**
 * Attendance Model
 * Tracks attendance for events
 * 
 * Attendance is automatically recorded when a ticket is scanned and verified
 */

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: [true, 'Ticket is required']
  },
  entryTime: {
    type: Date,
    default: Date.now
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Organizer who verified the ticket
    required: true
  }
}, {
  timestamps: true
});

// Compound index - one attendance record per user per event
attendanceSchema.index({ eventId: 1, userId: 1 }, { unique: true });
attendanceSchema.index({ eventId: 1, entryTime: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
