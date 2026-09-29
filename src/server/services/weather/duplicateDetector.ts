import type { CitizenReport } from './weatherTypes.ts';
import { calculateDistanceKm } from './verificationEngine.ts';
import { getDb } from '../../db/database.ts';

export interface DuplicateCheckResult {
  isPossibleDuplicate: boolean;
  duplicateOfId?: number;
  similarityScore: number;
  reasons: string[];
}

export class DuplicateDetector {
  static async checkForDuplicates(report: CitizenReport): Promise<DuplicateCheckResult> {
    const db = await getDb();

    const { rows: recentReports } = await db.query(
      `SELECT * FROM citizen_reports
       WHERE id != COALESCE($1, -1)
         AND status != 'REJECTED'
         AND submitted_at >= NOW() - INTERVAL '6 hours'
       ORDER BY submitted_at DESC
       LIMIT 50`,
      [report.id || -1]
    );

    let highestScore = 0;
    let duplicateMatch: any = null;
    let matchReasons: string[] = [];

    const reportTime = new Date(report.observedAt).getTime();
    const reportTokens = this.tokenizeText(report.description);

    for (const other of recentReports) {
      const reasons: string[] = [];
      let score = 0;

      const distance = calculateDistanceKm(report.latitude, report.longitude, other.latitude, other.longitude);
      if (distance <= 3.0) {
        score += 0.40;
        reasons.push(`Close geographic proximity (${distance.toFixed(1)} km)`);
      } else if (distance <= 8.0) {
        score += 0.25;
        reasons.push(`Moderate proximity (${distance.toFixed(1)} km)`);
      }

      const otherTime = new Date(other.observed_at || other.submitted_at).getTime();
      const timeDiffMinutes = Math.abs(reportTime - otherTime) / (1000 * 60);

      if (timeDiffMinutes <= 20) {
        score += 0.25;
        reasons.push(`Coincident observation window (Δt = ${Math.round(timeDiffMinutes)} min)`);
      } else if (timeDiffMinutes <= 60) {
        score += 0.15;
        reasons.push(`Within 1 hour (Δt = ${Math.round(timeDiffMinutes)} min)`);
      }

      if (report.eventType.toLowerCase() === other.event_type.toLowerCase()) {
        score += 0.20;
        reasons.push(`Identical event category: ${report.eventType}`);
      }

      const otherTokens = this.tokenizeText(other.description);
      const textSim = this.calculateJaccardSimilarity(reportTokens, otherTokens);
      if (textSim >= 0.5) {
        score += 0.25;
        reasons.push(`High textual similarity (${Math.round(textSim * 100)}%)`);
      } else if (textSim >= 0.25) {
        score += 0.15;
        reasons.push(`Partial textual overlap (${Math.round(textSim * 100)}%)`);
      }

      if (score > highestScore) {
        highestScore = score;
        duplicateMatch = other;
        matchReasons = reasons;
      }
    }

    const isPossibleDuplicate = highestScore >= 0.65;

    return {
      isPossibleDuplicate,
      duplicateOfId: isPossibleDuplicate ? duplicateMatch?.id : undefined,
      similarityScore: Math.min(1.0, Math.round(highestScore * 100) / 100),
      reasons: matchReasons,
    };
  }

  private static tokenizeText(text: string): Set<string> {
    const stopWords = new Set(['the', 'and', 'is', 'in', 'at', 'of', 'a', 'to', 'for', 'with', 'on', 'very', 'heavy']);
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
    return new Set(words);
  }

  private static calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}
