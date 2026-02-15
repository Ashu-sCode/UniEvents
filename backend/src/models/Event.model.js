/**
 * Event Model
 * Stores university event information
 */

const mongoose = require('mongoose');

// Event types
const EVENT_TYPES = {
  PUBLIC: 'public',        // Freshers, Farewell - open to all
  DEPARTMENTAL: 'departmental'  // Workshops - department specific
};

// Event status
const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required']
  },
  eventType: {
    type: String,
    enum: Object.values(EVENT_TYPES),
    required: [true, 'Event type is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  seatLimit: {
    type: Number,
    required: [true, 'Seat limit is required'],
    min: [1, 'Seat limit must be at least 1']
  },
  registeredCount: {
    type: Number,
    default: 0,
    min: 0
  },
  date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  time: {
    type: String,
    required: [true, 'Event time is required']
  },
  venue: {
    type: String,
    required: [true, 'Venue is required'],
    trim: true
  },
  status: {
    type: String,
    enum: Object.values(EVENT_STATUS),
    default: EVENT_STATUS.DRAFT
  },
  bannerUrl: {
    type: String,
    default: null
  },
  bannerFileId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  enableCertificates: {
    type: Boolean,
    default: false  // Enable certificate generation for workshops
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ organizerId: 1 });
eventSchema.index({ department: 1, eventType: 1 });

// Search indexes (used for keyword search)
// Note: even if we use regex for search, a text index is useful for future optimizations.
eventSchema.index({ title: 'text', description: 'text', venue: 'text' });

// Virtual for checking if seats are available
eventSchema.virtual('seatsAvailable').get(function() {
  return this.seatLimit - this.registeredCount;
});

// Virtual for checking if registration is open
eventSchema.virtual('isRegistrationOpen').get(function() {
  return this.status === EVENT_STATUS.PUBLISHED && 
         this.registeredCount < this.seatLimit &&
         new Date(this.date) > new Date();
});

// Include virtuals in JSON output
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

// Static constants
eventSchema.statics.EVENT_TYPES = EVENT_TYPES;
eventSchema.statics.EVENT_STATUS = EVENT_STATUS;

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
