// imports
const { body, matchedData, validationResult } = require('express-validator');
const { deleteUploadedFiles } = require('./upload');

const POSITIONS = ['electrical-engineer', 'field-technician', 'project-manager', 'administrative-staff'];
const MOBILE_REGEX = /^(\+63|0)\s?9\d{2}\s?\d{3}\s?\d{4}$/;
const NAME_REGEX = /^[\p{L}\p{M}'.\- ]+$/u;
const REQUIRED_FILES = {
  resume: 'Credentials document',
  citizenship: 'Citizenship ID',
};

// multer leaves req.body undefined on non-multipart requests in Express 5
function ensureBody(req, res, next) {
  req.body = req.body || {};
  next();
}

// field rules (sanitizers trim/convert; nothing is HTML-escaped because SQL is parameterized)
const rules = [
  body('fullName')
    .isString().withMessage('Full name is required.').bail()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2 to 100 characters.').bail()
    .matches(NAME_REGEX).withMessage('Full name contains invalid characters.'),

  body('email')
    .isString().withMessage('Email is required.').bail()
    .trim()
    .isLength({ max: 255 }).withMessage('Email is too long.').bail()
    .isEmail().withMessage('Please enter a valid email address.')
    .toLowerCase(),

  body('mobile')
    .isString().withMessage('Mobile number is required.').bail()
    .trim()
    .matches(MOBILE_REGEX).withMessage('Please enter a valid Philippine mobile number (e.g. +63 900 000 0000).'),

  body('position')
    .isString().withMessage('Please select a position.').bail()
    .trim()
    .isIn(POSITIONS).withMessage('Please select a valid position.'),

  body('message')
    .optional({ values: 'falsy' })
    .isString().withMessage('Message is invalid.').bail()
    .trim()
    .isLength({ max: 1000 }).withMessage('Message must be 1000 characters or fewer.'),
];

// final step: collect errors, check files exist, clean up on failure
async function handleValidation(req, res, next) {
  const errors = {};

  validationResult(req)
    .array({ onlyFirstError: true })
    .forEach((e) => { errors[e.path] = e.msg; });

  for (const [field, label] of Object.entries(REQUIRED_FILES)) {
    if (!req.files?.[field]?.[0]) errors[field] = `${label} is required.`;
  }

  if (Object.keys(errors).length > 0) {
    await deleteUploadedFiles(req.files);
    return res.status(400).json({ ok: false, error: Object.values(errors)[0], errors });
  }

  // whitelisted, sanitized values only; unexpected fields are dropped
  req.validated = matchedData(req, { locations: ['body'], includeOptionals: true });
  next();
}

// export: spread into a route, e.g. router.post('/', ...validateApplication, controller)
module.exports = { validateApplication: [ensureBody, ...rules, handleValidation] };