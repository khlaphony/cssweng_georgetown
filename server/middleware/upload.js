// imports
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const crypto = require('crypto');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { matchesSignature } = require('../utils/fileSignature');

// constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file
const DOC_EXTS = ['.pdf'];

// private folder, outside every express.static directory
const uploadRoot = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

// per-field rules: folder, label shown to the user, allowed extensions
const FIELD_RULES = {
  resume: { dir: 'resumes', label: 'Resume', exts: DOC_EXTS },
  citizenship: { dir: 'citizenship', label: 'Proof of citizenship', exts: DOC_EXTS },
};

// browser-reported MIME types accepted for each extension
const MIME_BY_EXT = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg', 'image/pjpeg'],
  '.jpeg': ['image/jpeg', 'image/pjpeg'],
};

Object.values(FIELD_RULES).forEach((rule) =>
  fs.mkdirSync(path.join(uploadRoot, rule.dir), { recursive: true, mode: 0o700 })
);

// error type for rejected files, so we can answer with a clear 400
class UploadError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

// helper: delete every uploaded file (safe to call with undefined)
async function deleteUploadedFiles(files) {
  const all = Object.values(files || {}).flat();
  await Promise.all(all.map((f) => fsp.unlink(f.path).catch(() => {})));
}

// helper: strip any directory part from the client's filename (traversal guard)
function safeOriginalName(name) {
  return path.basename(String(name || '')).slice(0, 255);
}

// multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(uploadRoot, FIELD_RULES[file.fieldname].dir)),
  // server-generated name; ext is already whitelisted by fileFilter
  filename: (req, file, cb) =>
    cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 2, fields: 20, fieldSize: 16 * 1024 },
  fileFilter: (req, file, cb) => {
    const rule = FIELD_RULES[file.fieldname];
    if (!rule) return cb(new UploadError('Unexpected file upload.', 'file'));

    const ext = path.extname(file.originalname).toLowerCase();
    const formats = rule.exts.map((e) => e.slice(1).toUpperCase()).join(', ');

    if (!rule.exts.includes(ext)) {
      return cb(new UploadError(`${rule.label} must be a ${formats} file.`, file.fieldname));
    }
    if (!MIME_BY_EXT[ext].includes(file.mimetype)) {
      return cb(new UploadError(`${rule.label} has an invalid file type.`, file.fieldname));
    }
    cb(null, true);
  },
});

const parseFiles = upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'citizenship', maxCount: 1 },
]);

// middleware 1: run multer, turn its errors into JSON 400 responses
function handleUploads(req, res, next) {
  parseFiles(req, res, async (err) => {
    if (!err) return next();

    await deleteUploadedFiles(req.files);

    if (err instanceof UploadError) {
      return res.status(400).json({ ok: false, error: err.message, errors: { [err.field]: err.message } });
    }

    if (err instanceof multer.MulterError) {
      const label = FIELD_RULES[err.field]?.label || 'File';
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? `${label} must be 5 MB or smaller.`
        : err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT' ? 'Unexpected file upload.'
        : 'Upload failed.';
      return res.status(400).json({ ok: false, error: message, errors: { [err.field || 'file']: message } });
    }

    console.error('Upload error:', err);
    return res.status(500).json({ ok: false, error: 'Upload failed. Please try again.' });
  });
}

// middleware 2: confirm each saved file's real bytes match its extension
async function verifySignatures(req, res, next) {
  try {
    const files = Object.values(req.files || {}).flat();

    for (const file of files) {
      const ext = path.extname(file.filename).toLowerCase();

      if (!(await matchesSignature(file.path, ext))) {
        await deleteUploadedFiles(req.files);
        const label = FIELD_RULES[file.fieldname].label;
        const message = `${label} is not a valid ${ext.slice(1).toUpperCase()} file.`;
        return res.status(400).json({ ok: false, error: message, errors: { [file.fieldname]: message } });
      }

      // trusted MIME type derived from the verified extension (not from the browser)
      file.verifiedMime = MIME_BY_EXT[ext][0];
    }
    next();
  } catch (err) {
    console.error('Signature check error:', err);
    await deleteUploadedFiles(req.files);
    res.status(500).json({ ok: false, error: 'Upload failed. Please try again.' });
  }
}

// export: use as router.post('/', ...uploadApplicationFiles, ...)
module.exports = {
  uploadApplicationFiles: [handleUploads, verifySignatures],
  deleteUploadedFiles,
  safeOriginalName,
  uploadRoot,
};