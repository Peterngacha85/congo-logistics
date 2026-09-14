const { Server } = require('socket.io');
const { verifyToken, ACCESS_COOKIE } = require('../utils/tokens');
const { ROLES } = require('./constants');

// Minimal "name=value; name2=value2" cookie header parser - avoids pulling in
// a full cookie-parsing dependency just to read one cookie off the handshake.
function parseCookieHeader(header) {
  const result = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  });
  return result;
}

let io = null;

function adminRoom() {
  return 'admins';
}

function branchRoom(branchId) {
  return `branch:${branchId}`;
}

function userRoom(userId) {
  return `user:${userId}`;
}

// Auth handshake mirrors requireAuth: reads the same HTTP-only access-token
// cookie the REST API uses, so a logged-in browser tab gets a socket for free.
function authenticateSocket(socket, next) {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) return next(new Error('No authentication token provided'));

    const cookies = parseCookieHeader(rawCookie);
    const token = cookies[ACCESS_COOKIE];
    if (!token) return next(new Error('No authentication token provided'));

    const decoded = verifyToken(token);
    if (decoded.type === 'refresh') return next(new Error('Invalid session token'));

    socket.user = {
      userId: decoded.userId,
      role: decoded.role,
      branchId: decoded.branchId
    };
    next();
  } catch (error) {
    next(new Error('Invalid or expired session'));
  }
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
      credentials: true
    }
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const { user } = socket;
    socket.join(userRoom(user.userId));

    if (user.role === ROLES.SUPER_ADMIN) {
      socket.join(adminRoom());
    } else if (user.branchId) {
      socket.join(branchRoom(user.branchId));
    }
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.IO not initialized - call initSocket first');
  return io;
}

// Fire-and-forget emitters - safe to call even if a target room has nobody in
// it (Socket.IO no-ops). Each takes a small payload; the client refetches the
// relevant data over REST rather than trusting the socket payload as truth.
function emitToAdmins(event, payload) {
  if (!io) return;
  io.to(adminRoom()).emit(event, payload);
}

function emitToBranch(branchId, event, payload) {
  if (!io || !branchId) return;
  io.to(branchRoom(branchId)).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
}

// Convenience: notify both admins and the owning branch in one call, for
// events either side needs to react to (e.g. trip lifecycle changes).
function emitToAdminsAndBranch(branchId, event, payload) {
  emitToAdmins(event, payload);
  emitToBranch(branchId, event, payload);
}

module.exports = {
  initSocket,
  getIo,
  emitToAdmins,
  emitToBranch,
  emitToUser,
  emitToAdminsAndBranch
};
