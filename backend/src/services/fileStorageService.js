/**
 * File Storage Service (MongoDB GridFS)
 *
 * Centralized storage abstraction for binary files.
 * - No filesystem usage.
 * - Stores file bytes in MongoDB via GridFS.
 */

const mongoose = require('mongoose');

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

  return new Promise((resolve, reject) => {
    const uploadStream = gridfs.openUploadStream(filename, {
      contentType,
      metadata
    });

    uploadStream.on('error', reject);

    uploadStream.on('finish', () => {
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

  return gridfs.delete(objectId);
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

  return gridfs.openDownloadStream(objectId);
};

module.exports = {
  saveBuffer,
  deleteFile,
  openDownloadStream
};
