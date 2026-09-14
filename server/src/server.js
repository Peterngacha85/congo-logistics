require('dotenv').config();
const createApp = require('./app');
const { connectDatabase } = require('./config/database');
const { ensureSuperAdmin } = require('./config/bootstrapAdmin');

const PORT = process.env.API_PORT || 5000;

async function start() {
  await connectDatabase();
  await ensureSuperAdmin();
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
