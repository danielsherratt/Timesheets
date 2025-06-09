// utils/jwt.js
import jwt from 'jsonwebtoken';

// allow secret to be injected (e.g. from env.JWT_SECRET) but fall back to a
// simple development value so unit tests or local usage don't crash
const DEFAULT_SECRET = 'dev-secret';

export function sign(user, secret = DEFAULT_SECRET) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: '7d' },
  );
}

export function verify(token, secret = DEFAULT_SECRET) {
  try {
    return jwt.verify(token, secret);
  } catch (e) {
    return null;
  }
}
