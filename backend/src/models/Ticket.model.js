/**
 * Ticket Model
 * Stores ticket information with QR codes
 * 
 * SECURITY NOTE: QR code contains ONLY the ticketId
 * No personal data is stored in the QR code
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Ticket status
const TICKET_STATUS = {
  UNUSED: 'unused',
  USED: 'used',
  CANCELLED: 'cancelled'
};

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    default: () => `TKT-${uuidv4().slice(0, 8).toUpperCase()}`
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
  qrCode: {
    type: String,  // Base64 encoded QR code image
    required: true
  },
  status: {
    type: String,
    enum: Object.values(TICKET_STATUS),
    default: TICKET_STATUS.UNUSED
  },
  usedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
ticketSchema.index({ eventId: 1, userId: 1 }, { unique: true });
ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ status: 1 });

/**
 * Check if ticket can be used for entry
 */
ticketSchema.methods.canBeUsed = function() {
  return this.status === TICKET_STATUS.UNUSED;
};

/**
 * Mark ticket as used
 */
ticketSchema.methods.markAsUsed = async function() {
  this.status = TICKET_STATUS.USED;
  this.usedAt = new Date();
  return this.save();
};

// Static constants
ticketSchema.statics.TICKET_STATUS = TICKET_STATUS;

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
