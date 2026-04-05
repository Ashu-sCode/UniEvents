const User = require('../models/User.model');
const { approvalStatuses } = require('../models/User.model');
const { roles } = require('../config/auth.config');

const DEFAULT_DEV_ADMIN = {
  name: 'System Admin',
  email: 'admin@unievent.local',
  password: 'Admin@123',
  department: 'Administration',
};

const getAdminConfig = () => {
  const envConfig = {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    department: process.env.ADMIN_DEPARTMENT || 'Administration',
  };

  if (envConfig.email && envConfig.password) {
    return envConfig;
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return DEFAULT_DEV_ADMIN;
};

const ensureAdminAccount = async () => {
  const config = getAdminConfig();

  if (!config) {
    return { created: false, skipped: true, reason: 'missing_admin_env' };
  }

  const email = String(config.email).toLowerCase().trim();
  const existing = await User.findOne({ email }).select('_id role');

  if (existing) {
    if (existing.role !== roles.ADMIN) {
      throw new Error(`Bootstrap admin email ${email} is already used by a non-admin account.`);
    }

    return { created: false, skipped: true, reason: 'already_exists', email };
  }

  const admin = new User({
    name: config.name || DEFAULT_DEV_ADMIN.name,
    email,
    password: config.password,
    department: config.department || 'Administration',
    role: roles.ADMIN,
    approvalStatus: approvalStatuses.APPROVED,
    approvedAt: new Date(),
    isActive: true,
  });

  await admin.save();

  return { created: true, skipped: false, email };
};

module.exports = {
  ensureAdminAccount,
};
