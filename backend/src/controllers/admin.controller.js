const mongoose = require('mongoose');
const User = require('../models/User.model');
const { approvalStatuses } = require('../models/User.model');
const { roles } = require('../config/auth.config');
const fileStorageService = require('../services/fileStorageService');
const Event = require('../models/Event.model');
const Ticket = require('../models/Ticket.model');
const Attendance = require('../models/Attendance.model');
const Certificate = require('../models/Certificate.model');
const notificationService = require('../services/notificationService');

const toReviewJson = (user) => ({
  ...user.toPublicJSON(),
  approvalMetadata: {
    approvedAt: user.approvedAt,
    approvedBy: user.approvedBy
      ? {
          id: user.approvedBy._id || user.approvedBy.id || user.approvedBy,
          name: user.approvedBy.name,
          email: user.approvedBy.email,
        }
      : null,
    rejectedAt: user.rejectedAt,
    rejectedBy: user.rejectedBy
      ? {
          id: user.rejectedBy._id || user.rejectedBy.id || user.rejectedBy,
          name: user.rejectedBy.name,
          email: user.rejectedBy.email,
        }
      : null,
    rejectionReason: user.rejectionReason,
  },
  hasIdCard: Boolean(user.idCardFileId),
});

const buildUserFilters = ({ role, approvalStatus, department, search }) => {
  const filter = {};

  if (role && role !== 'all') {
    filter.role = role;
  }

  if (approvalStatus && approvalStatus !== 'all') {
    filter.approvalStatus = approvalStatus;
  }

  if (department && department !== 'all') {
    filter.department = department;
  }

  if (search) {
    const searchRegex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { rollNumber: searchRegex },
      { department: searchRegex },
    ];
  }

  return filter;
};

const buildEventFilters = ({ status, department, search, organizerId }) => {
  const filter = {};

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (department && department !== 'all') {
    filter.department = department;
  }

  if (organizerId && organizerId !== 'all') {
    filter.organizerId = organizerId;
  }

  if (search) {
    const searchRegex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { venue: searchRegex },
      { department: searchRegex },
    ];
  }

  return filter;
};

const getSummary = async (req, res, next) => {
  try {
    const [pendingStudents, pendingOrganizers, approvedUsers, rejectedUsers, admins] = await Promise.all([
      User.countDocuments({ role: roles.STUDENT, approvalStatus: approvalStatuses.PENDING, isActive: true }),
      User.countDocuments({ role: roles.ORGANIZER, approvalStatus: approvalStatuses.PENDING, isActive: true }),
      User.countDocuments({ approvalStatus: approvalStatuses.APPROVED, isActive: true }),
      User.countDocuments({ approvalStatus: approvalStatuses.REJECTED }),
      User.countDocuments({ role: roles.ADMIN, isActive: true }),
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          pendingStudents,
          pendingOrganizers,
          approvedUsers,
          rejectedUsers,
          admins,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getEventSummaryJson = async (event) => {
  const [attendanceCount, certificateCount] = await Promise.all([
    Attendance.countDocuments({ eventId: event._id }),
    Certificate.countDocuments({ eventId: event._id }),
  ]);

  return {
    ...event.toObject({ virtuals: true }),
    attendanceCount,
    certificateCount,
    noShowCount: Math.max(0, event.registeredCount - attendanceCount),
  };
};

const listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 12)));
    const filter = buildUserFilters(req.query);

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email')
        .select('-password'),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: users.length,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      limit,
      data: {
        users: users.map(toReviewJson),
      },
    });
  } catch (error) {
    next(error);
  }
};

