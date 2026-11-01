// constants / references
const API_URL = '/api/apply'; // changeable based on deployment
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];

const form = document.getElementById('applyForm');
const submitBtn = form.querySelector('.submit-btn');

// success/error notif/msg
function showMessage(type, text) {
    let box = document.getElementById('formMessage');

    if (!box) {
        box = document.createElement('div');
        box.id = 'formMessage';
        form.prepend(box);
    }

    box.className = `form-message ${type}`;
    box.textContent = text;
}