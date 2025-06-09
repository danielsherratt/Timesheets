// utils/jwt.js
import jwt from 'jsonwebtoken';
const SECRET = 'dev-secret';

export function sign(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, SECRET, {
    expiresIn: '7d',
  });
}

export function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}
