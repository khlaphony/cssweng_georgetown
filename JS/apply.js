// constants / references
const API_URL = '/api/apply'; // changeable based on deployment
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];

const form = document.getElementById('applyForm');
const submitBtn = form.querySelector('.submit-btn');

