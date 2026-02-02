/**
 * User Controller
 * Handles profile operations for the authenticated user
 */

const User = require('../models/User.model');
const imageService = require('../services/imageService');

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

module.exports = {
  getMe,
  updateMe
};
