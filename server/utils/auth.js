const crypto = require('crypto');

const sessions = new Map(); // token -> { username, expires }
const SESSION_MS = 2 * 60 * 60 * 1000; // 2 hours

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function readSid(req) {
  const match = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.cookie || '');
  return match ? match[1] : null;
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, expires: Date.now() + SESSION_MS });
  return token;
}

function getSession(req) {
  const sid = readSid(req);
  if (!sid) return null;
  const session = sessions.get(sid);
  if (!session || session.expires < Date.now()) {
    sessions.delete(sid);
    return null;
  }
  return session;
}

function destroySession(req) {
  const sid = readSid(req);
  if (sid) sessions.delete(sid);
}

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${secure}`;
}

const clearCookie = 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';

// Express middleware: block anything under it unless an admin is logged in
function requireAdmin(req, res, next) {
  if (!getSession(req)) {
    return res.status(401).json({ ok: false, message: 'Not logged in.' });
  }
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  destroySession,
  sessionCookie,
  clearCookie,
  requireAdmin,
};