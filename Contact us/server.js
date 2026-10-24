const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Data file for storing contact submissions
const DATA_FILE = path.join(__dirname, 'data', 'contacts.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// POST - Handle contact form submission
app.post('/api/contact', (req, res) => {
  try {
    const { contactName, companyName, email, mobileNumber, message } = req.body;

    // Basic validation
    if (!contactName || !email || !mobileNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    // Read existing contacts
    const contacts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    // Create new contact entry
    const newContact = {
      id: Date.now(),
      contactName,
      companyName: companyName || 'N/A',
      email,
      mobileNumber,
      message,
      submittedAt: new Date().toISOString()
    };

    // Save contact
    contacts.push(newContact);
    fs.writeFileSync(DATA_FILE, JSON.stringify(contacts, null, 2));

    console.log(`New contact submission from: ${contactName} (${email})`);

    res.status(200).json({
      success: true,
      message: 'Thank you for contacting Georgetown Electrical Systems! We will get back to you shortly.'
    });

  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
});

// GET - Retrieve all contact submissions (admin endpoint)
app.get('/api/contacts', (req, res) => {
  try {
    const contacts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    console.error('Error reading contacts:', error);
    res.status(500).json({ success: false, message: 'Error retrieving contacts.' });
  }
});

// Serve the contact page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🔌 Georgetown Electrical Systems server running at:`);
  console.log(`   http://localhost:${PORT}\n`);
});
