/**
 * File Storage Service (MongoDB GridFS)
 *
 * Centralized storage abstraction for binary files.
 * - No filesystem usage.
 * - Stores file bytes in MongoDB via GridFS.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const getBucket = (bucketName) => {
  if (!bucketName) {
    throw new Error('bucket is required');
  }

  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error('MongoDB connection is not ready (mongoose.connection.db is missing)');
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName });
};

/**
 * Save a buffer into GridFS.
 *
 * @param {Object} params
 * @param {string} params.bucket - GridFS bucket name
 * @param {string} params.filename - Stored filename (informational)
 * @param {string} params.contentType - MIME type
 * @param {Buffer} params.buffer - File data
 * @param {Object} [params.metadata] - Arbitrary metadata stored alongside file
 * @returns {Promise<{fileId: mongoose.Types.ObjectId}>}
 */
const saveBuffer = async ({ bucket, filename, contentType, buffer, metadata = {} }) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('buffer must be a Buffer');
  }

  const gridfs = getBucket(bucket);
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const uploadStream = gridfs.openUploadStream(filename, {
      contentType,
      metadata
    });

    uploadStream.on('error', (error) => {
      logger.error('gridfs.upload.failed', {
        bucket,
        filename,
        contentType,
        sizeBytes: buffer.length,
        metadata,
        durationMs: Date.now() - startedAt,
        error,
      });
      reject(error);
    });

    uploadStream.on('finish', () => {
      logger.info('gridfs.upload.completed', {
        bucket,
        filename,
        contentType,
        fileId: uploadStream.id?.toString?.() || uploadStream.id,
        sizeBytes: buffer.length,
        metadata,
        durationMs: Date.now() - startedAt,
      });
      resolve({ fileId: uploadStream.id });
    });

    uploadStream.end(buffer);
  });
};

/**
 * Delete a file from GridFS.
 *
 * @param {Object} params
 * @param {string} params.bucket
 * @param {string|mongoose.Types.ObjectId} params.fileId
 */
const deleteFile = async ({ bucket, fileId }) => {
  if (!fileId) return;

  const gridfs = getBucket(bucket);
  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  const startedAt = Date.now();

  try {
    await gridfs.delete(objectId);
    logger.info('gridfs.delete.completed', {
      bucket,
      fileId: objectId.toString(),
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error('gridfs.delete.failed', {
      bucket,
      fileId: objectId.toString(),
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }
};

/**
 * Open a download stream for a GridFS file.
 *
 * @param {Object} params
 * @param {string} params.bucket
 * @param {string|mongoose.Types.ObjectId} params.fileId
 * @returns {import('stream').Readable}
 */
const openDownloadStream = ({ bucket, fileId }) => {
  const gridfs = getBucket(bucket);
  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  logger.info('gridfs.download.opened', {
    bucket,
    fileId: objectId.toString(),
  });

  return gridfs.openDownloadStream(objectId);
};

module.exports = {
  saveBuffer,
  deleteFile,
  openDownloadStream
};