const listEvents = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const filter = buildEventFilters(req.query);

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('organizerId', 'name email department'),
      Event.countDocuments(filter),
    ]);

    const eventItems = await Promise.all(events.map(getEventSummaryJson));

    res.json({
      success: true,
      count: eventItems.length,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      limit,
      data: {
        events: eventItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getEventDetail = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId).populate('organizerId', 'name email department');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const [registrations, attendanceCount, certificateCount] = await Promise.all([
      Ticket.find({ eventId: event._id })
        .populate('userId', 'name email rollNumber department')
        .sort({ status: 1, createdAt: -1 }),
      Attendance.countDocuments({ eventId: event._id }),
      Certificate.countDocuments({ eventId: event._id }),
    ]);

    res.json({
      success: true,
      data: {
        event: {
          ...(await getEventSummaryJson(event)),
          registrations,
          registrationsCount: registrations.length,
          attendanceCount,
          certificateCount,
          waitlistCount: event.waitlistCount || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: toReviewJson(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

const approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === roles.ADMIN) {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts cannot be reviewed from this queue',
      });
    }

    user.approvalStatus = approvalStatuses.APPROVED;
    user.approvedAt = new Date();
    user.approvedBy = req.user._id;
    user.rejectedAt = null;
    user.rejectedBy = null;
    user.rejectionReason = null;
    user.isActive = true;
    user.tokenVersion += 1;

    await user.save();
    await user.populate('approvedBy', 'name email');

    res.json({
      success: true,
      message: 'User approved successfully',
      data: {
        user: toReviewJson(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

const rejectUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === roles.ADMIN) {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts cannot be reviewed from this queue',
      });
    }

    user.approvalStatus = approvalStatuses.REJECTED;
    user.rejectedAt = new Date();
    user.rejectedBy = req.user._id;
    user.rejectionReason = String(req.body.reason || '').trim();
    user.approvedAt = null;
    user.approvedBy = null;
    user.tokenVersion += 1;

    await user.save();
    await user.populate('rejectedBy', 'name email');

    res.json({
      success: true,
      message: 'User rejected successfully',
      data: {
        user: toReviewJson(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateUserActiveState = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === roles.ADMIN) {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts cannot be deactivated from this panel',
      });
    }

    const nextActiveState = Boolean(req.body.isActive);
    user.isActive = nextActiveState;
    user.tokenVersion += 1;
    await user.save();

    res.json({
      success: true,
      message: nextActiveState ? 'User account reactivated' : 'User account deactivated',
      data: {
        user: toReviewJson(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

const moderateEventStatus = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId).populate('organizerId', 'name email department');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    const nextStatus = String(req.body.status || '').trim();
    const allowedStatuses = [Event.EVENT_STATUS.CANCELLED, Event.EVENT_STATUS.PUBLISHED, Event.EVENT_STATUS.DRAFT];
    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Admin moderation supports only draft, published, or cancelled status',
      });
    }

    const previous = {
      status: event.status,
      date: event.date?.toISOString?.() || event.date,
      time: event.time,
      venue: event.venue,
      seatLimit: event.seatLimit,
    };

    event.status = nextStatus;
    await event.save();

    await notificationService.notifyEventAudience({
      event,
      previous,
    });

    await notificationService.createNotification({
      userId: event.organizerId?._id || event.organizerId,
      type:
        nextStatus === Event.EVENT_STATUS.CANCELLED
          ? 'event_cancelled'
          : 'event_updated',
      title: nextStatus === Event.EVENT_STATUS.CANCELLED ? 'Event moderated by admin' : 'Event status updated by admin',
      message:
        nextStatus === Event.EVENT_STATUS.CANCELLED
          ? `${event.title} was cancelled by admin moderation.`
          : `${event.title} was moved to ${nextStatus} by admin moderation.`,
      link: `/dashboard/organizer/events/${event._id}`,
      metadata: {
        eventId: event._id.toString(),
        moderatedBy: req.user._id.toString(),
        reason: req.body.reason || null,
      },
    });

    res.json({
      success: true,
      message: 'Event moderation applied successfully',
      data: {
        event: await getEventSummaryJson(event),
      },
    });
  } catch (error) {
    next(error);
  }
};

const sendAnnouncement = async (req, res, next) => {
  try {
    const {
      title,
      message,
      targetRole = 'all',
      department = 'all',
      link = null,
    } = req.body;

    const userFilter = { isActive: true };
    if (targetRole !== 'all') {
      userFilter.role = targetRole;
    }
    if (department && department !== 'all') {
      userFilter.department = department;
    }

    const recipients = await User.find(userFilter).select('_id');
    const recipientIds = recipients.map((user) => user._id.toString());

    await notificationService.notifyUsersAnnouncement({
      userIds: recipientIds,
      title,
      message,
      link,
      metadata: {
        targetRole,
        department,
        sentBy: req.user._id.toString(),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Announcement sent successfully',
      data: {
        recipientCount: recipientIds.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

const streamUserIdCard = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('name idCardFileId');

    if (!user || !user.idCardFileId) {
      return res.status(404).json({
        success: false,
        message: 'ID card not found',
      });
    }

    const fileId =
      typeof user.idCardFileId === 'string'
        ? new mongoose.Types.ObjectId(user.idCardFileId)
        : user.idCardFileId;

    const filesCollection = mongoose.connection.db.collection('id-cards.files');
    const fileDoc = await filesCollection.findOne({ _id: fileId });

    if (!fileDoc) {
      return res.status(404).json({
        success: false,
        message: 'ID card file not found',
      });
    }

    res.set('Content-Type', fileDoc.contentType || 'application/octet-stream');
    if (typeof fileDoc.length === 'number') {
      res.set('Content-Length', fileDoc.length.toString());
    }
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(user.name)}-id-card"`);
    res.set('Cache-Control', 'private, max-age=60');

    const downloadStream = fileStorageService.openDownloadStream({ bucket: 'id-cards', fileId });
    downloadStream.on('error', next);
    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  listUsers,
  getUserDetail,
  listEvents,
  getEventDetail,
  approveUser,
  rejectUser,
  updateUserActiveState,
  moderateEventStatus,
  sendAnnouncement,
  streamUserIdCard,
};
