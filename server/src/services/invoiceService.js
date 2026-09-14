const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const INVOICES_DIR = path.join(__dirname, '..', '..', 'invoices');

function formatCDF(amount) {
  return `${Number(amount).toLocaleString('en-US')} CDF`;
}

function sanitizeForFilename(value) {
  return String(value).replace(/[^a-zA-Z0-9-_]/g, '');
}

// Renders the invoice as a PDF on disk and returns the path stored on the record.
async function generateInvoicePdf({ invoice, trip, approverName }) {
  if (!fs.existsSync(INVOICES_DIR)) {
    fs.mkdirSync(INVOICES_DIR, { recursive: true });
  }

  const filename = `INVOICE_${sanitizeForFilename(invoice.invoiceNumber)}_${sanitizeForFilename(
    trip.truckNumber
  )}_${new Date(invoice.invoiceDate).toISOString().slice(0, 10)}.pdf`;
  const absolutePath = path.join(INVOICES_DIR, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(absolutePath);
    doc.pipe(stream);

    doc.fontSize(20).fillColor('#0F766E').text('Congo Logistics', { align: 'left' });
    doc.fontSize(10).fillColor('black').text('Transportation Invoice');
    doc.moveDown();

    doc.fontSize(14).text(`Invoice: ${invoice.invoiceNumber}`);
    doc.fontSize(10).text(`Trip Number: ${trip.tripNumber}`);
    doc.text(`Invoice Date: ${new Date(invoice.invoiceDate).toDateString()}`);
    doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toDateString() : '-'}`);
    doc.moveDown();

    doc.fontSize(12).text('Trip Details', { underline: true });
    doc.fontSize(10);
    doc.text(`Truck Number: ${trip.truckNumber}`);
    doc.text(`Transporter: ${invoice.transporterName}`);
    doc.text(`Loading Point: ${trip.loadingPoint}`);
    doc.text(`Offloading Point: ${trip.offloadingPoint}`);
    doc.text(`Date Loaded: ${new Date(trip.dateLoaded).toDateString()}`);
    doc.text(`Date Offloaded: ${new Date(trip.dateOffloaded).toDateString()}`);
    doc.moveDown();

    doc.fontSize(12).text('Charges', { underline: true });
    doc.fontSize(10);
    invoice.lineItems.forEach((item) => {
      doc.text(`${item.description}: ${formatCDF(item.amount)}`);
    });
    doc.moveDown(0.5);
    doc.text(`Subtotal: ${formatCDF(invoice.subtotal)}`);
    doc.text(`Service Fee (5%): ${formatCDF(invoice.serviceFee)}`);
    doc.fontSize(13).fillColor('#0F766E').text(`Total Amount: ${formatCDF(invoice.totalAmount)}`);
    doc.fillColor('black');
    doc.moveDown();

    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Approved by: ${approverName || '-'}`);

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return `/invoices/${filename}`;
}

module.exports = { generateInvoicePdf, INVOICES_DIR };
