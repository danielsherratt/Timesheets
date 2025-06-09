// api/auth.js
import { sign, verify } from '../utils/jwt.js';

// POST /api/auth/register
export async function register(request, env) {
  const { email, password } = await request.json();
  // hash password (use a proper bcrypt in real app)
  const stmt = env.TIMESHEET_DB.prepare(`
    INSERT INTO users (email, password_hash, role)
    VALUES (?, ?, 'user')
    RETURNING id, email, role
  `);
  const { results } = await stmt.bind(email, password).all();
  const user = results[0];
  return new Response(
    JSON.stringify({ token: sign(user), user }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// POST /api/auth/login
export async function login(request, env) {
  const { email, password } = await request.json();
  const { results } = await env.TIMESHEET_DB
    .prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?')
    .bind(email)
    .all();
  const user = results[0];
  if (!user || user.password_hash !== password) {
    return new Response('Invalid credentials', { status: 401 });
  }
  return new Response(
    JSON.stringify({ token: sign(user), user: { id: user.id, email: user.email, role: user.role } }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// GET /api/auth/me
export async function me(request) {
  const auth = request.headers.get('Authorization')?.split(' ')[1];
  const payload = verify(auth);
  if (!payload) return new Response('Unauthorized', { status: 401 });
  return new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
}
