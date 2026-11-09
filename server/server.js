const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('./db'); // loads server/.env too

const app = express();
const root = path.join(__dirname, '..');
const uploadRoot = process.env.UPLOAD_DIR || path.join(root, 'uploads');
const uploadDirs = {
  resume: path.join(uploadRoot, 'resumes'),
  citizenship: path.join(uploadRoot, 'citizenship'),
};
Object.values(uploadDirs).forEach(d => fs.mkdirSync(d, { recursive: true }));

app.use(express.json());

// ---------- Static site ----------
['assets', 'css', 'js'].forEach(d =>
  app.use('/' + d, express.static(path.join(root, d))));

['index', 'products', 'services', 'contactus', 'apply'].forEach(page => {
  const file = path.join(root, `${page}.html`);
  if (!fs.existsSync(file)) return; // skip pages that aren't built yet
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

// ---------- Product inquiry form ----------
app.post('/api/inquiry', async (req, res) => {
  const contactName = clean(req.body.contactName);
  const companyName = clean(req.body.companyName) || null;
  const email = clean(req.body.email);
  const mobileNumber = clean(req.body.mobileNumber);

  if (!contactName || !emailOk(email) || !/^\+?[\d\s()-]{7,}$/.test(mobileNumber)) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  try {
    await pool.execute(
      `INSERT INTO product_inquiries (contact_name, company_name, email, mobile_number)
       VALUES (?, ?, ?, ?)`,
      [contactName, companyName, email, mobileNumber]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ---------- Apply form (resume + proof of citizenship) ----------
const POSITIONS = ['electrical-engineer', 'field-technician', 'project-manager', 'administrative-staff'];
const RESUME_EXT = ['.pdf', '.doc', '.docx'];
const PROOF_EXT = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDirs[file.fieldname]),
    filename: (req, file, cb) =>
      cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: (req, file, cb) => {
  if (!uploadDirs[file.fieldname]) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  }
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = file.fieldname === 'citizenship' ? PROOF_EXT : RESUME_EXT;
  cb(null, allowed.includes(ext));
},
});

const uploadFiles = upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'citizenship', maxCount: 1 },
]);

app.post('/api/apply', uploadFiles, async (req, res) => {
  const resume = req.files?.resume?.[0];
  const citizenship = req.files?.citizenship?.[0];
  const discard = () =>
    [resume, citizenship].forEach(f => f && fs.unlink(f.path, () => {}));

  const fullName = clean(req.body.fullName);
  const email = clean(req.body.email);
  const mobile = clean(req.body.mobile);
  const position = clean(req.body.position);
  const message = clean(req.body.message) || null;

  if (!resume) {
    discard();
    return res.status(400).json({ error: 'Please upload your resume as a PDF or Word file.' });
  }
  if (!citizenship) {
    discard();
    return res.status(400).json({ error: 'Please upload your proof of citizenship (PDF, Word, JPG or PNG).' });
  }
  if (!fullName || !emailOk(email) || !mobile || !POSITIONS.includes(position)) {
    discard();
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  try {
    await pool.execute(
      `INSERT INTO applications
       (full_name, email, mobile, position,
        resume_path, resume_original, resume_mime, resume_size,
        citizenship_path, citizenship_original, citizenship_mime, citizenship_size,
        message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, mobile, position,
       resume.path, resume.originalname, resume.mimetype, resume.size,
       citizenship.path, citizenship.originalname, citizenship.mimetype, citizenship.size,
       message]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    discard();
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ---------- 404 for anything unmatched ----------
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// ---------- Upload and server errors ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.code, err.field);
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'Each file must be 5 MB or smaller.'
      : 'Upload failed.';
    return res.status(400).json({ error: msg });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));