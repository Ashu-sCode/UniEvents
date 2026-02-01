/* eslint-disable no-console */
/**
 * Migration: Local uploads -> MongoDB GridFS
 *
 * Usage (from repo root):
 *   node backend/scripts/migrateUploadsToGridFS.js
 *
 * Requirements:
 * - MONGODB_URI must be set (either in backend/.env or environment)
 * - Existing local files must still exist under backend/uploads/
 */

const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');

// Load backend env (optional)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Event = require('../src/models/Event.model');
const Certificate = require('../src/models/Certificate.model');
const fileStorageService = require('../src/services/fileStorageService');

const guessContentType = (filename) => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
};

const toBackendPath = (maybeUrlPath) => {
  // Accept:
  //  - /uploads/...
  //  - uploads/...
  // Convert to backend/<that path>
  const clean = maybeUrlPath.startsWith('/') ? maybeUrlPath.slice(1) : maybeUrlPath;
  return path.join(__dirname, '..', clean);
};

const migrateEventBanners = async () => {
  const events = await Event.find({
    bannerUrl: { $regex: '^/?uploads/event-banners/' }
  });

  let migrated = 0;
  let skipped = 0;

  for (const event of events) {
    try {
      const localPath = toBackendPath(event.bannerUrl);

      let buffer;
      try {
        buffer = await fs.readFile(localPath);
      } catch {
        console.warn(`[migrate:banners] Missing file for event ${event._id}: ${localPath}`);
        skipped++;
        continue;
      }

      const filename = path.basename(localPath);
      const { fileId } = await fileStorageService.saveBuffer({
        bucket: 'event-banners',
        filename,
        contentType: guessContentType(filename),
        buffer,
        metadata: {
          kind: 'event-banner',
          eventId: event._id.toString(),
          migratedFrom: event.bannerUrl
        }
      });

      event.bannerFileId = fileId;
      event.bannerUrl = `/api/files/event-banners/${fileId.toString()}`;
      await event.save();

      migrated++;
      console.log(`[migrate:banners] Migrated event ${event._id} -> ${event.bannerUrl}`);
    } catch (err) {
      console.error(`[migrate:banners] Error migrating event ${event._id}:`, err);
      skipped++;
    }
  }

  return { migrated, skipped, total: events.length };
};

const migrateCertificates = async () => {
  const certificates = await Certificate.find({
    filePath: { $regex: '^/?uploads/certificates/' },
    $or: [{ pdfFileId: null }, { pdfFileId: { $exists: false } }]
  });

  let migrated = 0;
  let skipped = 0;

  for (const cert of certificates) {
    try {
      const localPath = toBackendPath(cert.filePath);

      let buffer;
      try {
        buffer = await fs.readFile(localPath);
      } catch {
        console.warn(`[migrate:certs] Missing file for certificate ${cert.certificateId}: ${localPath}`);
        skipped++;
        continue;
      }

      const filename = path.basename(localPath);
      const { fileId } = await fileStorageService.saveBuffer({
        bucket: 'certificates',
        filename,
        contentType: 'application/pdf',
        buffer,
        metadata: {
          kind: 'certificate',
          certificateId: cert.certificateId,
          eventId: cert.eventId?.toString(),
          userId: cert.userId?.toString(),
          migratedFrom: cert.filePath
        }
      });

      cert.pdfFileId = fileId;
      // Keep filePath temporarily (deprecated) to support rollback/verification.
      await cert.save();

      migrated++;
      console.log(`[migrate:certs] Migrated ${cert.certificateId} -> pdfFileId=${fileId.toString()}`);
    } catch (err) {
      console.error(`[migrate:certs] Error migrating ${cert.certificateId}:`, err);
      skipped++;
    }
  }

  return { migrated, skipped, total: certificates.length };
};

const main = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const bannerResult = await migrateEventBanners();
  const certResult = await migrateCertificates();

  console.log('--- Migration summary ---');
  console.log('Event banners:', bannerResult);
  console.log('Certificates:', certResult);

  await mongoose.disconnect();
  console.log('✅ Disconnected');
};

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});
