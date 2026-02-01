/**
 * Image Service
 *
 * Handles image processing for event banners.
 * - Resizes images to optimal width
 * - Converts to WebP format for better compression
 * - Stores output in MongoDB GridFS (no local filesystem writes)
 */

const sharp = require('sharp');
const mongoose = require('mongoose');
const fileStorageService = require('./fileStorageService');

// Configuration
const CONFIG = {
  maxWidth: 1200,
  quality: 80,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSize: 300 * 1024, // 300KB before processing
  outputFormat: 'webp'
};

/**
 * Process and save an event banner image to GridFS
 *
 * @param {Buffer} imageBuffer - Raw image buffer from upload
 * @param {string} eventId - Event ID
 * @param {string} originalMimetype - Original file mimetype
 * @returns {Promise<Object>} Result with fileId + URL + metadata
 */
const processEventBanner = async (imageBuffer, eventId, originalMimetype) => {
  try {
    // Validate mimetype
    if (!CONFIG.allowedTypes.includes(originalMimetype)) {
      throw new Error(`Invalid file type. Allowed: ${CONFIG.allowedTypes.join(', ')}`);
    }

    // Process image with Sharp
    const processedBuffer = await sharp(imageBuffer)
      .resize(CONFIG.maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: CONFIG.quality })
      .toBuffer();

    // Get metadata
    const metadata = await sharp(processedBuffer).metadata();

    // Upload to GridFS
    const filename = `banner-${eventId}-${Date.now()}.webp`;
    const { fileId } = await fileStorageService.saveBuffer({
      bucket: 'event-banners',
      filename,
      contentType: 'image/webp',
      buffer: processedBuffer,
      metadata: {
        kind: 'event-banner',
        eventId: eventId,
        originalMimetype,
        width: metadata.width,
        height: metadata.height
      }
    });

    console.log(`[ImageService] Stored banner in GridFS: ${filename} (${metadata.width}x${metadata.height})`);

    return {
      success: true,
      fileId,
      url: `/api/files/event-banners/${fileId.toString()}`,
      filename,
      width: metadata.width,
      height: metadata.height,
      size: processedBuffer.length
    };
  } catch (error) {
    console.error('[ImageService] Error processing banner:', error);
    throw error;
  }
};

/**
 * Delete an event banner from GridFS
 *
 * @param {string|mongoose.Types.ObjectId} fileId
 * @returns {Promise<boolean>} True if deleted, false if missing/invalid
 */
const deleteEventBannerByFileId = async (fileId) => {
  try {
    if (!fileId) return false;

    const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
    if (!mongoose.Types.ObjectId.isValid(objectId)) return false;

    await fileStorageService.deleteFile({ bucket: 'event-banners', fileId: objectId });
    return true;
  } catch (error) {
    // GridFS delete throws if not found; treat as non-fatal for cleanup paths
    if (error?.message?.includes('FileNotFound')) return false;
    throw error;
  }
};

/**
 * Validate image before processing
 *
 * @param {Object} file - Multer file object
 * @returns {Object} Validation result
 */
const validateImage = (file) => {
  const errors = [];

  // Check file exists
  if (!file) {
    return { valid: false, errors: ['No file provided'] };
  }

  // Check mimetype
  if (!CONFIG.allowedTypes.includes(file.mimetype)) {
    errors.push(`Invalid file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP`);
  }

  // Check file size (before processing)
  const maxSizeKB = CONFIG.maxFileSize / 1024;
  if (file.size > CONFIG.maxFileSize * 10) { // Allow up to 3MB before processing
    errors.push(`File too large. Maximum: ${maxSizeKB * 10}KB`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get image metadata
 *
 * @param {Buffer|string} image - Image buffer
 * @returns {Promise<Object>} Image metadata
 */
const getImageMetadata = async (image) => {
  try {
    const metadata = await sharp(image).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size
    };
  } catch (error) {
    console.error('[ImageService] Error getting metadata:', error);
    throw error;
  }
};

/**
 * Generate a thumbnail for preview
 *
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {number} width - Thumbnail width
 * @returns {Promise<Buffer>} Thumbnail buffer
 */
const generateThumbnail = async (imageBuffer, width = 400) => {
  return sharp(imageBuffer)
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();
};

module.exports = {
  processEventBanner,
  deleteEventBannerByFileId,
  validateImage,
  getImageMetadata,
  generateThumbnail,
  CONFIG
};
