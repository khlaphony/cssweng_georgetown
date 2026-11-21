// imports
const { createApplication } = require('../models/applyModel');
const { deleteUploadedFiles } = require('../middleware/upload');

// handler: runs after upload + validation middleware have succeeded
async function submitApplication(req, res) {
  try {
    const result = await createApplication(req.validated, req.files);

    if (result.status === 'duplicate') {
      await deleteUploadedFiles(req.files);
      return res.status(409).json({
        ok: false,
        error: 'An application with this email for this position already exists.',
      });
    }

    return res.status(201).json({
      ok: true,
      message: 'Application submitted successfully!',
      id: result.id,
    });
  } catch (err) {
    console.error('Submit application error:', err);
    await deleteUploadedFiles(req.files); // no orphaned files if the DB fails
    return res.status(500).json({ ok: false, error: 'Server error. Please try again.' });
  }
}

// export
module.exports = { submitApplication };