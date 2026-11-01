// constants / references
const API_URL = '/api/apply'; // changeable based on deployment
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];

const form = document.getElementById('applyForm');
const submitBtn = form.querySelector('.submit-btn');

// main function for form submission


// helper function for success/error notif/msg
function showMessage(type, text){
    let box = document.getElementById('formMessage');

    if (!box) {
        box = document.createElement('div');
        box.id = 'formMessage';
        form.prepend(box);
    }

    box.className = `form-message ${type}`;
    box.textContent = text;
}

// helper function for file validation
// note: defaulted to only 1 file input for now. feel free to change it.
function validateFile(file,label){
    if (!file) {
        return `${label} is required.`;
    }

    const extension = file.name.split('.').pop().toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)){
        return `${label} must be a PDF, or DOCX file.`;
    }

    if (file.size > MAX_FILE_SIZE){
        return `${label} must be 5 MB or smaller.`;
    }

    return null;
}