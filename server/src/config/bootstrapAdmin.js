const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ROLES, USER_STATUS } = require('./constants');

// The Super Admin has no public registration route - it is a single account
// sourced from ADMIN_EMAIL / ADMIN_PASSWORD in .env. This runs on every server
// start so the DB record always matches whatever is currently in .env: it
// creates the account on first run, and re-hashes/updates it if the email or
// password in .env has changed since the DB record was last synced.
async function ensureSuperAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set - skipping Super Admin bootstrap');
    return;
  }

  const normalizedEmail = email.toLowerCase();
  let admin = await User.findOne({ role: ROLES.SUPER_ADMIN }).select('+password +refreshTokens');

  if (!admin) {
    admin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      role: ROLES.SUPER_ADMIN,
      status: USER_STATUS.ACTIVE
    });
    console.log(`Super Admin bootstrapped: ${normalizedEmail}`);
    return;
  }

  let changed = false;

  if (admin.email !== normalizedEmail) {
    admin.email = normalizedEmail;
    changed = true;
  }

  const passwordMatches = await bcrypt.compare(password, admin.password);
  if (!passwordMatches) {
    admin.password = await bcrypt.hash(password, 10);
    admin.passwordLastChanged = new Date();
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    admin.refreshTokens = [];
    changed = true;
  }

  if (admin.status !== USER_STATUS.ACTIVE) {
    admin.status = USER_STATUS.ACTIVE;
    changed = true;
  }

  if (changed) {
    await admin.save();
    console.log(`Super Admin credentials synced from .env: ${normalizedEmail}`);
  }
}

module.exports = { ensureSuperAdmin };
