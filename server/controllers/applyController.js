// imports
const fs = require('fs/promises');
const { findDuplicate, createApplication } = require('../models/applyModel');

// constants
const ALLOWED_POSITIONS = [
  'electrical-engineer',
  'field-technician',
  'project-manager',
  'administrative-staff',
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^(\+63|0)\s?9\d{2}\s?\d{3}\s?\d{4}$/;
const MAX_MESSAGE_LENGTH = 1000;

// helper: delete uploaded files
// purpose: remove uploaded files if validation fails or duplication is found.
async function deleteUploadedFiles(files) {
  const allFiles = Object.values(files || {}).flat();

  await Promise.all(
    allFiles.map((file) => fs.unlink(file.path).catch(() => {}))
  );
}

// helper: validates application data
function validateApplication({
  fullName,
  email,
  mobile,
  position,
  message,
  resumeFile,
  citizenshipFile,
}) {
  if (fullName.length < 2 || fullName.length > 100) {
    return 'Full name must be between 2 and 100 characters.';
  }

  if (!EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address.';
  }

  if (!MOBILE_REGEX.test(mobile)) {
    return 'Please enter a valid Philippine mobile number (e.g. +63 900 000 0000).';
  }

  if (!ALLOWED_POSITIONS.includes(position)) {
    return 'Please select a valid position.';
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`;
  }

  if (!resumeFile) {
    return 'Resume / CV is required.';
  }

  if (!citizenshipFile) {
    return 'Proof of citizenship is required.';
  }

  return null; // no error. all cases passed.
}