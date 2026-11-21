// constants / references
const API_URL = '/api/applications';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];

const form = document.getElementById('applyForm');
const submitBtn = form.querySelector('.submit-btn');
const submitBtnText = submitBtn.querySelector('.btn-text');

// file fields: label + allowed extensions
const FILE_FIELDS = {
  resume: { label: 'Credentials', exts: DOC_EXTENSIONS },
  citizenship: { label: 'Citizenship ID', exts: DOC_EXTENSIONS },
};

let isSubmitting = false;

// helpers: messages and per-field errors
function showMessage(type, text) {
  let box = document.getElementById('formMessage');
  if (!box) {
    box = document.createElement('div');
    box.id = 'formMessage';
    box.setAttribute('role', 'alert');
    form.prepend(box);
  }
  box.className = `form-message ${type}`;
  box.textContent = text;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearErrors() {
  form.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
  const box = document.getElementById('formMessage');
  if (box) box.remove();
}

function showFieldErrors(errors) {
  Object.entries(errors || {}).forEach(([field, message]) => {
    const el = document.getElementById(`${field}Error`);
    if (el) el.textContent = message;
  });
}

// client-side validation (convenience only; the server re-validates everything)
function validateFile(file, label, allowed) {
  if (!file) return `${label} is required.`;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!allowed.includes(ext)) return `${label} must be one of: ${allowed.join(', ').toUpperCase()}.`;
  if (file.size > MAX_FILE_SIZE) return `${label} must be 5 MB or smaller.`;
  return null;
}

function validateClient() {
  const errors = {};

  Object.entries(FILE_FIELDS).forEach(([name, rule]) => {
    const error = validateFile(form.elements[name].files[0], rule.label, rule.exts);
    if (error) errors[name] = error;
  });

  return errors;
}

// submission
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  clearErrors();

  const clientErrors = validateClient();
  if (Object.keys(clientErrors).length > 0) {
    showFieldErrors(clientErrors);
    showMessage('error', 'Please fix the highlighted fields.');
    return;
  }

  isSubmitting = true;
  submitBtn.disabled = true;
  submitBtnText.textContent = 'Submitting...';

  try {
    // no Content-Type header: the browser sets multipart + boundary itself
    const response = await fetch(API_URL, { method: 'POST', body: new FormData(form) });

    let result = {};
    try { result = await response.json(); } catch (e) { /* non-JSON response */ }

    if (!response.ok) {
      showFieldErrors(result.errors);
      showMessage('error', result.error || 'Something went wrong. Please try again.');
      return;
    }

    showMessage('success', result.message || 'Application submitted successfully!');
    form.reset();
  } catch (error) {
    console.error('Apply form error:', error);
    showMessage('error', 'Could not reach the server. Please check your connection and try again.');
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtnText.textContent = 'Submit';
  }
});