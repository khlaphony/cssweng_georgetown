const form = document.getElementById('loginForm');
const message = document.getElementById('login-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = '';

  const body = {
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value,
  };

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      message.textContent = 'Login successful! Redirecting...';
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } else {
      message.textContent = data.message || 'Incorrect username or password.';
    }
  } catch (err) {
    message.textContent = 'Could not reach the server. Please try again.';
  }
});