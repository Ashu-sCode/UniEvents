const mongoose = require('mongoose');

const NOTIFICATION_TYPES = {
  REGISTRATION_CONFIRMED: 'registration_confirmed',
  WAITLIST_JOINED: 'waitlist_joined',
  WAITLIST_PROMOTED: 'waitlist_promoted',
  REGISTRATION_CANCELLED: 'registration_cancelled',
  EVENT_UPDATED: 'event_updated',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_PUBLISHED: 'event_published',
  CERTIFICATE_READY: 'certificate_ready',
  ATTENDANCE_MARKED: 'attendance_marked',
};

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: Object.values(NOTIFICATION_TYPES),
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  link: {
    type: String,
    default: null,
    trim: true,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

notificationSchema.index({ userId: 1, createdAt: -1 });

notificationSchema.statics.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
