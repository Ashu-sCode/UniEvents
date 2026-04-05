/**
 * User Controller
 * Handles profile operations for the authenticated user
 */

const User = require('../models/User.model');
const imageService = require('../services/imageService');
const mongoose = require('mongoose');
const fileStorageService = require('../services/fileStorageService');

/**
 * @route   GET /api/users/me
 * @desc    Get current user's profile
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is attached by authenticate middleware
    res.json({
      success: true,
      data: {
        user: req.user.toPublicJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/users/me
 * @desc    Update current user's profile (name/phone/department/profile photo)
 * @access  Private
 */
const updateMe = async (req, res, next) => {
  try {
    const { name, phone, department } = req.body;

    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only allow updating specific fields
    if (name !== undefined) user.name = name;
    if (department !== undefined) user.department = department;

    if (phone !== undefined) {
      const normalized = String(phone).trim();
      user.phone = normalized.length ? normalized : null;
    }

    // Optional profile photo upload
    if (req.file) {
      try {
        const oldPhotoFileId = user.profilePhotoFileId;

        const result = await imageService.processProfilePhoto(
          req.file.buffer,
          user._id.toString(),
          req.file.mimetype
        );

        user.profilePhotoFileId = result.fileId;
        user.profilePhotoUrl = result.url;

        // Best-effort cleanup
        if (oldPhotoFileId) {
          try {
            await imageService.deleteProfilePhotoByFileId(oldPhotoFileId);
          } catch (err) {
            console.error('Error deleting old profile photo:', err);
          }
        }
      } catch (imgError) {
        console.error('Error processing profile photo:', imgError);
        // Do not fail the profile update if image processing fails
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

const streamOwnIdCard = async (req, res, next) => {
  try {
    if (!req.user?.idCardFileId) {
      return res.status(404).json({
        success: false,
        message: 'ID card not found'
      });
    }

    const fileId =
      typeof req.user.idCardFileId === 'string'
        ? new mongoose.Types.ObjectId(req.user.idCardFileId)
        : req.user.idCardFileId;

    const filesCollection = mongoose.connection.db.collection('id-cards.files');
    const fileDoc = await filesCollection.findOne({ _id: fileId });

    if (!fileDoc) {
      return res.status(404).json({
        success: false,
        message: 'ID card file not found'
      });
    }

    res.set('Content-Type', fileDoc.contentType || 'application/octet-stream');
    if (typeof fileDoc.length === 'number') {
      res.set('Content-Length', fileDoc.length.toString());
    }
    res.set('Cache-Control', 'private, max-age=60');

    const downloadStream = fileStorageService.openDownloadStream({ bucket: 'id-cards', fileId });
    downloadStream.on('error', next);
    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe,
  streamOwnIdCard
};
