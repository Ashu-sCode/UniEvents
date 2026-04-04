/**
 * Ticket Controller
 * Handles ticket generation, QR verification, and entry management
 */

const Event = require('../models/Event.model');
const Ticket = require('../models/Ticket.model');
const Attendance = require('../models/Attendance.model');
const { generateQRCode } = require('../utils/qrGenerator');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const logger = require('../utils/logger');

const promoteNextWaitlistedTicket = async (eventId) => {
  const nextWaitlisted = await Ticket.findOne({
    eventId,
    status: Ticket.TICKET_STATUS.WAITLISTED,
  }).sort({ waitlistedAt: 1, createdAt: 1 });

  if (!nextWaitlisted) {
    return null;
  }

  nextWaitlisted.status = Ticket.TICKET_STATUS.UNUSED;
  nextWaitlisted.promotedAt = new Date();
  await nextWaitlisted.save();

  await Event.findByIdAndUpdate(eventId, {
    $inc: {
      registeredCount: 1,
      waitlistCount: -1,
    },
  });

  await nextWaitlisted.populate('eventId', 'title date time venue bannerUrl department eventType');
  await nextWaitlisted.populate('userId', 'name rollNumber department email');

  return nextWaitlisted;
};

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
    const isWaitlistRegistration = event.registeredCount >= event.seatLimit;

    if (isWaitlistRegistration && !event.waitlistEnabled) {
      return res.status(400).json({
        success: false,
        message: 'No seats available and waitlist is closed'
      });
    }

    const ticketData = {
      eventId,
      userId: req.user._id,
      qrCode: '', // Will be set after ticket creation
      status: isWaitlistRegistration ? Ticket.TICKET_STATUS.WAITLISTED : Ticket.TICKET_STATUS.UNUSED,
      waitlistedAt: isWaitlistRegistration ? new Date() : null,
    };

    const ticket = new Ticket(ticketData);

    // Generate QR code containing ONLY the ticket ID (security best practice)
    const qrCode = await generateQRCode(ticket.ticketId);
    ticket.qrCode = qrCode;

    await ticket.save();

    // Increment confirmed registrations or waitlist count
    await Event.findByIdAndUpdate(eventId, {
      $inc: isWaitlistRegistration ? { waitlistCount: 1 } : { registeredCount: 1 }
    });

    // Populate for response
    await ticket.populate('eventId', 'title date time venue bannerUrl department eventType');
    await ticket.populate('userId', 'name rollNumber department');

    const waitlistPosition = isWaitlistRegistration
      ? await Ticket.countDocuments({
          eventId,
          status: Ticket.TICKET_STATUS.WAITLISTED,
          waitlistedAt: { $lte: ticket.waitlistedAt },
        })
      : null;

    res.status(201).json({
      success: true,
      message: isWaitlistRegistration ? 'Added to waitlist successfully' : 'Registration successful',
      data: {
        ticket,
        registrationType: isWaitlistRegistration ? 'waitlist' : 'confirmed',
        waitlistPosition,
      }
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
    const { page, limit, status, search } = req.query;

    const hasPagination = page !== undefined || limit !== undefined;
    const parsedPage = Math.max(1, parseInt(page || '1', 10));
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit || '10', 10)));

    const baseQuery = { userId: req.user._id };
    if (status) {
      baseQuery.status = status;
    }
    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      baseQuery.ticketId = new RegExp(escaped, 'i');
    }

    const total = await Ticket.countDocuments(baseQuery);

    let cursor = Ticket.find(baseQuery)
      .populate('eventId', 'title date time venue status bannerUrl department eventType')
      .sort({ createdAt: -1 });

    if (hasPagination) {
      cursor = cursor.skip((parsedPage - 1) * parsedLimit).limit(parsedLimit);
    }

    const tickets = await cursor;

    const totalPages = hasPagination ? Math.max(1, Math.ceil(total / parsedLimit)) : 1;

    res.json({
      success: true,
      count: tickets.length,
      total,
      page: hasPagination ? parsedPage : 1,
      totalPages,
      limit: hasPagination ? parsedLimit : total,
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
  const startedAt = Date.now();
  try {
    const { ticketId, eventId } = req.body;
    const scanContext = {
      ticketId,
      eventId,
      organizerId: req.user?._id?.toString?.(),
    };

    if (!ticketId || !eventId) {
      logger.warn('ticket.verification.invalid_request', {
        ...scanContext,
        durationMs: Date.now() - startedAt,
      });
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
      logger.warn('ticket.verification.failed.not_found', {
        ...scanContext,
        durationMs: Date.now() - startedAt,
      });
      return res.status(404).json({
        success: false,
        message: 'Invalid ticket',
        verification: { valid: false, reason: 'TICKET_NOT_FOUND' }
      });
    }

    // Verify ticket belongs to correct event
    if (ticket.eventId._id.toString() !== eventId) {
      logger.warn('ticket.verification.failed.wrong_event', {
        ...scanContext,
        actualEventId: ticket.eventId._id.toString(),
        durationMs: Date.now() - startedAt,
      });
      return res.status(400).json({
        success: false,
        message: 'Ticket is not for this event',
        verification: { valid: false, reason: 'WRONG_EVENT' }
      });
    }

    // Verify organizer owns this event
    if (ticket.eventId.organizerId.toString() !== req.user._id.toString()) {
      logger.warn('ticket.verification.failed.unauthorized_organizer', {
        ...scanContext,
        ticketOwnerOrganizerId: ticket.eventId.organizerId.toString(),
        durationMs: Date.now() - startedAt,
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify tickets for this event'
      });
    }

    // Check if ticket is already used
    if (ticket.status === Ticket.TICKET_STATUS.USED) {
      logger.info('ticket.verification.rejected.already_used', {
        ...scanContext,
        attendeeId: ticket.userId._id.toString(),
        usedAt: ticket.usedAt,
        durationMs: Date.now() - startedAt,
      });
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
      logger.info('ticket.verification.rejected.cancelled', {
        ...scanContext,
        attendeeId: ticket.userId._id.toString(),
        durationMs: Date.now() - startedAt,
      });
      return res.status(400).json({
        success: false,
        message: 'Ticket is cancelled',
        verification: { valid: false, reason: 'CANCELLED' }
      });
    }

    if (ticket.status === Ticket.TICKET_STATUS.WAITLISTED) {
      logger.info('ticket.verification.rejected.waitlisted', {
        ...scanContext,
        attendeeId: ticket.userId._id.toString(),
        durationMs: Date.now() - startedAt,
      });
      return res.status(400).json({
        success: false,
        message: 'Ticket is still on the waitlist',
        verification: { valid: false, reason: 'WAITLISTED' }
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

    logger.info('ticket.verification.succeeded', {
      ...scanContext,
      attendeeId: ticket.userId._id.toString(),
      attendeeName: ticket.userId.name,
      durationMs: Date.now() - startedAt,
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
    logger.error('ticket.verification.failed.unexpected', {
      ticketId: req.body?.ticketId,
      eventId: req.body?.eventId,
      organizerId: req.user?._id?.toString?.(),
      durationMs: Date.now() - startedAt,
      error,
    });
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

/**
 * @route   PATCH /api/tickets/:ticketId/cancel
 * @desc    Cancel a registration ticket (organizer only, own event)
 * @access  Private (Organizer)
 */
const cancelTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findOne({ ticketId })
      .populate('eventId', 'organizerId registeredCount title')
      .populate('userId', 'name email rollNumber department');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Verify organizer owns this event
    const event = ticket.eventId;
    if (!event || event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel tickets for this event'
      });
    }

    // Idempotent behavior: already cancelled => success
    if (ticket.status === Ticket.TICKET_STATUS.CANCELLED) {
      return res.json({
        success: true,
        message: 'Ticket already cancelled',
        data: { ticket }
      });
    }

    // Disallow cancelling used tickets to keep attendance consistent
    if (ticket.status === Ticket.TICKET_STATUS.USED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a used ticket'
      });
    }

    const previousStatus = ticket.status;
    const wasConfirmedSeat = previousStatus === Ticket.TICKET_STATUS.UNUSED;

    // Cancel the ticket
    ticket.status = Ticket.TICKET_STATUS.CANCELLED;
    await ticket.save();

    let promotedTicket = null;

    // Update seat / waitlist counters and backfill next waitlisted attendee
    try {
      if (wasConfirmedSeat) {
        await Event.findByIdAndUpdate(ticket.eventId._id, { $inc: { registeredCount: -1 } });
        promotedTicket = await promoteNextWaitlistedTicket(ticket.eventId._id);
      } else if (previousStatus === Ticket.TICKET_STATUS.WAITLISTED) {
        await Event.findByIdAndUpdate(ticket.eventId._id, { $inc: { waitlistCount: -1 } });
      }
    } catch (e) {
      console.error('Error decrementing event registeredCount:', e);
    }

    res.json({
      success: true,
      message: promotedTicket ? 'Ticket cancelled and next waitlisted student promoted' : 'Ticket cancelled',
      data: { ticket, promotedTicket }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerForEvent,
  getMyTickets,
  getTicketById,
  verifyTicket,
  cancelTicket,
  downloadTicketPDF,
  previewTicketPDF
};
