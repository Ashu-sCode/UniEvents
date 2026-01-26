/**
 * Certificate Model
 * Stores certificates generated after event completion
 * 
 * Certificates are typically generated for workshops
 * and other educational events where attendance matters
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const certificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    unique: true,
    default: () => `CERT-${uuidv4().slice(0, 12).toUpperCase()}`
  },
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
  issuedAt: {
    type: Date,
    default: Date.now
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Organizer who issued the certificate
    required: true
  },
  pdfUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index - one certificate per user per event
certificateSchema.index({ eventId: 1, userId: 1 }, { unique: true });
// certificateSchema.index({ certificateId: 1 });
certificateSchema.index({ userId: 1 });

const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;
