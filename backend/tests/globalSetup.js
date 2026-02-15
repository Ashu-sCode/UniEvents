const path = require('path');
const os = require('os');
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  // Cache MongoDB binaries so they don't re-download on every run.
  // Use a deterministic location to maximize cache hits.
  const downloadDir =
    process.env.MONGOMS_DOWNLOAD_DIR || path.join(os.tmpdir(), 'unievent-mongo-binaries');

  process.env.MONGOMS_DOWNLOAD_DIR = downloadDir;

  const mongod = await MongoMemoryServer.create({
    binary: {
      downloadDir,
    },
    instance: {
      // On some Windows machines the initial launch can be slow.
      launchTimeout: 900000,
    },
  });

  global.__MONGOD__ = mongod;
  process.env.MONGO_URL = mongod.getUri();
};
