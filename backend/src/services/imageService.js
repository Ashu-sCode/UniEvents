/**
 * Image Service
 * 
 * Handles image processing for event banners.
 * - Resizes images to optimal width
 * - Converts to WebP format for better compression
 * - Validates file types and sizes
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const CONFIG = {
  maxWidth: 1200,
  quality: 80,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSize: 300 * 1024, // 300KB before processing
  outputFormat: 'webp'
};

// Banner storage directory
const BANNERS_DIR = path.join(__dirname, '../../uploads/event-banners');

/**
 * Process and save an event banner image
 * 
 * @param {Buffer} imageBuffer - Raw image buffer from upload
 * @param {string} eventId - Event ID for filename
 * @param {string} originalMimetype - Original file mimetype
 * @returns {Promise<Object>} Result with file path and metadata
 */
const processEventBanner = async (imageBuffer, eventId, originalMimetype) => {
  try {
    // Validate mimetype
    if (!CONFIG.allowedTypes.includes(originalMimetype)) {
      throw new Error(`Invalid file type. Allowed: ${CONFIG.allowedTypes.join(', ')}`);
    }

    // Ensure directory exists
    await ensureBannersDirectory();

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `banner-${eventId}-${timestamp}.webp`;
    const filePath = path.join(BANNERS_DIR, filename);
    const relativeUrl = `/uploads/event-banners/${filename}`;

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

    // Save to disk
    await fs.writeFile(filePath, processedBuffer);

    console.log(`[ImageService] Processed banner: ${filename} (${metadata.width}x${metadata.height})`);

    return {
      success: true,
      url: relativeUrl,
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
 * Delete an event banner
 * 
 * @param {string} bannerUrl - Relative URL of the banner to delete
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
const deleteEventBanner = async (bannerUrl) => {
  try {
    if (!bannerUrl) return false;

    const filename = path.basename(bannerUrl);
    const filePath = path.join(BANNERS_DIR, filename);

    await fs.unlink(filePath);
    console.log(`[ImageService] Deleted banner: ${filename}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`[ImageService] Banner not found: ${bannerUrl}`);
      return false;
    }
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
 * @param {Buffer|string} image - Image buffer or file path
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
 * Ensure banners directory exists
 */
const ensureBannersDirectory = async () => {
  try {
    await fs.access(BANNERS_DIR);
  } catch {
    await fs.mkdir(BANNERS_DIR, { recursive: true });
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
  deleteEventBanner,
  validateImage,
  getImageMetadata,
  generateThumbnail,
  CONFIG
};
