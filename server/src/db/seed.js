import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

const email = 'demo@peblo.test';
const passwordHash = await bcrypt.hash('password123', 12);

try {
  const userResult = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['Demo User', email, passwordHash]
  );

  const userId = userResult.rows[0].id;
  await pool.query(
    `INSERT INTO notes (user_id, title, content, tags, category, type, meeting_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT DO NOTHING`,
    [
      userId,
      'Sprint planning notes',
      '# Sprint planning\nDiscuss AI summaries, public sharing, dashboard polish, and CRUD workflows.\n\n- Prepare UI mockups\n- Review API structure\n- Schedule demo recording',
      ['work', 'meeting'],
      'Product',
      'meeting'
    ]
  );

  console.log(`Seeded demo account: ${email} / password123`);
} finally {
  await pool.end();
}
