const mongoose = require('mongoose');
const { ROLES, USER_STATUS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: { type: String, trim: true },

    password: { type: String, required: true, select: false },
    passwordLastChanged: { type: Date, default: Date.now },
    tokenVersion: { type: Number, default: 0 },

    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE
    },

    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    refreshTokens: [{ type: String, select: false }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

userSchema.index({ branchId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

userSchema.methods.isLocked = function () {
  return !!(this.lockedUntil && this.lockedUntil.getTime() > Date.now());
};

userSchema.methods.toSafeJSON = function () {
  return {
    _id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    branchId: this.branchId,
    status: this.status,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
