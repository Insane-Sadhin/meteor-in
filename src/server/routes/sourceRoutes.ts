import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/database.ts';

export const sourceRouter = Router();

/**
 * GET /api/sources
 * Returns all configured data sources and operational health status
 */
sourceRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { rows: sources } = await db.query(
      `SELECT * FROM sources ORDER BY created_at ASC`
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      sources,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
