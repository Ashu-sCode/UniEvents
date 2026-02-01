/**
 * Ticket Controller
 * Handles ticket generation, QR verification, and entry management
 */

const Event = require('../models/Event.model');
const Ticket = require('../models/Ticket.model');
const Attendance = require('../models/Attendance.model');
const { generateQRCode } = require('../utils/qrGenerator');
const { generateTicketPDF } = require('../utils/pdfGenerator');

/**
 * @route   POST /api/tickets/register/:eventId
 * @desc    Register for an event and generate ticket
 * @access  Private (Student)
 */
const registerForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is published
    if (event.status !== Event.EVENT_STATUS.PUBLISHED) {
      return res.status(400).json({
        success: false,
        message: 'Registration is not open for this event'
      });
    }

    // Check if seats are available
    if (event.registeredCount >= event.seatLimit) {
      return res.status(400).json({
        success: false,
        message: 'No seats available'
      });
    }

    // Check if event is in the future
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Registration closed for past events'
      });
    }

    // Check for departmental event eligibility
    if (event.eventType === 'departmental' && 
        event.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'This event is only for students of ' + event.department
      });
    }

    // Check if already registered
    const existingTicket = await Ticket.findOne({
      eventId,
      userId: req.user._id
    });

    if (existingTicket) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    // Create ticket with unique ID
    const ticketData = {
      eventId,
      userId: req.user._id,
      qrCode: '' // Will be set after ticket creation
    };

    const ticket = new Ticket(ticketData);

    // Generate QR code containing ONLY the ticket ID (security best practice)
    const qrCode = await generateQRCode(ticket.ticketId);
    ticket.qrCode = qrCode;

    await ticket.save();

    // Increment registered count
    await Event.findByIdAndUpdate(eventId, {
      $inc: { registeredCount: 1 }
    });

    // Populate for response
    await ticket.populate('eventId', 'title date time venue bannerUrl department eventType');
    await ticket.populate('userId', 'name rollNumber department');

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { ticket }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tickets/my-tickets
 * @desc    Get all tickets for current user
 * @access  Private
 */
const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ userId: req.user._id })
      .populate('eventId', 'title date time venue status bannerUrl department eventType')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tickets.length,
      data: { tickets }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tickets/:ticketId
 * @desc    Get ticket by ID
 * @access  Private
 */
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.ticketId })
      .populate('eventId')
      .populate('userId', 'name rollNumber department');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Only ticket owner can view full ticket details
    if (ticket.userId._id.toString() !== req.user._id.toString() &&
        req.user.role !== 'organizer') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this ticket'
      });
    }

    res.json({
      success: true,
      data: { ticket }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/tickets/verify
 * @desc    Verify ticket QR code at event entry
 * @access  Private (Organizer only)
 * 
 * This is the main entry verification endpoint:
 * 1. Scans QR code (contains only ticketId)
 * 2. Validates ticket exists and is unused
 * 3. Validates ticket is for correct event
 * 4. Marks ticket as USED
 * 5. Records attendance
 */
const verifyTicket = async (req, res, next) => {
  try {
    const { ticketId, eventId } = req.body;

    if (!ticketId || !eventId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID and Event ID are required'
      });
    }

    // Find ticket
    const ticket = await Ticket.findOne({ ticketId })
      .populate('userId', 'name rollNumber department')
      .populate('eventId', 'title organizerId');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Invalid ticket',
        verification: { valid: false, reason: 'TICKET_NOT_FOUND' }
      });
    }

    // Verify ticket belongs to correct event
    if (ticket.eventId._id.toString() !== eventId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket is not for this event',
        verification: { valid: false, reason: 'WRONG_EVENT' }
      });
    }

    // Verify organizer owns this event
    if (ticket.eventId.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify tickets for this event'
      });
    }

    // Check if ticket is already used
    if (ticket.status === Ticket.TICKET_STATUS.USED) {
      return res.status(400).json({
        success: false,
        message: 'Ticket already used',
        verification: {
          valid: false,
          reason: 'ALREADY_USED',
          usedAt: ticket.usedAt
        }
      });
    }

    // Check if ticket is cancelled
    if (ticket.status === Ticket.TICKET_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: 'Ticket is cancelled',
        verification: { valid: false, reason: 'CANCELLED' }
      });
    }

    // Mark ticket as used
    await ticket.markAsUsed();

    // Record attendance
    await Attendance.create({
      eventId,
      userId: ticket.userId._id,
      ticketId: ticket._id,
      verifiedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Entry verified successfully',
      verification: {
        valid: true,
        attendee: {
          name: ticket.userId.name,
          rollNumber: ticket.userId.rollNumber,
          department: ticket.userId.department
        },
        entryTime: ticket.usedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tickets/:ticketId/download
 * @desc    Download ticket as PDF
 * @access  Private
 */
const downloadTicketPDF = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.ticketId })
      .populate('eventId')
      .populate('userId', 'name rollNumber department');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Only ticket owner can download
    if (ticket.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this ticket'
      });
    }

    // Generate PDF
    const pdfBuffer = await generateTicketPDF(ticket);

    // Set response headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=ticket-${ticket.ticketId}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tickets/:ticketId/preview
 * @desc    Preview ticket as PDF (inline for iframe viewing)
 * @access  Private
 */
const previewTicketPDF = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.ticketId })
      .populate('eventId')
      .populate('userId', 'name rollNumber department');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Only ticket owner can preview
    if (ticket.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this ticket'
      });
    }

    // Generate PDF
    const pdfBuffer = await generateTicketPDF(ticket);

    // Set response headers for inline PDF viewing
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=ticket-${ticket.ticketId}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerForEvent,
  getMyTickets,
  getTicketById,
  verifyTicket,
  downloadTicketPDF,
  previewTicketPDF
};
