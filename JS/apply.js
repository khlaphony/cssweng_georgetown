// constants / references
const API_URL = '/api/apply'; // changeable based on deployment
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];

const form = document.getElementById('applyForm');
const submitBtn = form.querySelector('.submit-btn');

// main function for form submission
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const resumeError = validateFile(form.elements['resume'].files[0], 'Resume / CV');
    const citizenshipError = validateFile(form.elements['citizenship'].files[0], 'Proof of Citizenship');

    if (resumeError || citizenshipError){
        showMessage('error', resumeError || citizenshipError);
        return;
    }

    const formData = new FormData(form);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try{
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData,
      });

        const result = await response.json();

        if (!response.ok){
            showMessage('error', result.message || 'Something went wrong. Please try again.');
            return;
        }

        showMessage('success', result.message || 'Application submitted successfully!');
        form.reset();
    } catch (error){
        console.error('Apply form error:', error);
        showMessage('error', 'Could not reach the server. Please check your connection and try again.');
    } finally{
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit &rarr;';
    }
});

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