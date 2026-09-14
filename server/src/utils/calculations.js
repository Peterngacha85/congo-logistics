const { SERVICE_FEE_RATE } = require('../config/constants');

// subtotal = rate + diesel + mileage; serviceFee = 5% of subtotal; total = subtotal + serviceFee
function calculateTotals({ transportationRate, dieselPerTrip, mileageCash }) {
  const subtotal = (transportationRate || 0) + (dieselPerTrip || 0) + (mileageCash || 0);
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const totalAmount = subtotal + serviceFee;

  return { subtotal, serviceFee, totalAmount };
}

module.exports = { calculateTotals };
