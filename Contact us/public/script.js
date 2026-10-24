document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const fields = ['contactName', 'email', 'mobileNumber', 'message'];

  // Clear errors on input
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      el.classList.remove('error');
      const err = document.getElementById(id + '-error');
      if (err) err.classList.remove('visible');
    });
  });

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let valid = true;
    fields.forEach(id => {
      const el = document.getElementById(id);
      const val = el ? el.value.trim() : '';
      let ok = id === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) : val.length > 0;

      if (!ok) {
        valid = false;
        el.classList.add('error');
        const err = document.getElementById(id + '-error');
        if (err) err.classList.add('visible');
      }
    });

    if (!valid) {
      // Focus first error field
      const firstError = document.querySelector('.error');
      if (firstError) firstError.focus();
      return;
    }

    const btn = document.getElementById('btn-submit');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner"></span> Sending...`;

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: document.getElementById('contactName').value.trim(),
          companyName: document.getElementById('companyName').value.trim(),
          email: document.getElementById('email').value.trim(),
          mobileNumber: document.getElementById('mobileNumber').value.trim(),
          message: document.getElementById('message').value.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Thank you! Your message has been sent successfully.', false);
        form.reset();
      } else {
        showToast(data.message || 'Something went wrong. Please check your details.', true);
      }
    } catch {
      showToast('Unable to reach the server. Please check your connection and try again.', true);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalContent;
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
