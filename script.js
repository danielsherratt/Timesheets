const api = {
  register: '/api/auth/register',
  login: '/api/auth/login',
  timesheet: '/api/timesheet',
  timesheets: '/api/timesheets',
  admin: '/api/admin/timesheets',
};

// Simple cookie-based auth
function setAuth(token) {
  document.cookie = `auth=${token}; path=/`;
}
function getAuth() {
  return document.cookie.split('; ').find(r=>r.startsWith('auth='))?.split('=')[1];
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday as start
  d.setUTCDate(diff);
  return d.toISOString().slice(0, 10);
}

async function fetchAPI(url, options = {}) {
  options.headers = options.headers || {};
  const token = getAuth();
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, options);
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return { status: res.status };
}

// DOM refs
const loginView = document.getElementById('login-view');
const timesheetView = document.getElementById('timesheet-view');
const adminView = document.getElementById('admin-view');
// ... more refs omitted for brevity

document.getElementById('login-btn').onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res = await fetchAPI(api.login, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.token) {
    setAuth(res.token);
    loginView.hidden = true;
    if (res.role === 'admin') adminView.hidden = false;
    else timesheetView.hidden = false;
    loadTimesheet();
  } else alert('Login failed');
};

async function loadTimesheet() {
  if (timesheetView.hidden) {
    await fetchAPI(api.admin);
    return; // admin view rendering omitted
  }
  const week = getWeekStart();
  await fetchAPI(`${api.timesheet}/${week}/start`, { method: 'POST' });
  const data = await fetchAPI(`${api.timesheet}/${week}`);
  // render entries, summary, history or admin list
  // for brevity, implement rendering similarly to entry creation
}

document.getElementById('add-entry-btn').onclick = async () => {
  const date = document.getElementById('entry-date').value;
  const hours = parseFloat(document.getElementById('entry-hours').value);
  const type = document.getElementById('entry-type').value;
  const week = getWeekStart(date);
  await fetchAPI(`${api.timesheet}/${week}/entries`, {
    method: 'POST',
    body: JSON.stringify({ date, hours, type })
  });
  loadTimesheet();
};

document.getElementById('submit-timesheet-btn').onclick = async () => {
  const week = getWeekStart();
  await fetchAPI(`${api.timesheet}/${week}/submit`, { method: 'POST' });
  alert('Submitted!');
  loadTimesheet();
};

// Additional UI logic for summary checks (<8hrs/day, <40hrs/week) omitted for brevity