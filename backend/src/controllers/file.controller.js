/**
 * File Controller
 * Streams files stored in MongoDB GridFS.
 */

const mongoose = require('mongoose');
const fileStorageService = require('../services/fileStorageService');

const ALLOWED_BUCKETS = new Set(['event-banners', 'profile-photos', 'certificates']);

const streamFile = async (req, res, next) => {
  try {
    const { bucket, fileId } = req.params;

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bucket'
      });
    }

    // Guardrail: certificates must not be served from this public route.
    if (bucket === 'certificates') {
      return res.status(403).json({
        success: false,
        message: 'Certificates are not publicly accessible'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fileId'
      });
    }

    // Load file document for headers (contentType, length)
    const filesCollection = mongoose.connection.db.collection(`${bucket}.files`);
    const fileDoc = await filesCollection.findOne({ _id: new mongoose.Types.ObjectId(fileId) });

    if (!fileDoc) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.set('Content-Type', fileDoc.contentType || 'application/octet-stream');
    if (typeof fileDoc.length === 'number') {
      res.set('Content-Length', fileDoc.length.toString());
    }

    // Cache banners aggressively (immutable) since filename is effectively content-addressed by ObjectId
    res.set('Cache-Control', 'public, max-age=31536000, immutable');

    const downloadStream = fileStorageService.openDownloadStream({ bucket, fileId: fileDoc._id });

    downloadStream.on('error', (err) => {
      // GridFS emits an error if file chunks are missing, etc.
      next(err);
    });

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  streamFile
};
