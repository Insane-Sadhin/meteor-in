import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/database.ts';
import { ingestionEngine } from '../services/ingestion/ingestionEngine.ts';
import { sseManager } from '../services/realtime/sseManager.ts';

export const healthRouter = Router();

/**
 * GET /api/system/health
 * Returns genuine, real backend metrics and system health indicators
 */
healthRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dbStartTime = Date.now();
    let dbStatus = 'CONNECTED';
    let dbLatencyMs = 0;

    try {
      await db.query('SELECT 1');
      dbLatencyMs = Date.now() - dbStartTime;
    } catch (dbErr: any) {
      dbStatus = `DISCONNECTED (${dbErr.message})`;
    }

    // Real DB statistics
    const { rows: obsCountRow } = await db.query(`SELECT COUNT(*) as count FROM weather_observations`);
    const { rows: eventsCountRow } = await db.query(`SELECT COUNT(*) as count FROM weather_events WHERE status = 'ACTIVE'`);
    const { rows: reportsCountRow } = await db.query(`SELECT COUNT(*) as count FROM citizen_reports`);
    const { rows: verifiedReportsRow } = await db.query(`SELECT COUNT(*) as count FROM citizen_reports WHERE status = 'VERIFIED'`);

    // Ingestion counts in last 1 minute
    const { rows: rpmRow } = await db.query(
      `SELECT COALESCE(SUM(records_count), 0) as rpm
       FROM ingestion_logs
       WHERE created_at >= NOW() - INTERVAL '1 minute'`
    );

    // Failed requests in last 24 hours
    const { rows: failedRow } = await db.query(
      `SELECT COUNT(*) as failed_count
       FROM ingestion_logs
       WHERE status = 'FAILED' AND created_at >= NOW() - INTERVAL '24 hours'`
    );

    // Latest successful ingestion timestamp
    const { rows: latestLog } = await db.query(
      `SELECT created_at, duration_ms, source, status
       FROM ingestion_logs
       WHERE status = 'SUCCESS'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    const mem = process.memoryUsage();
    const ingestionStatus = ingestionEngine.getStatus();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryRssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        memoryHeapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      },
      database: {
        engine: db.isPgLite ? 'PostgreSQL WASM (PGlite Embedded)' : 'PostgreSQL Dedicated Client (pg)',
        status: dbStatus,
        queryLatencyMs: dbLatencyMs,
        totalObservations: parseInt(obsCountRow[0]?.count || '0', 10),
        activeEvents: parseInt(eventsCountRow[0]?.count || '0', 10),
        citizenReports: parseInt(reportsCountRow[0]?.count || '0', 10),
        verifiedReports: parseInt(verifiedReportsRow[0]?.count || '0', 10),
      },
      ingestion: {
        isIngesting: ingestionStatus.isIngesting,
        isDemoMode: ingestionStatus.isDemoMode,
        lastRunTime: latestLog[0]?.created_at || ingestionStatus.lastRunTime || 'NOT AVAILABLE',
        ingestionLatencyMs: latestLog[0]?.duration_ms || ingestionStatus.lastLatencyMs,
        recordsPerMinute: parseInt(rpmRow[0]?.rpm || '0', 10),
        failedRequests24h: parseInt(failedRow[0]?.failed_count || '0', 10),
      },
      realtime: {
        transport: 'Server-Sent Events (SSE)',
        activeConnections: sseManager.getConnectionCount(),
      },
      apiAvailability: {
        openMeteo: ingestionStatus.isDemoMode ? 'DEGRADED / SIMULATED' : 'ONLINE',
        openAQ: process.env.OPENAQ_API_KEY ? 'ONLINE' : 'CONFIG_REQUIRED',
        openWeather: process.env.OPENWEATHER_API_KEY ? 'ONLINE' : 'NOT_CONFIGURED',
        imd: 'NOT CONNECTED (Adapter Ready)',
        satellite: 'NOT CONNECTED (Adapter Ready)',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
