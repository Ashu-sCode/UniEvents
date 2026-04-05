/**
 * User Model
 * Stores student and organizer information
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { roles, password: passwordConfig } = require('../config/auth.config');

const approvalStatuses = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [passwordConfig.minLength, `Password must be at least ${passwordConfig.minLength} characters`],
    select: false // Don't include password in queries by default
  },
  rollNumber: {
    type: String,
    trim: true,
    // Required for students, optional for organizers
    sparse: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(roles),
    default: roles.STUDENT
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  profilePhotoUrl: {
    type: String,
    default: null
  },
  profilePhotoFileId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  idCardUrl: {
    type: String,
    default: null
  },
  idCardFileId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  approvalStatus: {
    type: String,
    enum: Object.values(approvalStatuses),
    default: approvalStatuses.APPROVED
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tokenVersion: {
    type: Number,
    default: 0
  },

  // Password reset (hashed token only)
  resetPasswordToken: {
    type: String,
    default: null,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
    select: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
// userSchema.index({ email: 1 });
// userSchema.index({ rollNumber: 1 });
userSchema.index({ department: 1, role: 1 });

/**
 * Hash password before saving
 */
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(passwordConfig.saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password for login
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} - True if password matches
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Get public profile (without sensitive data)
 */
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    rollNumber: this.rollNumber,
    department: this.department,
    phone: this.phone,
    profilePhotoUrl: this.profilePhotoUrl,
    role: this.role,
    approvalStatus: this.approvalStatus || approvalStatuses.APPROVED,
    rejectionReason: this.rejectionReason,
    idCardUrl: this.idCardUrl,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.approvalStatuses = approvalStatuses;
