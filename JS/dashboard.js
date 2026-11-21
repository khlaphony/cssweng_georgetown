// Admin dashboard logic.
// Expected backend endpoints (all require an admin session cookie; 401 = not logged in):
//   GET    /api/admin/applications          -> [ { id, fullName, position, email, mobile, message, resumeName, citizenshipName, createdAt }, ... ]
//   GET    /api/admin/applications/:id/files/:kind   kind = resume | citizenship, add ?view=1 to open a PDF inline
//   DELETE /api/admin/applications/:id
//   GET    /api/admin/applications/status   -> { open: true | false }
//   POST   /api/admin/applications/status   body: { open: true | false }
//   GET    /api/admin/contact-messages      -> [ { id, contactName, companyName, email, mobileNumber, message, createdAt }, ... ]
//   DELETE /api/admin/contact-messages/:id
//   POST   /api/logout

const rowsEl = document.getElementById('appRows');
const messageEl = document.getElementById('dash-message');
const totalEl = document.getElementById('stat-total');
const latestEl = document.getElementById('stat-latest');
const statusEl = document.getElementById('stat-status');
const toggleBtn = document.getElementById('toggleStatusBtn');
const logoutBtn = document.getElementById('logoutBtn');
const titleEl = document.getElementById('dash-title');
const contactRowsEl = document.getElementById('contactRows');
const contactTotalEl = document.getElementById('contact-total');
const contactLatestEl = document.getElementById('contact-latest');
const tabs = document.querySelectorAll('.dash-tab');

const VIEWS = {
  applications: { title: 'Applications', panel: document.getElementById('view-applications') },
  contacts: { title: 'Contact Requests', panel: document.getElementById('view-contacts') },
};

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

function fileUrl(id, kind, view) {
  return '/api/admin/applications/' + encodeURIComponent(id) + '/files/' + kind + (view ? '?view=1' : '');
}

const ICONS = {
  eye: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
};

function fileCell(id, kind, label, fileName, applicant) {
  const td = document.createElement('td');
  if (!fileName || !/\.pdf$/i.test(fileName)) {
    td.textContent = '\u2013';
    return td;
  }

  const viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.className = 'icon-btn';
  viewBtn.innerHTML = ICONS.eye;
  viewBtn.title = 'View ' + label.toLowerCase();
  viewBtn.setAttribute('aria-label', 'View ' + label.toLowerCase() + ' of ' + (applicant || 'applicant'));
  viewBtn.addEventListener('click', () => openViewer(fileUrl(id, kind, true), fileUrl(id, kind, false), label + ' \u2013 ' + (applicant || 'Applicant'), fileName, viewBtn));
  td.appendChild(viewBtn);
  return td;
}

/* ---------- file viewer ---------- */

const viewerEl = document.getElementById('fileViewer');
const viewerTitleEl = document.getElementById('viewer-title');
const viewerNameEl = document.getElementById('viewer-filename');
const viewerFrame = document.getElementById('viewer-frame');
const viewerDownload = document.getElementById('viewer-download');
const viewerClose = document.getElementById('viewer-close');
let viewerReturnFocus = null;

function openViewer(viewSrc, downloadHref, title, fileName, trigger) {
  viewerReturnFocus = trigger || null;
  viewerTitleEl.textContent = title;
  viewerNameEl.textContent = fileName;
  viewerDownload.href = downloadHref;
  viewerFrame.src = viewSrc;
  viewerEl.hidden = false;
  document.body.classList.add('viewer-open');
  viewerClose.focus();
}

function closeViewer() {
  if (viewerEl.hidden) return;
  viewerEl.hidden = true;
  viewerFrame.src = 'about:blank';
  document.body.classList.remove('viewer-open');
  if (viewerReturnFocus) viewerReturnFocus.focus();
}

