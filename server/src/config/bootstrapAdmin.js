const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ROLES, USER_STATUS } = require('./constants');

const MAX_ADMIN_SLOTS = 3;

// Up to 3 Super Admin accounts, each sourced from a numbered env slot:
//   ADMIN_1_EMAIL / ADMIN_1_PASSWORD
//   ADMIN_2_EMAIL / ADMIN_2_PASSWORD
//   ADMIN_3_EMAIL / ADMIN_3_PASSWORD
// Falls back to the legacy ADMIN_EMAIL / ADMIN_PASSWORD as slot 1 if no
// numbered slots are set, so existing .env files keep working.
function readAdminSlots() {
  const slots = [];
  for (let i = 1; i <= MAX_ADMIN_SLOTS; i++) {
    const email = process.env[`ADMIN_${i}_EMAIL`];
    const password = process.env[`ADMIN_${i}_PASSWORD`];
    if (email && password) slots.push({ email: email.toLowerCase(), password });
  }

  if (slots.length === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    slots.push({ email: process.env.ADMIN_EMAIL.toLowerCase(), password: process.env.ADMIN_PASSWORD });
  }

  return slots;
}

// There is no public registration route for SUPER_ADMIN - accounts are
// sourced entirely from .env. This runs on every server start: it creates
// each configured admin on first run, and re-hashes/updates one if its
// password in .env has changed since the DB record was last synced.
async function syncAdminAccount(email, password) {
  let admin = await User.findOne({ email, role: ROLES.SUPER_ADMIN }).select('+password +refreshTokens');

  if (!admin) {
    const emailTakenByOther = await User.findOne({ email });
    if (emailTakenByOther) {
      console.warn(`Skipping admin bootstrap for ${email}: email already belongs to a non-admin account`);
      return;
    }

    await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email,
      password: await bcrypt.hash(password, 10),
      role: ROLES.SUPER_ADMIN,
      status: USER_STATUS.ACTIVE
    });
    console.log(`Super Admin bootstrapped: ${email}`);
    return;
  }

  let changed = false;

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
    console.log(`Super Admin credentials synced from .env: ${email}`);
  }
}

async function ensureSuperAdmins() {
  const slots = readAdminSlots();

  if (slots.length === 0) {
    console.warn('No ADMIN_n_EMAIL / ADMIN_n_PASSWORD set - skipping Super Admin bootstrap');
    return;
  }

  for (const slot of slots) {
    await syncAdminAccount(slot.email, slot.password);
  }
}

module.exports = { ensureSuperAdmins };
