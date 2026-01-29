/**
 * Upload Middleware
 * 
 * Multer configuration for handling file uploads.
 * Supports event banner images with validation.
 */

const multer = require('multer');
const { CONFIG } = require('../services/imageService');

// Memory storage - we'll process with Sharp before saving
const storage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (req, file, cb) => {
  if (CONFIG.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP`), false);
  }
};

// Configure multer for event banner uploads
const eventBannerUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max (will be compressed by Sharp)
    files: 1
  }
});

// Configure multer for generic image uploads
const genericImageUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5
  }
});

/**
 * Middleware to handle multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size: 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

/**
 * Middleware for single banner image upload
 */
const uploadBanner = [
  eventBannerUpload.single('banner'),
  handleUploadError
];

/**
 * Middleware for optional banner upload (doesn't fail if no file)
 */
const uploadBannerOptional = [
  (req, res, next) => {
    eventBannerUpload.single('banner')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_UNEXPECTED_FILE') {
        // No file uploaded - that's okay
        return next();
      }
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      next();
    });
  }
];

module.exports = {
  eventBannerUpload,
  genericImageUpload,
  handleUploadError,
  uploadBanner,
  uploadBannerOptional
};