viewerClose.addEventListener('click', closeViewer);
viewerEl.addEventListener('click', (e) => { if (e.target === viewerEl) closeViewer(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeViewer(); });

function emptyRow(tbody, colSpan, text, isError = false) {
  tbody.innerHTML = '';
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = colSpan;
  td.className = isError ? 'table-empty dash-error' : 'table-empty';
  td.textContent = text;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

function newestDate(items) {
  const newest = items
    .map(item => new Date(pick(item, 'createdAt', 'created_at')))
    .filter(d => !isNaN(d))
    .sort((a, b) => b - a)[0];
  return newest ? formatDate(newest) : '\u2013';
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
    td.colSpan = 9;
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

    tr.appendChild(fileCell(id, 'resume', 'Resume', pick(app, 'resumeName', 'resume_original'), name));
    tr.appendChild(fileCell(id, 'citizenship', 'Proof of Citizenship', pick(app, 'citizenshipName', 'citizenship_original'), name));

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

function renderContacts(contacts) {
  contactTotalEl.textContent = contacts.length;
  contactLatestEl.textContent = newestDate(contacts);

  if (contacts.length === 0) {
    emptyRow(contactRowsEl, 7, 'No contact requests yet. Messages from the Contact Us page will appear here.');
    return;
  }

  contactRowsEl.innerHTML = '';
  contacts.forEach(contact => {
    const id = pick(contact, 'id');
    const name = pick(contact, 'contactName', 'contact_name');
    const tr = document.createElement('tr');

    tr.appendChild(makeCell(name));
    tr.appendChild(makeCell(pick(contact, 'companyName', 'company_name')));
    tr.appendChild(makeCell(pick(contact, 'email')));
    tr.appendChild(makeCell(pick(contact, 'mobileNumber', 'mobile_number')));
    tr.appendChild(makeCell(formatDate(pick(contact, 'createdAt', 'created_at'))));

    const msgTd = makeCell(pick(contact, 'message'));
    msgTd.className = 'message-cell';
    tr.appendChild(msgTd);

    const actionTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'dash-btn dash-btn-danger';
    delBtn.textContent = 'Delete';
    delBtn.setAttribute('aria-label', 'Delete contact request from ' + (name || 'sender'));
    delBtn.addEventListener('click', () => deleteContact(id, name));
    actionTd.appendChild(delBtn);
    tr.appendChild(actionTd);

    contactRowsEl.appendChild(tr);
  });
}

/* ---------- actions ---------- */

function showView(name) {
  if (!VIEWS[name]) name = 'applications';
  Object.entries(VIEWS).forEach(([key, view]) => { view.panel.hidden = key !== name; });
  tabs.forEach(tab => {
    const active = tab.dataset.view === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  titleEl.textContent = VIEWS[name].title;
  messageEl.textContent = '';
  history.replaceState(null, '', name === 'applications' ? location.pathname : '#' + name);
}

async function loadContacts() {
  try {
    const res = await api('/api/admin/contact-messages');
    if (!res.ok) throw new Error('Request failed');
    const data = await res.json();
    renderContacts(Array.isArray(data) ? data : (data.messages || []));
  } catch (err) {
    if (err.message === 'Not logged in') return;
    emptyRow(contactRowsEl, 7, 'Could not load contact requests. Refresh the page or try again later.', true);
  }
}

async function deleteContact(id, name) {
  if (!confirm('Delete the contact request from ' + (name || 'this sender') + '? This cannot be undone.')) return;
  try {
    const res = await api('/api/admin/contact-messages/' + encodeURIComponent(id), { method: 'DELETE' });
    if (!res.ok) throw new Error('Request failed');
    showMessage('Contact request deleted.');
    loadContacts();
  } catch (err) {
    if (err.message === 'Not logged in') return;
    showMessage('Could not delete the contact request. Please try again.', true);
  }
}

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
    td.colSpan = 9;
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
tabs.forEach(tab => tab.addEventListener('click', () => showView(tab.dataset.view)));

showView(location.hash.slice(1));
loadStatus();
loadApplications();
loadContacts();