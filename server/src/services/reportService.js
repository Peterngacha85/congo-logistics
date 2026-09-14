const Trip = require('../models/Trip');
const Branch = require('../models/Branch');
const { TRIP_STATUS_ORDER } = require('../config/constants');

function dateRangeQuery(branchId, dateFrom, dateTo) {
  const query = {};
  if (branchId) query.branchId = branchId;
  if (dateFrom || dateTo) {
    query.dateLoaded = {};
    if (dateFrom) query.dateLoaded.$gte = new Date(dateFrom);
    if (dateTo) query.dateLoaded.$lte = new Date(dateTo);
  }
  return query;
}

async function getBranchSummary(branchId, dateFrom, dateTo) {
  const branch = await Branch.findById(branchId).populate('managerId', 'firstName lastName');
  const query = dateRangeQuery(branchId, dateFrom, dateTo);
  const trips = await Trip.find(query);

  const completedOrLater = trips.filter((t) =>
    ['COMPLETED', 'INVOICED', 'PAID'].includes(t.status)
  );

  const totalRevenue = completedOrLater.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const dieselTotal = completedOrLater.reduce((sum, t) => sum + (t.dieselPerTrip || 0), 0);
  const mileageTotal = completedOrLater.reduce((sum, t) => sum + (t.mileageCash || 0), 0);
  const serviceFeeTotal = completedOrLater.reduce((sum, t) => sum + (t.serviceFee || 0), 0);
  const netProfit = totalRevenue - dieselTotal - mileageTotal - serviceFeeTotal;

  const byStatus = {};
  TRIP_STATUS_ORDER.forEach((status) => {
    byStatus[status] = trips.filter((t) => t.status === status).length;
  });

  const byTransporter = {};
  trips.forEach((t) => {
    if (!byTransporter[t.transporterName]) {
      byTransporter[t.transporterName] = { name: t.transporterName, trips: 0, revenue: 0 };
    }
    byTransporter[t.transporterName].trips += 1;
    byTransporter[t.transporterName].revenue += t.totalAmount || 0;
  });
  const topTransporters = Object.values(byTransporter)
    .sort((a, b) => b.trips - a.trips)
    .slice(0, 10);

  return {
    branch: branch
      ? {
          _id: branch._id,
          branchName: branch.branchName,
          manager: branch.managerId
            ? `${branch.managerId.firstName} ${branch.managerId.lastName}`
            : null
        }
      : null,
    period: { from: dateFrom, to: dateTo },
    summary: {
      totalTrips: trips.length,
      completedTrips: completedOrLater.length,
      totalRevenue,
      totalExpenses: { diesel: dieselTotal, mileage: mileageTotal, serviceFees: serviceFeeTotal },
      netProfit,
      averageTripValue: completedOrLater.length ? Math.round(totalRevenue / completedOrLater.length) : 0
    },
    byStatus,
    topTransporters
  };
}

async function getCompanyOverview(dateFrom, dateTo) {
  const branches = await Branch.find({});
  const branchBreakdown = [];

  let totalTrips = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const branch of branches) {
    const summary = await getBranchSummary(branch._id, dateFrom, dateTo);
    totalTrips += summary.summary.totalTrips;
    totalRevenue += summary.summary.totalRevenue;
    const expenses =
      summary.summary.totalExpenses.diesel +
      summary.summary.totalExpenses.mileage +
      summary.summary.totalExpenses.serviceFees;
    totalExpenses += expenses;

    branchBreakdown.push({
      branchName: branch.branchName,
      trips: summary.summary.totalTrips,
      revenue: summary.summary.totalRevenue,
      expenses,
      profit: summary.summary.netProfit
    });
  }

  const topBranch = [...branchBreakdown].sort((a, b) => b.profit - a.profit)[0] || null;

  return {
    period: { from: dateFrom, to: dateTo },
    totalTrips,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    branchBreakdown,
    topPerformers: {
      branch: topBranch ? topBranch.branchName : null
    }
  };
}

async function getOutstandingInvoices({ branchId, transporterId, overdueOnly }) {
  const query = { status: 'INVOICED' };
  if (branchId) query.branchId = branchId;
  if (transporterId) query.transporterId = transporterId;

  const trips = await Trip.find(query).select(
    'tripNumber invoiceNumber transporterName totalAmount approvedAt'
  );

  const now = new Date();
  const DUE_DAYS = 30;

  let data = trips.map((t) => {
    const dueDate = t.approvedAt ? new Date(t.approvedAt.getTime() + DUE_DAYS * 86400000) : null;
    const daysOverdue = dueDate ? Math.max(0, Math.floor((now - dueDate) / 86400000)) : 0;
    return {
      invoiceNumber: t.invoiceNumber,
      transporterName: t.transporterName,
      tripNumber: t.tripNumber,
      amount: t.totalAmount,
      invoiceDate: t.approvedAt,
      dueDate,
      daysOverdue,
      status: daysOverdue > 0 ? 'OVERDUE' : 'ISSUED'
    };
  });

  if (overdueOnly) {
    data = data.filter((d) => d.daysOverdue > 0);
  }

  const totalOutstanding = data.reduce((sum, d) => sum + d.amount, 0);
  const overdue = data.filter((d) => d.status === 'OVERDUE');

  return {
    data,
    summary: {
      totalOutstanding,
      invoiceCount: data.length,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((sum, d) => sum + d.amount, 0)
    }
  };
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  });
  return lines.join('\n');
}

module.exports = { getBranchSummary, getCompanyOverview, getOutstandingInvoices, toCsv };
