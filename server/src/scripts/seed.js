require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../config/database');
const { ensureSuperAdmin } = require('../config/bootstrapAdmin');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Trip = require('../models/Trip');
const { calculateTotals } = require('../utils/calculations');
const { ROLES } = require('../config/constants');

async function seed() {
  await connectDatabase();

  // Only clear branch-manager users; Super Admin is sourced from .env, not seed data.
  await User.deleteMany({ role: ROLES.BRANCH_MANAGER });
  await Branch.deleteMany({});
  await Trip.deleteMany({});
  await ensureSuperAdmin();

  const branches = await Branch.insertMany([
    {
      branchCode: 'KIN-001',
      branchName: 'Kinshasa Hub',
      location: 'Kinshasa',
      address: 'Avenue Kasavubu, Kinshasa',
      isActive: true
    },
    {
      branchCode: 'LUB-001',
      branchName: 'Lubumbashi Terminal',
      location: 'Lubumbashi',
      address: 'Rue Bakaike, Lubumbashi',
      isActive: true
    }
  ]);

  const managerPassword = await bcrypt.hash('Manager123!', 10);
  const managers = await User.insertMany([
    {
      firstName: 'John',
      lastName: 'Manager',
      email: 'john@test.com',
      password: managerPassword,
      role: 'BRANCH_MANAGER',
      branchId: branches[0]._id,
      status: 'ACTIVE'
    },
    {
      firstName: 'Jane',
      lastName: 'Manager',
      email: 'jane@test.com',
      password: managerPassword,
      role: 'BRANCH_MANAGER',
      branchId: branches[1]._id,
      status: 'ACTIVE'
    }
  ]);

  await Branch.findByIdAndUpdate(branches[0]._id, { managerId: managers[0]._id });
  await Branch.findByIdAndUpdate(branches[1]._id, { managerId: managers[1]._id });

  const totals = calculateTotals({
    transportationRate: 1000000,
    dieselPerTrip: 500000,
    mileageCash: 200000
  });

  await Trip.create({
    tripNumber: 'TRIP-2024-001-KIN',
    truckNumber: '1093AX05',
    trailerNumber: 'TR-001',
    transporterName: 'Ahmed Hassan',
    loadingPoint: 'Kinshasa Port',
    offloadingPoint: 'Lubumbashi Warehouse',
    dateLoaded: new Date('2024-01-10'),
    dateOffloaded: new Date('2024-01-12'),
    transportationRate: 1000000,
    dieselPerTrip: 500000,
    mileageCash: 200000,
    serviceFee: totals.serviceFee,
    totalAmount: totals.totalAmount,
    status: 'PENDING',
    statusHistory: [{ status: 'PENDING', changedAt: new Date(), changedBy: managers[0]._id }],
    branchId: branches[0]._id,
    createdBy: managers[0]._id
  });

  console.log('Database seeded successfully!');
  console.log('\nTest Credentials:');
  console.log(`Super Admin - Email: ${process.env.ADMIN_EMAIL}, Password: (from .env) - login at /api/v1/admin/auth/login`);
  console.log('Manager 1 (Kinshasa) - Email: john@test.com, Password: Manager123!');
  console.log('Manager 2 (Lubumbashi) - Email: jane@test.com, Password: Manager123!');

  await mongoose.connection.close();
}

seed().catch((error) => {
  console.error('Seed error:', error);
  process.exit(1);
});
