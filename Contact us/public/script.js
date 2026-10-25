document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const fields = ['contactName', 'email', 'mobileNumber', 'message'];

  fields.forEach(id => {
    const field = document.getElementById(id);
    if (!field) return;

    field.addEventListener('input', () => {
      field.classList.remove('error');
      const error = document.getElementById(`${id}-error`);
      if (error) error.classList.remove('visible');
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();

    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    const invalidFields = fields.filter(id => {
      const value = values[id].trim();
      return id === 'email'
        ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        : value.length === 0;
    });

    invalidFields.forEach(id => {
      const field = document.getElementById(id);
      const error = document.getElementById(`${id}-error`);
      field.classList.add('error');
      if (error) error.classList.add('visible');
    });

    if (invalidFields.length > 0) {
      document.getElementById(invalidFields[0]).focus();
      return;
    }

    const submission = {
      id: Date.now(),
      contactName: values.contactName.trim(),
      companyName: values.companyName.trim(),
      email: values.email.trim(),
      mobileNumber: values.mobileNumber.trim(),
      message: values.message.trim(),
      submittedAt: new Date().toISOString()
    };

    try {
      const savedSubmissions = JSON.parse(localStorage.getItem('gesContactSubmissions') || '[]');
      savedSubmissions.push(submission);
      localStorage.setItem('gesContactSubmissions', JSON.stringify(savedSubmissions));
      showToast('Thank you! Your message has been saved in this browser.', false);
      form.reset();
    } catch (error) {
      console.error('Unable to save contact submission in this browser:', error);
      showToast('Unable to save your message in this browser. Please try again.', true);
    }
  });
});

function showToast(msg, isError) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : ' success');
  
  const icon = isError ? '⚠️' : '✅';
  toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-text">${msg}</span>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 320);
  }, 4500);
}
