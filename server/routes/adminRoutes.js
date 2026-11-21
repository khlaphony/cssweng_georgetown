const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const auth = require('../utils/auth');

const router = express.Router();
const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');

/* ---------- login throttle (5 failed attempts per 15 min per IP) ---------- */
const attempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isBlocked(ip) {
  const a = attempts.get(ip);
  if (!a) return false;
  if (a.resetAt < Date.now()) { attempts.delete(ip); return false; }
  return a.count >= MAX_ATTEMPTS;
}
function recordFailure(ip) {
  const a = attempts.get(ip);
  if (!a || a.resetAt < Date.now()) attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  else a.count += 1;
}

/* ---------- login / logout (public) ---------- */
router.post('/login', async (req, res) => {
  const ip = req.ip;
  if (isBlocked(ip)) {
    return res.status(429).json({ ok: false, message: 'Too many attempts. Try again in a few minutes.' });
  }

  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  try {
    const [rows] = await pool.execute(
      'SELECT username, password_hash FROM admins WHERE username = ? LIMIT 1',
      [username]
    );
    const admin = rows[0];
    if (!admin || !auth.verifyPassword(password, admin.password_hash)) {
      recordFailure(ip);
      return res.status(401).json({ ok: false, message: 'Incorrect username or password.' });
    }
    attempts.delete(ip);
    const token = auth.createSession(admin.username);
    res.setHeader('Set-Cookie', auth.sessionCookie(token));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Server error. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  auth.destroySession(req);
  res.setHeader('Set-Cookie', auth.clearCookie);
  res.json({ ok: true });
});

/* ---------- everything below needs an admin session ---------- */
router.use('/admin', auth.requireAdmin);

// List applications
router.get('/admin/applications', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id,
              full_name  AS fullName,
              email,
              mobile,
              position,
              message,
              created_at AS createdAt
       FROM applications
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Server error.' });
  }
});

// Delete an application (and its uploaded files)
router.delete('/admin/applications/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ ok: false, message: 'Invalid id.' });

  try {
    const [rows] = await pool.execute(
      'SELECT resume_path, citizenship_path FROM applications WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ ok: false, message: 'Not found.' });

    await pool.execute('DELETE FROM applications WHERE id = ?', [id]);

    [rows[0].resume_path, rows[0].citizenship_path].forEach((p) => {
      const file = safeUploadPath(p);
      if (file) fs.unlink(file, () => {}); // ignore errors if already gone
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Server error.' });
  }
});

// Open / closed status
router.get('/admin/applications/status', async (req, res) => {
  try {
    res.json({ open: await getApplicationsOpen() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Server error.' });
  }
});

router.post('/admin/applications/status', async (req, res) => {
  if (typeof req.body.open !== 'boolean') {
    return res.status(400).json({ ok: false, message: 'Invalid value.' });
  }
  try {
    await pool.execute(
      `INSERT INTO settings (setting_key, setting_value) VALUES ('applications_open', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [req.body.open ? '1' : '0']
    );
    res.json({ ok: true, open: req.body.open });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Server error.' });
  }
});

// Download an uploaded file (admin only)
router.get('/admin/applications/:id/files/:kind', async (req, res) => {
  const id = Number(req.params.id);
  const kind = req.params.kind;
  if (!Number.isInteger(id) || !['resume', 'citizenship'].includes(kind)) {
    return res.status(400).json({ ok: false, message: 'Invalid request.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT ${kind}_path AS filePath, ${kind}_original AS originalName
       FROM applications WHERE id = ?`,
      [id]
    );
    const row = rows[0];
    const file = row && safeUploadPath(row.filePath);
    if (!file || !fs.existsSync(file)) {
      return res.status(404).json({ ok: false, message: 'File not found.' });
    }
    res.download(file, row.originalName || path.basename(file));
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Server error.' });
  }
});

/* ---------- helpers ---------- */

// Only allow paths that resolve inside the uploads folder
function safeUploadPath(stored) {
  if (!stored) return null;
  const resolved = path.resolve(uploadsRoot, stored);
  return resolved.startsWith(uploadsRoot + path.sep) ? resolved : null;
}

async function getApplicationsOpen() {
  const [rows] = await pool.execute(
    "SELECT setting_value FROM settings WHERE setting_key = 'applications_open'"
  );
  return rows.length === 0 ? true : rows[0].setting_value === '1';
}

// Used by the apply route to reject submissions while closed
async function requireApplicationsOpen(req, res, next) {
  try {
    if (await getApplicationsOpen()) return next();
    res.status(403).json({ ok: false, error: 'Applications are currently closed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error.' });
  }
}

module.exports = router;
module.exports.requireApplicationsOpen = requireApplicationsOpen;