const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('./db');

const app = express();
const root = path.join(__dirname, '..');
const uploadDir = process.env.UPLOAD_DIR || path.join(root, 'uploads', 'resumes');
fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.json());

// ---------- Static site ----------
['assets', 'css', 'js'].forEach(d =>
  app.use('/' + d, express.static(path.join(root, d))));

['index', 'products', 'services', 'contactus', 'apply'].forEach(page => {
  const file = path.join(root, `${page}.html`);
  app.get(`/${page}.html`, (req, res) => res.sendFile(file));
  if (page === 'index') app.get('/', (req, res) => res.sendFile(file));
});

// ---------- Helpers ----------
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const clean = v => (typeof v === 'string' ? v.trim() : '');

// ---------- Contact form ----------
app.post('/api/contact', async (req, res) => {
  const contactName = clean(req.body.contactName);
  const companyName = clean(req.body.companyName) || null;
  const email = clean(req.body.email);
  const mobileNumber = clean(req.body.mobileNumber);
  const message = clean(req.body.message);

  if (!contactName || !emailOk(email) || !mobileNumber || !message) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  try {
    await pool.execute(
      `INSERT INTO contact_messages
       (contact_name, company_name, email, mobile_number, message)
       VALUES (?, ?, ?, ?, ?)`,
      [contactName, companyName, email, mobileNumber, message]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ---------- Apply form (with resume) ----------
const POSITIONS = ['electrical-engineer', 'field-technician', 'project-manager', 'administrative-staff'];
const ALLOWED_EXT = ['.pdf', '.doc', '.docx'];

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) =>
      cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) =>
    cb(null, ALLOWED_EXT.includes(path.extname(file.originalname).toLowerCase())),
});

app.post('/api/apply', upload.single('resume'), async (req, res) => {
  const discard = () => req.file && fs.unlink(req.file.path, () => {});

  const fullName = clean(req.body.fullName);
  const email = clean(req.body.email);
  const mobile = clean(req.body.mobile);
  const position = clean(req.body.position);
  const message = clean(req.body.message) || null;

  if (!req.file) return res.status(400).json({ error: 'Please upload a PDF or Word resume.' });
  if (!fullName || !emailOk(email) || !mobile || !POSITIONS.includes(position)) {
    discard();
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  try {
    await pool.execute(
      `INSERT INTO applications
       (full_name, email, mobile, position, resume_path, resume_original, resume_mime, resume_size, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, mobile, position, req.file.path, req.file.originalname,
       req.file.mimetype, req.file.size, message]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    discard();
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ---------- Upload errors (e.g., file too big) ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Resume must be 5 MB or smaller.' : 'Upload failed.';
    return res.status(400).json({ error: msg });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));