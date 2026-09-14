require('dotenv').config();
const http = require('http');
const createApp = require('./app');
const { connectDatabase } = require('./config/database');
const { ensureSuperAdmins } = require('./config/bootstrapAdmin');
const { initSocket } = require('./config/socket');

const PORT = process.env.API_PORT || 5000;

async function start() {
  await connectDatabase();
  await ensureSuperAdmins();
  const app = createApp();
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
