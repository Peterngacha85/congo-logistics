const Trip = require('../models/Trip');
const Invoice = require('../models/Invoice');

function branchSuffix(branch) {
  const code = branch.branchCode || 'GEN';
  return code.split('-')[0].toUpperCase();
}

// Generates TRIP-<year>-<seq>-<branchSuffix>, retrying on rare collisions
// (sequence is derived from a count, so concurrent creates could clash).
async function generateTripNumber(branch) {
  const year = new Date().getFullYear();
  const suffix = branchSuffix(branch);
  const prefix = `TRIP-${year}-`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await Trip.countDocuments({
      branchId: branch._id,
      tripNumber: { $regex: `^${prefix}` }
    });
    const seq = String(count + 1 + attempt).padStart(3, '0');
    const candidate = `${prefix}${seq}-${suffix}`;
    const exists = await Trip.exists({ tripNumber: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Failed to generate unique trip number');
}

async function generateInvoiceNumber(branch) {
  const year = new Date().getFullYear();
  const suffix = branchSuffix(branch);
  const prefix = `INV-${year}-`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await Invoice.countDocuments({
      branchId: branch._id,
      invoiceNumber: { $regex: `^${prefix}` }
    });
    const seq = String(count + 1 + attempt).padStart(3, '0');
    const candidate = `${prefix}${seq}-${suffix}`;
    const exists = await Invoice.exists({ invoiceNumber: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Failed to generate unique invoice number');
}

module.exports = { generateTripNumber, generateInvoiceNumber };
