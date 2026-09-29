import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/database.ts';
import { sseManager } from '../services/realtime/sseManager.ts';

export const adminRouter = Router();

/**
 * GET /api/admin/audit-logs
 */
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { rows: logs } = await db.query(
      `SELECT * FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 100`
    );

    res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/events/:id/dismiss
 */
adminRouter.post('/events/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actor = 'Operations Administrator', reason = 'Manually acknowledged' } = req.body;

    const db = await getDb();
    const { rows: updated } = await db.query(
      `UPDATE weather_events
       SET status = 'DISMISSED'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (updated.length === 0) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    await db.query(
      `INSERT INTO audit_logs (action, actor, entity_type, entity_id, details)
       VALUES ('DISMISS_EVENT', $1, 'weather_event', $2, $3)`,
      [actor, id, `Weather event dismissed: ${reason}`]
    );

    sseManager.broadcast('event:dismissed', { id });

    res.json({ success: true, event: updated[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
