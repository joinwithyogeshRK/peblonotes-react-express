import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { generateNoteIntelligence } from '../services/aiService.js';
import { mapNote } from '../utils/mapNote.js';

export const notesRouter = Router();

notesRouter.use(requireAuth);

const noteSchema = z.object({
  title: z.string().trim().min(1).max(140).default('Untitled note'),
  content: z.string().default(''),
  tags: z.array(z.string().trim().min(1)).max(12).default([]),
  category: z.string().trim().min(1).max(80).default('Personal'),
  type: z.enum(['note', 'meeting']).default('note'),
  meeting_at: z.string().datetime().nullable().optional(),
  archived: z.boolean().optional()
});

const patchSchema = noteSchema.partial();

notesRouter.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const tag = String(req.query.tag || '').trim();
    const archived = req.query.archived === 'true';
    const values = [req.user.id, archived, search ? `%${search}%` : null, tag || null];

    const result = await query(
      `SELECT *
       FROM notes
       WHERE user_id = $1
         AND ($2::boolean OR archived = false)
         AND ($3::text IS NULL OR title ILIKE $3 OR content ILIKE $3 OR category ILIKE $3 OR type ILIKE $3)
         AND ($4::text IS NULL OR $4 = ANY(tags))
       ORDER BY updated_at DESC`,
      values
    );
    res.json({ notes: result.rows.map(mapNote) });
  } catch (error) {
    next(error);
  }
});

notesRouter.post('/', async (req, res, next) => {
  try {
    const input = noteSchema.parse(req.body);
    const result = await query(
      `INSERT INTO notes (user_id, title, content, tags, category, type, meeting_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, input.title, input.content, input.tags, input.category, input.type, input.type === 'meeting' ? input.meeting_at || null : null]
    );
    res.status(201).json({ note: mapNote(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

notesRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = patchSchema.parse(req.body);
    const existing = await getOwnedNote(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Note not found.' });

    const nextNote = {
      ...existing,
      ...input,
      meeting_at: (input.type || existing.type) === 'meeting' ? input.meeting_at ?? existing.meeting_at : null
    };

    const result = await query(
      `UPDATE notes
       SET title = $1,
           content = $2,
           tags = $3,
           category = $4,
           type = $5,
           meeting_at = $6,
           archived = $7,
           updated_at = now()
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [nextNote.title, nextNote.content, nextNote.tags, nextNote.category, nextNote.type, nextNote.meeting_at, nextNote.archived, req.params.id, req.user.id]
    );
    res.json({ note: mapNote(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

notesRouter.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Note not found.' });
    res.json({ ok: true, deleted_note_id: result.rows[0].id });
  } catch (error) {
    next(error);
  }
});

notesRouter.post('/:id/share', async (req, res, next) => {
  try {
    const existing = await getOwnedNote(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Note not found.' });

    const result = await query(
      `UPDATE notes
       SET is_public = NOT is_public,
           share_id = CASE WHEN is_public THEN NULL ELSE COALESCE(share_id, gen_random_uuid()) END,
           updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    const note = mapNote(result.rows[0]);
    res.json({ note, share_url: note.is_public ? `/shared/${note.share_id}` : null });
  } catch (error) {
    next(error);
  }
});

notesRouter.post('/:id/generate-summary', async (req, res, next) => {
  try {
    const existing = await getOwnedNote(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Note not found.' });

    const { provider, output } = await generateNoteIntelligence(existing);
    const result = await query(
      `UPDATE notes
       SET ai_summary = $1,
           ai_action_items = $2,
           ai_suggested_title = $3,
           updated_at = now()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [output.summary, output.action_items, output.suggested_title, req.params.id, req.user.id]
    );
    await query('INSERT INTO ai_usage (user_id, note_id, provider) VALUES ($1, $2, $3)', [req.user.id, req.params.id, provider]);
    res.json({ ai: output, note: mapNote(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

async function getOwnedNote(id, userId) {
  const result = await query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [id, userId]);
  return result.rows[0] ? mapNote(result.rows[0]) : null;
}
