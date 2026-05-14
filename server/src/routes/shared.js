import { Router } from 'express';
import { query } from '../db/pool.js';
import { mapNote } from '../utils/mapNote.js';

export const sharedRouter = Router();

sharedRouter.get('/:shareId', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT *
       FROM notes
       WHERE share_id = $1 AND is_public = true AND archived = false`,
      [req.params.shareId]
    );
    const note = mapNote(result.rows[0]);
    if (!note) return res.status(404).json({ error: 'Shared note unavailable.' });
    res.json({ note });
  } catch (error) {
    next(error);
  }
});
