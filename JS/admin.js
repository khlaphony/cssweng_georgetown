const form = document.getElementById('loginForm');
const message = document.getElementById('login-message');
const submitBtn = form.querySelector('.submit-btn');
const submitText = submitBtn.querySelector('.btn-text');

function showMessage(type, text) {
  message.className = `form-message ${type}`;
  message.textContent = text;
  message.hidden = false;
}

function clearMessage() {
  message.hidden = true;
  message.textContent = '';
}

form.querySelectorAll('input').forEach((input) => input.addEventListener('input', clearMessage));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();

  const body = {
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value,
  };

  if (!body.username || !body.password) {
    showMessage('error', 'Please enter your username and password.');
    document.getElementById(body.username ? 'password' : 'username').focus();
    return;
  }

  submitBtn.disabled = true;
  submitText.textContent = 'Logging in...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      showMessage('success', 'Login successful! Redirecting...');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
      return;
    }

    showMessage('error', data.message || 'Incorrect username or password.');
    const password = document.getElementById('password');
    password.value = '';
    password.focus();
  } catch (err) {
    showMessage('error', 'Could not reach the server. Please try again.');
  }

  submitBtn.disabled = false;
  submitText.textContent = 'Log in';
});