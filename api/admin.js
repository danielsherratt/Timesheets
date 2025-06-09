// api/admin.js
import { verify } from '../utils/jwt.js';

async function requireAdmin(request) {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  const payload = verify(token);
  if (!payload || payload.role !== 'admin') throw new Error('Forbidden');
  return payload;
}

// GET /api/admin/timesheets
// list all users’ timesheets
export async function listAll(request, env) {
  await requireAdmin(request);
  const { results } = await env.TIMESHEET_DB
    .prepare(`
      SELECT t.id, u.email, t.week_start, t.status
      FROM timesheets t
      JOIN users u ON u.id = t.user_id
      ORDER BY t.week_start DESC, u.email
    `)
    .all();
  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/admin/timesheet/:id/reopen
// reopen a submitted timesheet
export async function reopen(request, env, ctx) {
  await requireAdmin(request);
  const { id } = ctx.params;
  await env.TIMESHEET_DB
    .prepare(`UPDATE timesheets SET status = 'open' WHERE id = ?`)
    .bind(id)
    .run();
  return new Response(null, { status: 204 });
}
