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