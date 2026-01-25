/**
 * Event Controller
 * Handles event CRUD operations
 */

const Event = require('../models/Event.model');
const Ticket = require('../models/Ticket.model');
const { roles } = require('../config/auth.config');

/**
 * @route   POST /api/events
 * @desc    Create a new event
 * @access  Private (Organizer only)
 */
const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      eventType,
      department,
      seatLimit,
      date,
      time,
      venue,
      enableCertificates
    } = req.body;

    const event = await Event.create({
      title,
      description,
      organizerId: req.user._id,
      eventType,
      department,
      seatLimit,
      date,
      time,
      venue,
      enableCertificates: enableCertificates || false
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/events
 * @desc    Get all published events (for students) or organizer's events
 * @access  Public/Private
 */
const getEvents = async (req, res, next) => {
  try {
    const { status, department, eventType, upcoming } = req.query;
    let query = {};

    // If user is logged in and is an organizer, show their events
    if (req.user && req.user.role === roles.ORGANIZER) {
      query.organizerId = req.user._id;
      if (status) query.status = status;
    } else {
      // For students/public, show only published events
      query.status = Event.EVENT_STATUS.PUBLISHED;
    }

    // Filter by department
    if (department) {
      query.department = department;
    }

    // Filter by event type
    if (eventType) {
      query.eventType = eventType;
    }

    // Filter upcoming events only
    if (upcoming === 'true') {
      query.date = { $gte: new Date() };
    }

    const events = await Event.find(query)
      .populate('organizerId', 'name email department')
      .sort({ date: 1 });

    res.json({
      success: true,
      count: events.length,
      data: { events }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/events/:id
 * @desc    Get event by ID
 * @access  Public
 */
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizerId', 'name email department');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/events/:id
 * @desc    Update event
 * @access  Private (Organizer only, own events)
 */
const updateEvent = async (req, res, next) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership
    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'eventType', 'department',
      'seatLimit', 'date', 'time', 'venue', 'status', 'enableCertificates'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    await event.save();

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event
 * @access  Private (Organizer only, own events)
 */
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership
    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    await event.deleteOne();

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/events/:id/registrations
 * @desc    Get all registrations for an event
 * @access  Private (Organizer only, own events)
 */
const getEventRegistrations = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership
    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view registrations'
      });
    }

    const tickets = await Ticket.find({ eventId: req.params.id })
      .populate('userId', 'name email rollNumber department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tickets.length,
      data: { registrations: tickets }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventRegistrations
};
