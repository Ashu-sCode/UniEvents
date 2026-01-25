/**
 * Models Index
 * Central export for all Mongoose models
 */

const User = require('./User.model');
const Event = require('./Event.model');
const Ticket = require('./Ticket.model');
const Attendance = require('./Attendance.model');
const Certificate = require('./Certificate.model');

module.exports = {
  User,
  Event,
  Ticket,
  Attendance,
  Certificate
};
