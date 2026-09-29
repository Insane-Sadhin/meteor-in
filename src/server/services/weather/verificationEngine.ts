import { getDb } from '../../db/database.ts';
import type { CitizenReport, VerificationRecord } from './weatherTypes.ts';

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class VerificationEngine {
  static async verifyReport(report: CitizenReport): Promise<VerificationRecord> {
    const db = await getDb();
    const reportTime = new Date(report.observedAt).getTime();

    const { rows: observations } = await db.query(
      `SELECT o.*, l.city, l.state
       FROM weather_observations o
       JOIN locations l ON o.location_id = l.id
       ORDER BY o.observed_at DESC
       LIMIT 100`
    );

    if (observations.length === 0) {
      return {
        reportId: report.id || 0,
        status: 'UNVERIFIED',
        confidence: 0.35,
        distanceKm: 0,
        timeDiffMinutes: 0,
        rationale: 'No baseline meteorological observations currently available for ground-truth correlation.',
        verifiedAt: new Date().toISOString(),
      };
    }

    let bestObservation: any = null;
    let minDistanceKm = Infinity;
    let minTimeDiffMin = Infinity;

    for (const obs of observations) {
      const dist = calculateDistanceKm(report.latitude, report.longitude, obs.latitude, obs.longitude);
      const obsTime = new Date(obs.observed_at).getTime();
      const timeDiffMin = Math.abs(reportTime - obsTime) / (1000 * 60);

      if (dist < 75 && timeDiffMin < 180) {
        if (!bestObservation || dist < minDistanceKm) {
          bestObservation = obs;
          minDistanceKm = dist;
          minTimeDiffMin = timeDiffMin;
        }
      }
    }

    if (!bestObservation) {
      for (const obs of observations) {
        const dist = calculateDistanceKm(report.latitude, report.longitude, obs.latitude, obs.longitude);
        const obsTime = new Date(obs.observed_at).getTime();
        const timeDiffMin = Math.abs(reportTime - obsTime) / (1000 * 60);
        if (dist < minDistanceKm) {
          bestObservation = obs;
          minDistanceKm = dist;
          minTimeDiffMin = timeDiffMin;
        }
      }
    }

    const obs = bestObservation;
    const distanceKm = Math.round(minDistanceKm * 10) / 10;
    const timeDiffMinutes = Math.round(minTimeDiffMin);

    const eventType = report.eventType.toLowerCase();
    const rain = (obs.precipitation || 0) + (obs.rain || 0);
    const wind = obs.wind_speed || 0;
    const temp = obs.temperature || 0;
    const weatherCode = obs.weather_code || 0;

    let isCorrelated = false;
    let isContradicted = false;
    let baseConfidence = 0.50;
    let rationale = '';

    if (eventType.includes('rain') || eventType.includes('flood') || eventType.includes('waterlog')) {
      if (rain >= 10.0) {
        isCorrelated = true;
        baseConfidence = 0.88;
        rationale = `Citizen reported ${report.eventType}. Station ${obs.city} (${distanceKm} km away) recorded substantial rainfall of ${rain.toFixed(1)} mm/h at ${new Date(obs.observed_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST (Δt = ${timeDiffMinutes} min). Ground truth highly correlated.`;
      } else if (rain > 1.0) {
        isCorrelated = true;
        baseConfidence = 0.72;
        rationale = `Citizen reported ${report.eventType}. Station ${obs.city} (${distanceKm} km away) observed light to moderate rain (${rain.toFixed(1)} mm/h). Partially correlated.`;
      } else if (rain === 0 && distanceKm < 15 && timeDiffMinutes < 30 && obs.cloud_cover < 30) {
        isContradicted = true;
        baseConfidence = 0.82;
        rationale = `Citizen reported ${report.eventType}, but closest station ${obs.city} (${distanceKm} km away) recorded 0.0 mm rainfall with clear/scattered skies (${obs.cloud_cover}% clouds).`;
      } else {
        isCorrelated = false;
        baseConfidence = 0.45;
        rationale = `Citizen reported ${report.eventType}. Nearby station ${obs.city} (${distanceKm} km) recorded 0.0 mm precipitation. Possible localized convective cloudburst not captured by central station.`;
      }
    } else if (eventType.includes('thunderstorm') || eventType.includes('lightning') || eventType.includes('hail')) {
      const isThunderCode = [95, 96, 99].includes(weatherCode);
      if (isThunderCode || (rain > 5.0 && wind > 30)) {
        isCorrelated = true;
        baseConfidence = 0.89;
        rationale = `Citizen reported ${report.eventType}. Station ${obs.city} (${distanceKm} km away) recorded convective thunderstorm signature (WMO code ${weatherCode}, gusts ${wind.toFixed(0)} km/h).`;
      } else {
        baseConfidence = 0.50;
        rationale = `Station ${obs.city} (${distanceKm} km away) shows ${obs.weather_condition}. Convective cells may be isolated.`;
      }
    } else if (eventType.includes('wind') || eventType.includes('gale') || eventType.includes('squall')) {
      if (wind >= 35.0) {
        isCorrelated = true;
        baseConfidence = 0.86;
        rationale = `Citizen reported strong winds. Station ${obs.city} (${distanceKm} km away) registered high winds of ${wind.toFixed(0)} km/h.`;
      } else {
        baseConfidence = 0.52;
        rationale = `Station ${obs.city} recorded wind speed of ${wind.toFixed(0)} km/h. Moderate correlation.`;
      }
    } else if (eventType.includes('heat') || eventType.includes('sunstroke')) {
      if (temp >= 40.0) {
        isCorrelated = true;
        baseConfidence = 0.92;
        rationale = `Citizen reported intense heat. Station ${obs.city} recorded severe ambient temperature of ${temp.toFixed(1)}°C.`;
      } else {
        baseConfidence = 0.60;
        rationale = `Station ${obs.city} recorded temperature of ${temp.toFixed(1)}°C.`;
      }
    } else if (eventType.includes('fog')) {
      if (obs.humidity >= 90 || [45, 48].includes(weatherCode)) {
        isCorrelated = true;
        baseConfidence = 0.85;
        rationale = `Citizen reported dense fog. Station ${obs.city} reported high relative humidity of ${obs.humidity}% with low visibility.`;
      } else {
        baseConfidence = 0.48;
        rationale = `Station ${obs.city} shows humidity of ${obs.humidity}%.`;
      }
    } else {
      baseConfidence = 0.65;
      rationale = `Report compared with station ${obs.city} (${distanceKm} km away, ${obs.weather_condition}, ${temp.toFixed(1)}°C).`;
    }

    let distanceFactor = 1.0;
    if (distanceKm > 10) distanceFactor = Math.max(0.6, 1.0 - (distanceKm - 10) * 0.015);
    let timeFactor = 1.0;
    if (timeDiffMinutes > 15) timeFactor = Math.max(0.7, 1.0 - (timeDiffMinutes - 15) * 0.005);

    const finalConfidence = Math.min(0.98, Math.max(0.20, Math.round(baseConfidence * distanceFactor * timeFactor * 100) / 100));
    const status: VerificationRecord['status'] = isContradicted ? 'CONTRADICTED' : (isCorrelated ? 'CORRELATED' : 'UNVERIFIED');

    return {
      reportId: report.id || 0,
      status,
      confidence: finalConfidence,
      correlatedObservationId: obs.id,
      distanceKm,
      timeDiffMinutes,
      rationale,
      verifiedAt: new Date().toISOString(),
      stationData: {
        stationName: `${obs.city}, ${obs.state}`,
        temperature: obs.temperature,
        rain,
        windSpeed: obs.wind_speed,
        weatherCondition: obs.weather_condition,
        observedAt: obs.observed_at,
      },
    };
  }
}
