// imports
const express = require('express');
const { submitApplication } = require('../controllers/applyController');
const { uploadApplicationFiles } = require('../middleware/upload');
const { validateApplication } = require('../middleware/validateApplication');

// router
const router = express.Router();

// mounted at /api/applications in server.js, so '/' is POST /api/applications
router.post(
  '/',
  ...uploadApplicationFiles, // multer + magic-byte checks
  ...validateApplication,    // form-field + files-present validation
  submitApplication          // transaction insert
);

// export
module.exports = router;