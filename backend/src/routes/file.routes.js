/**
 * File Routes
 * Streams files stored in MongoDB GridFS.
 */

const express = require('express');
const router = express.Router();

const fileController = require('../controllers/file.controller');

// Public route (banners only; certificates are blocked in controller)
router.get('/:bucket/:fileId', fileController.streamFile);

module.exports = router;
