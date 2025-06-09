// api/timesheet.js
import { verify } from '../utils/jwt.js';

// helper to load user from JWT
async function getUser(request, env) {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  const payload = verify(token, env.JWT_SECRET);
  if (!payload) throw new Error('Unauthorized');
  return payload;
}

// POST /api/timesheet/:week/start
// create a new week timesheet (if not exists)
export async function startWeek(request, env, ctx) {
  const user = await getUser(request, env);
  // router defines the parameter as ":week" so pull that value
  const { week } = ctx.params;
  const weekStart = week; // ISO yyyy-mm-dd
  // insert if not exists
  await env.TIMESHEET_DB
    .prepare(`
      INSERT OR IGNORE INTO timesheets (user_id, week_start, status)
      VALUES (?, ?, 'open')
    `)
    .bind(user.sub, weekStart)
    .run();
  return new Response(null, { status: 204 });
}

// POST /api/timesheet/:week/entries
// add one time entry
export async function addEntry(request, env, ctx) {
  const user = await getUser(request, env);
  // parameter comes in as "week" from the router
  const { week } = ctx.params;
  const weekStart = week;
  const { date, hours, type, description } = await request.json();
  const res = await env.TIMESHEET_DB
    .prepare(`
      INSERT INTO entries (timesheet_id, entry_date, hours, type, description)
      SELECT id, ?, ?, ?, ? FROM timesheets
      WHERE user_id = ? AND week_start = ? AND status = 'open'
    `)
    .bind(date, hours, type, description, user.sub, weekStart)
    .run();
  if (res.error) return new Response(res.error, { status: 400 });
  return new Response(null, { status: 201 });
}

// GET /api/timesheet/:week
// retrieve all entries & totals
export async function getWeek(request, env, ctx) {
  const user = await getUser(request, env);
  const { week } = ctx.params; // param name from router
  const weekStart = week;
  const entries = await env.TIMESHEET_DB
    .prepare(`
      SELECT entry_date, hours, type, description 
      FROM entries 
      WHERE timesheet_id = (
        SELECT id FROM timesheets WHERE user_id = ? AND week_start = ?
      )
      ORDER BY entry_date
    `)
    .bind(user.sub, weekStart)
    .all();
  // compute totals
  const byDay = {};
  let weekTotal = 0;
  for (const e of entries.results) {
    byDay[e.entry_date] = (byDay[e.entry_date] || 0) + e.hours;
    weekTotal += e.hours;
  }
  return new Response(
    JSON.stringify({ entries: entries.results, byDay, weekTotal }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// POST /api/timesheet/:week/submit
// submit (close) the week
export async function submitWeek(request, env, ctx) {
  const user = await getUser(request, env);
  const { week } = ctx.params;
  const weekStart = week;
  await env.TIMESHEET_DB
    .prepare(`
      UPDATE timesheets SET status = 'submitted'
      WHERE user_id = ? AND week_start = ? AND status = 'open'
    `)
    .bind(user.sub, weekStart)
    .run();
  return new Response(null, { status: 204 });
}

// GET /api/timesheets
// list all open/closed weeks for the user
export async function listWeeks(request, env) {
  const user = await getUser(request, env);
  const { results } = await env.TIMESHEET_DB
    .prepare(`
      SELECT week_start, status 
      FROM timesheets 
      WHERE user_id = ? 
      ORDER BY week_start DESC
    `)
    .bind(user.sub)
    .all();
  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}
