import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { mapNote } from '../utils/mapNote.js';

export const insightsRouter = Router();

insightsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const [notesResult, tagsResult, aiResult, weeklyResult] = await Promise.all([
      query(
        `SELECT *
         FROM notes
         WHERE user_id = $1 AND archived = false
         ORDER BY updated_at DESC`,
        [req.user.id]
      ),
      query(
        `SELECT tag, count(*)::int AS count
         FROM notes, unnest(tags) AS tag
         WHERE user_id = $1 AND archived = false
         GROUP BY tag
         ORDER BY count DESC, tag ASC
         LIMIT 5`,
        [req.user.id]
      ),
      query(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS last_7_days
         FROM ai_usage
         WHERE user_id = $1`,
        [req.user.id]
      ),
      query(
        `WITH days AS (
           SELECT generate_series(current_date - interval '6 days', current_date, interval '1 day')::date AS day
         )
         SELECT days.day::text AS date, count(notes.id)::int AS edits
         FROM days
         LEFT JOIN notes
           ON notes.user_id = $1
          AND notes.updated_at::date = days.day
         GROUP BY days.day
         ORDER BY days.day`,
        [req.user.id]
      )
    ]);

    const notes = notesResult.rows.map(mapNote);
    res.json({
      insights: {
        total_notes: notes.length,
        total_meetings: notes.filter((note) => note.type === 'meeting').length,
        recently_edited: notes.slice(0, 5),
        most_used_tags: tagsResult.rows,
        ai_usage: {
          total_generations: aiResult.rows[0]?.total || 0,
          last_7_days: aiResult.rows[0]?.last_7_days || 0
        },
        weekly_activity: weeklyResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});
