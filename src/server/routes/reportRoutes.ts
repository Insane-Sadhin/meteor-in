import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/database.ts';
import { VerificationEngine } from '../services/weather/verificationEngine.ts';
import { DuplicateDetector } from '../services/weather/duplicateDetector.ts';
import { sseManager } from '../services/realtime/sseManager.ts';
import type { CitizenReport } from '../services/weather/weatherTypes.ts';

export const reportRouter = Router();

/**
 * GET /api/reports
 * Retrieve citizen reports with verification records
 */
reportRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { rows: reports } = await db.query(
      `SELECT 
         r.*,
         v.status as verification_status,
         v.confidence as verification_confidence,
         v.distance_km,
         v.time_diff_minutes,
         v.rationale as verification_rationale,
         v.verified_at
       FROM citizen_reports r
       LEFT JOIN verification_records v ON r.id = v.report_id
       ORDER BY r.submitted_at DESC
       LIMIT 100`
    );

    res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/reports
 * Submit a new citizen report with instant ground-truth verification and duplicate detection
 */
reportRouter.post('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const {
      eventType,
      description,
      locationName,
      latitude,
      longitude,
      mediaUrl,
      mediaType = 'none',
      reporterName = 'Anonymous Citizen',
      observedAt,
    } = req.body;

    if (!eventType || !description || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required report fields (eventType, description, latitude, longitude)',
      });
    }

    const reportData: CitizenReport = {
      eventType,
      description,
      locationName: locationName || `Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      mediaUrl,
      mediaType,
      reporterName,
      status: 'UNDER REVIEW',
      observedAt: observedAt || new Date().toISOString(),
    };

    // 1. Run Duplicate Detection
    const duplicateCheck = await DuplicateDetector.checkForDuplicates(reportData);
    let initialStatus: CitizenReport['status'] = 'UNDER REVIEW';
    let duplicateOfId: number | null = null;

    if (duplicateCheck.isPossibleDuplicate && duplicateCheck.duplicateOfId) {
      initialStatus = 'DUPLICATE';
      duplicateOfId = duplicateCheck.duplicateOfId;
    }

    // 2. Insert Report into Database
    const { rows: reportInsert } = await db.query(
      `INSERT INTO citizen_reports (
        event_type, description, location_name, latitude, longitude,
        media_url, media_type, reporter_name, status, observed_at,
        duplicate_of_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        reportData.eventType,
        reportData.description,
        reportData.locationName,
        reportData.latitude,
        reportData.longitude,
        reportData.mediaUrl || null,
        reportData.mediaType,
        reportData.reporterName,
        initialStatus,
        reportData.observedAt,
        duplicateOfId,
        JSON.stringify({ duplicateReasons: duplicateCheck.reasons, similarityScore: duplicateCheck.similarityScore }),
      ]
    );

    const savedReport = reportInsert[0];

    // 3. Run Ground-Truth Verification Engine
    const verification = await VerificationEngine.verifyReport({
      ...reportData,
      id: savedReport.id,
    });

    // Save verification record
    const { rows: verifInsert } = await db.query(
      `INSERT INTO verification_records (
        report_id, status, confidence, correlated_observation_id,
        distance_km, time_diff_minutes, rationale, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        savedReport.id,
        verification.status,
        verification.confidence,
        verification.correlatedObservationId || null,
        verification.distanceKm,
        verification.timeDiffMinutes,
        verification.rationale,
        JSON.stringify(verification.stationData || {}),
      ]
    );

    // If verification was strongly correlated and not duplicate, update status to VERIFIED
    if (verification.status === 'CORRELATED' && verification.confidence >= 0.75 && initialStatus !== 'DUPLICATE') {
      await db.query(`UPDATE citizen_reports SET status = 'VERIFIED' WHERE id = $1`, [savedReport.id]);
      savedReport.status = 'VERIFIED';
    } else if (verification.status === 'CONTRADICTED') {
      await db.query(`UPDATE citizen_reports SET status = 'CONTRADICTED' WHERE id = $1`, [savedReport.id]);
      savedReport.status = 'CONTRADICTED';
    }

    // Insert Audit Log
    await db.query(
      `INSERT INTO audit_logs (action, actor, entity_type, entity_id, details)
       VALUES ('SUBMIT_REPORT', $1, 'citizen_report', $2, $3)`,
      [reportData.reporterName, savedReport.id.toString(), `Submitted ${reportData.eventType} report at ${reportData.locationName}`]
    );

    // Broadcast Real-time Event via SSE
    const fullReportPayload = {
      ...savedReport,
      verification_status: verification.status,
      verification_confidence: verification.confidence,
      distance_km: verification.distanceKm,
      time_diff_minutes: verification.timeDiffMinutes,
      verification_rationale: verification.rationale,
    };

    sseManager.broadcast('report:new', fullReportPayload);

    res.status(201).json({
      success: true,
      report: fullReportPayload,
      verification,
      duplicateCheck,
    });
  } catch (err: any) {
    console.error('[Report Submission Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/reports/:id/status
 * Update report status (admin review action)
 */
reportRouter.post('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, actor = 'Administrator', rationale } = req.body;

    const db = await getDb();
    const { rows: updated } = await db.query(
      `UPDATE citizen_reports
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (updated.length === 0) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    await db.query(
      `INSERT INTO audit_logs (action, actor, entity_type, entity_id, details)
       VALUES ('UPDATE_REPORT_STATUS', $1, 'citizen_report', $2, $3)`,
      [actor, id, `Status updated to ${status}. Notes: ${rationale || 'N/A'}`]
    );

    sseManager.broadcast('report:updated', { id, status });

    res.json({ success: true, report: updated[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/reports/merge
 * Merge a duplicate report into a primary report
 */
reportRouter.post('/merge', async (req: Request, res: Response) => {
  try {
    const { primaryId, duplicateId, actor = 'Administrator' } = req.body;
    const db = await getDb();

    await db.query(
      `UPDATE citizen_reports
       SET status = 'DUPLICATE', duplicate_of_id = $1
       WHERE id = $2`,
      [primaryId, duplicateId]
    );

    await db.query(
      `INSERT INTO audit_logs (action, actor, entity_type, entity_id, details)
       VALUES ('MERGE_DUPLICATE_REPORT', $1, 'citizen_report', $2, $3)`,
      [actor, duplicateId.toString(), `Merged as duplicate of Report #${primaryId}`]
    );

    res.json({ success: true, message: `Report #${duplicateId} merged into Report #${primaryId}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
