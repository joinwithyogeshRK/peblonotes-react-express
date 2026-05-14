import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { clearSessionCookie, requireAuth, setSessionCookie } from '../middleware/auth.js';
import { mapUser } from '../utils/mapNote.js';

export const authRouter = Router();

const signupSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

authRouter.post('/signup', async (req, res, next) => {
  try {
    const input = signupSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const result = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [input.name, input.email, passwordHash]
    );
    const user = mapUser(result.rows[0]);
    setSessionCookie(res, user.id);
    res.status(201).json({ user });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account already exists for this email.' });
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [input.email]);
    const userRow = result.rows[0];
    if (!userRow || !(await bcrypt.compare(input.password, userRow.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    setSessionCookie(res, userRow.id);
    res.json({ user: mapUser(userRow) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
