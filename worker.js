import { Router } from 'itty-router';
import { json } from 'itty-router-extras';

const router = Router();

// helper to parse JSON
async function parseBody(request) {
  try { return await request.json(); }
  catch { return {}; }
}

// simple JWT with base64 (NOT SECURE!)
function sign(payload) {
  return btoa(JSON.stringify(payload));
}
function verify(token) {
  try { return JSON.parse(atob(token)); }
  catch { return null; }
}

router.post('/api/register', async request => {
  const { email, password } = await parseBody(request);
  await D1.prepare(`INSERT INTO users (email,password) VALUES (?,?)`).bind(email,password).run();
  return json({ success: true });
});

router.post('/api/login', async request => {
  const { email, password } = await parseBody(request);
  const user = await D1.prepare(`SELECT * FROM users WHERE email = ? AND password = ?`).bind(email,password).first();
  if (!user) return json({ error: 'Invalid creds' }, { status: 401 });
  const token = sign({ id: user.id, role: user.role });
  return json({ token, role: user.role });
});

router.post('/api/entries', async request => {
  const auth = verify(request.headers.get('Authorization')?.split(' ')[1] || '');
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  const { date, hours, type } = await parseBody(request);
  // ensure timesheet exists for this week
  const weekStart = date.substr(0, 8) + '01'; // simplify: use month start as week key
  let ts = await D1.prepare(`SELECT * FROM timesheets WHERE user_id = ? AND week_start = ?`).bind(auth.id, weekStart).first();
  if (!ts) {
    const res = await D1.prepare(`INSERT INTO timesheets (user_id,week_start) VALUES (?,?)`).bind(auth.id,weekStart).run();
    ts = { id: res.lastInsertRowid };
  }
  await D1.prepare(`INSERT INTO entries (timesheet_id,date,hours,type) VALUES (?,?,?,?)`).bind(ts.id,date,hours,type).run();
  return json({ success: true });
});

router.get('/api/entries', async request => {
  const auth = verify(request.headers.get('Authorization')?.split(' ')[1] || '');
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  const weekStart = new Date().toISOString().substr(0,8)+'01';
  const entries = await D1.prepare(`SELECT * FROM entries e JOIN timesheets t ON e.timesheet_id = t.id WHERE t.user_id = ? AND t.week_start = ?`).bind(auth.id,weekStart).all();
  return json(entries.results);
});

router.post('/api/submit', async request => {
  const auth = verify(request.headers.get('Authorization')?.split(' ')[1] || '');
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  const weekStart = new Date().toISOString().substr(0,8)+'01';
  await D1.prepare(`UPDATE timesheets SET submitted=1 WHERE user_id=? AND week_start=?`).bind(auth.id,weekStart).run();
  return json({ success: true });
});

router.get('/api/history', async request => {
  const auth = verify(request.headers.get('Authorization')?.split(' ')[1] || '');
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  const history = await D1.prepare(`SELECT * FROM timesheets WHERE user_id=? AND submitted=1`).bind(auth.id).all();
  return json(history.results);
});

router.get('/api/admin/timesheets', async request => {
  const auth = verify(request.headers.get('Authorization')?.split(' ')[1] || '');
  if (!auth || auth.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
  const all = await D1.prepare(`SELECT t.*, u.email FROM timesheets t JOIN users u ON t.user_id=u.id`).all();
  return json(all.results);
});

router.post('/api/admin/timesheets/:id/reopen', async request => {
  const auth = verify(request.headers.get('Authorization')?.split(' ')[1] || '');
  if (!auth || auth.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
  const id = request.params.id;
  await D1.prepare(`UPDATE timesheets SET submitted=0,reopened=1 WHERE id=?`).bind(id).run();
  return json({ success: true });
});

router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  async fetch(request, env) {
    globalThis.D1 = env.TIMESHEET_DB;
    return router.handle(request);
  }
};
