import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/database.ts';
import { ingestionEngine } from '../services/ingestion/ingestionEngine.ts';

export const ingestionRouter = Router();

/**
 * GET /api/ingestion/status
 */
ingestionRouter.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    ...ingestionEngine.getStatus(),
  });
});

/**
 * GET /api/ingestion/logs
 */
ingestionRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '50', 10);
    const db = await getDb();
    const { rows: logs } = await db.query(
      `SELECT * FROM ingestion_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ingestion/trigger
 * Manually trigger live ingestion
 */
ingestionRouter.post('/trigger', async (req: Request, res: Response) => {
  try {
    const result = await ingestionEngine.runWeatherIngestionCycle();
    res.json({
      success: true,
      message: 'Ingestion cycle completed',
      result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
