const mongoose = require('mongoose');
const User = require('../models/User.model');
const { approvalStatuses } = require('../models/User.model');
const { roles } = require('../config/auth.config');
const fileStorageService = require('../services/fileStorageService');

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
  approveUser,
  rejectUser,
  updateUserActiveState,
  streamUserIdCard,
};
