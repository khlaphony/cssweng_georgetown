const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('./db'); // loads server/.env
const auth = require('./utils/auth');


const app = express();
const root = path.join(__dirname, '..');

app.use(express.json());

// ---------- API routers ----------
app.use('/api/applications', require('./routes/applyRoutes'));
app.use('/api/applications', require('./routes/applyRoutes'));
app.use('/api', require('./routes/adminRoutes'));

// ---------- Static site ----------
// URLs are lowercase; match the real folder name whatever its case.
// Uploads live in /uploads (never served).
const rootEntries = fs.readdirSync(root);
['assets', 'css', 'js'].forEach((name) => {
  const actual = rootEntries.find((e) => e.toLowerCase() === name);
  if (actual) app.use('/' + name, express.static(path.join(root, actual)));
});


['index', 'products', 'services', 'contactus', 'apply'].forEach((page) => {
  const file = path.join(root, `${page}.html`);
  if (!fs.existsSync(file)) return;
  app.get(`/${page}.html`, (req, res) => res.sendFile(file));
  if (page === 'index') app.get('/', (req, res) => res.sendFile(file));
});

// ---------- Admin pages ----------
app.get('/login', (req, res) => {
  // already logged in? skip straight to the dashboard
  if (auth.getSession(req)) return res.redirect('/dashboard.html');
  res.sendFile(path.join(root, 'login.html'));
});

app.get('/dashboard.html', (req, res) => {
  if (!auth.getSession(req)) return res.redirect('/login');
  res.sendFile(path.join(root, 'dashboard.html'));
});

// ---------- Helpers ----------
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const clean = (v) => (typeof v === 'string' ? v.trim() : '');
// Phone: mobile or landline, e.g. 0917 123 4567, +63 917 123 4567, (02) 8123 4567
const phoneOk = (v) => /^\+?[\d\s()-]+$/.test(v) && /^\d{7,13}$/.test(v.replace(/\D/g, ''));
const CONTACT_TOPICS = ['quotation', 'services', 'products', 'careers', 'other'];

function readContactFields(body) {
  const b = body || {};
  const fields = {
    contactName: clean(b.contactName),
    companyName: clean(b.companyName),
    email: clean(b.email),
    mobileNumber: clean(b.mobileNumber),
    topic: clean(b.topic),
    message: clean(b.message),
  };
  const errors = {};

  if (!fields.contactName) errors.contactName = 'Please enter your name.';
  else if (fields.contactName.length > 150) errors.contactName = 'Name must be 150 characters or fewer.';

  if (fields.companyName.length > 150) errors.companyName = 'Company name must be 150 characters or fewer.';

  if (!fields.email && !fields.mobileNumber) {
    errors.email = 'Please enter an email address or a phone number so we can reply.';
  } else {
    if (fields.email && (!emailOk(fields.email) || fields.email.length > 255)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (fields.mobileNumber && !phoneOk(fields.mobileNumber)) {
      errors.mobileNumber = 'Please enter a valid phone number (e.g. 0917 123 4567 or (02) 8123 4567).';
    }
  }

  if (!CONTACT_TOPICS.includes(fields.topic)) errors.topic = 'Please choose a topic.';

  if (!fields.message) errors.message = 'Please enter a message.';
  else if (fields.message.length > 2000) errors.message = 'Message must be 2000 characters or fewer.';

  return { fields, errors };
}

function sendFieldErrors(res, errors) {
  return res.status(400).json({ ok: false, error: Object.values(errors)[0], errors });
}

// ---------- Contact form ----------
app.post('/api/contact', async (req, res) => {
  const { fields, errors } = readContactFields(req.body);
  if (Object.keys(errors).length > 0) return sendFieldErrors(res, errors);

  const { contactName, topic, message } = fields;
  const companyName = fields.companyName || null;
  const email = fields.email || null;
  const mobileNumber = fields.mobileNumber || null;

  try {
    await pool.execute(
      `INSERT INTO contact_messages
       (contact_name, company_name, email, mobile_number, topic, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [contactName, companyName, email, mobileNumber, topic, message]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// ---------- Error handler (upload errors are handled in middleware/upload.js) ----------
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'Invalid request body.' });
  }
  console.error(err);
  res.status(500).json({ ok: false, error: 'Server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));