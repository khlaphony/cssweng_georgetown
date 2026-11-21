// Admin dashboard logic.
// Expected backend endpoints (all require an admin session cookie; 401 = not logged in):
//   GET    /api/admin/applications          -> [ { id, fullName, position, email, mobile, message, resume, citizenship, createdAt }, ... ]
//   DELETE /api/admin/applications/:id
//   GET    /api/admin/applications/status   -> { open: true | false }
//   POST   /api/admin/applications/status   body: { open: true | false }
//   POST   /api/logout

const rowsEl = document.getElementById('appRows');
const messageEl = document.getElementById('dash-message');
const totalEl = document.getElementById('stat-total');
const latestEl = document.getElementById('stat-latest');
const statusEl = document.getElementById('stat-status');
const toggleBtn = document.getElementById('toggleStatusBtn');
const logoutBtn = document.getElementById('logoutBtn');

let applicationsOpen = null;

/* ---------- helpers ---------- */

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = isError ? 'dash-error' : 'dash-success';
}

// Accept either camelCase or snake_case field names from the backend.
function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return '';
}

function formatDate(value) {
  if (!value) return '\u2013';
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fileHref(value) {
  if (!value) return '';
  if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return value;
  return '/uploads/' + value; // adjust if your server serves uploads elsewhere
}

function makeCell(text) {
  const td = document.createElement('td');
  td.textContent = text || '\u2013';
  return td;
}

async function api(path, options = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...options });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Not logged in');
  }
  return res;
}

/* ---------- rendering ---------- */

function renderStatus() {
  if (applicationsOpen === null) return;
  statusEl.textContent = applicationsOpen ? 'Open' : 'Closed';
  toggleBtn.textContent = applicationsOpen ? 'Close Applications' : 'Open Applications';
  toggleBtn.disabled = false;
}

function renderApplications(applications) {
  totalEl.textContent = applications.length;

  if (applications.length === 0) {
    latestEl.textContent = '\u2013';
    rowsEl.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'table-empty';
    td.textContent = 'No applications yet. New applications will appear here.';
    tr.appendChild(td);
    rowsEl.appendChild(tr);
    return;
  }

  const newest = applications
    .map(a => new Date(pick(a, 'createdAt', 'created_at')))
    .filter(d => !isNaN(d))
    .sort((a, b) => b - a)[0];
  latestEl.textContent = newest ? formatDate(newest) : '\u2013';

  rowsEl.innerHTML = '';
  applications.forEach(app => {
    const id = pick(app, 'id');
    const name = pick(app, 'fullName', 'full_name');
    const tr = document.createElement('tr');

    tr.appendChild(makeCell(name));
    tr.appendChild(makeCell(pick(app, 'position')));
    tr.appendChild(makeCell(pick(app, 'email')));
    tr.appendChild(makeCell(pick(app, 'mobile')));
    tr.appendChild(makeCell(formatDate(pick(app, 'createdAt', 'created_at'))));

    // Files
    const filesTd = document.createElement('td');
    [['Resume', pick(app, 'resume', 'resumePath', 'resume_path', 'resumeUrl', 'resume_url')],
     ['Citizenship', pick(app, 'citizenship', 'citizenshipPath', 'citizenship_path', 'citizenshipUrl', 'citizenship_url')]]
      .forEach(([label, value]) => {
        if (!value) return;
        const a = document.createElement('a');
        a.href = fileHref(value);
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = label;
        a.className = 'file-link';
        filesTd.appendChild(a);
      });
    if (!filesTd.hasChildNodes()) filesTd.textContent = '\u2013';
    tr.appendChild(filesTd);

    // Message (kept short, full text on hover/tap via title)
    const msg = pick(app, 'message');
    const msgTd = makeCell(msg.length > 80 ? msg.slice(0, 80) + '...' : msg);
    if (msg.length > 80) msgTd.title = msg;
    tr.appendChild(msgTd);

    // Delete
    const actionTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'dash-btn dash-btn-danger';
    delBtn.textContent = 'Delete';
    delBtn.setAttribute('aria-label', 'Delete application from ' + (name || 'applicant'));
    delBtn.addEventListener('click', () => deleteApplication(id, name));
    actionTd.appendChild(delBtn);
    tr.appendChild(actionTd);

    rowsEl.appendChild(tr);
  });
}

/* ---------- actions ---------- */

async function loadApplications() {
  try {
    const res = await api('/api/admin/applications');
    if (!res.ok) throw new Error('Request failed');
    const data = await res.json();
    renderApplications(Array.isArray(data) ? data : (data.applications || []));
  } catch (err) {
    if (err.message === 'Not logged in') return;
    rowsEl.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'table-empty dash-error';
    td.textContent = 'Could not load applications. Refresh the page or try again later.';
    tr.appendChild(td);
    rowsEl.appendChild(tr);
  }
}

async function loadStatus() {
  try {
    const res = await api('/api/admin/applications/status');
    if (!res.ok) throw new Error('Request failed');
    const data = await res.json();
    applicationsOpen = Boolean(data.open);
    renderStatus();
  } catch (err) {
    if (err.message === 'Not logged in') return;
    statusEl.textContent = 'Unknown';
  }
}

async function deleteApplication(id, name) {
  if (!confirm('Delete the application from ' + (name || 'this applicant') + '? This cannot be undone.')) return;
  try {
    const res = await api('/api/admin/applications/' + encodeURIComponent(id), { method: 'DELETE' });
    if (!res.ok) throw new Error('Request failed');
    showMessage('Application deleted.');
    loadApplications();
  } catch (err) {
    if (err.message === 'Not logged in') return;
    showMessage('Could not delete the application. Please try again.', true);
  }
}

async function toggleStatus() {
  const next = !applicationsOpen;
  toggleBtn.disabled = true;
  try {
    const res = await api('/api/admin/applications/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ open: next }),
    });
    if (!res.ok) throw new Error('Request failed');
    applicationsOpen = next;
    renderStatus();
    showMessage(next ? 'Applications are now open.' : 'Applications are now closed.');
  } catch (err) {
    if (err.message === 'Not logged in') return;
    toggleBtn.disabled = false;
    showMessage('Could not change the application status. Please try again.', true);
  }
}

async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  } finally {
    window.location.href = '/login';
  }
}

/* ---------- init ---------- */

toggleBtn.addEventListener('click', toggleStatus);
logoutBtn.addEventListener('click', logout);

loadStatus();
loadApplications();