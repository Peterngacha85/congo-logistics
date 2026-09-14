require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');

async function reset() {
  const conn = await connectDatabase();
  await conn.dropDatabase();
  console.log('Database dropped.');
  await mongoose.connection.close();
}

reset().catch((error) => {
  console.error('Reset error:', error);
  process.exit(1);
});
