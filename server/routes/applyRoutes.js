// imports
const express = require('express');
const upload = require('../server/server');
const { submitApplication } = require('../controllers/applyController');

// router
const router = express.Router();

// routes definitions
// / == POST /api/apply since this router is mounted at /api/apply in server.js
router.post(
  '/',
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'citizenship', maxCount: 1 },
  ]),
  submitApplication
);

// export
module.exports = router;