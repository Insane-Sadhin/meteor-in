import { getDb } from '../../db/database.ts';
import { INDIAN_CITIES } from '../../data/cities.ts';
import { OpenMeteoProvider } from '../weather/openMeteo.ts';
import { OpenWeatherProvider } from '../weather/openWeather.ts';
import { OpenAQService } from '../environmental/openAQ.ts';
import { EventClassifier } from '../weather/eventClassifier.ts';
import { sseManager } from '../realtime/sseManager.ts';
import type { NormalizedWeather, IngestionLogEntry } from '../weather/weatherTypes.ts';

export class IngestionEngine {
  private static instance: IngestionEngine;
  private openMeteo: OpenMeteoProvider;
  private openWeather: OpenWeatherProvider;
  private openAQ: OpenAQService;
  private weatherPollTimer: NodeJS.Timeout | null = null;
  private openAQAryPollTimer: NodeJS.Timeout | null = null;
  private isIngesting = false;
  private isDemoMode = false;

  private lastRunTime: string | null = null;
  private lastLatencyMs = 0;
  private lastRecordsCount = 0;
  private totalIngestedCount = 0;
  private startTime = Date.now();

  private constructor() {
    this.openMeteo = new OpenMeteoProvider();
    this.openWeather = new OpenWeatherProvider();
    this.openAQ = new OpenAQService();
  }

  public static getInstance(): IngestionEngine {
    if (!IngestionEngine.instance) {
      IngestionEngine.instance = new IngestionEngine();
    }
    return IngestionEngine.instance;
  }

  public getStatus() {
    return {
      isIngesting: this.isIngesting,
      isDemoMode: this.isDemoMode,
      lastRunTime: this.lastRunTime,
      lastLatencyMs: this.lastLatencyMs,
      lastRecordsCount: this.lastRecordsCount,
      totalIngestedCount: this.totalIngestedCount,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  public async start(): Promise<void> {
    console.log('[Ingestion] Starting Meteorological Ingestion Engine...');

    await this.runWeatherIngestionCycle();

    if (this.openAQ.isAvailable()) {
      await this.runOpenAQCycle();
    }

    const intervalMs = parseInt(process.env.OPENMETEO_POLL_INTERVAL_MS || '300000', 10);
    this.weatherPollTimer = setInterval(async () => {
      await this.runWeatherIngestionCycle();
    }, intervalMs);

    const openAQIntervalMs = parseInt(process.env.OPENAQ_POLL_INTERVAL_MS || '600000', 10);
    this.openAQAryPollTimer = setInterval(async () => {
      if (this.openAQ.isAvailable()) {
        await this.runOpenAQCycle();
      }
    }, openAQIntervalMs);

    console.log(`[Ingestion] Scheduled polling active: Open-Meteo every ${intervalMs / 1000}s, OpenAQ every ${openAQIntervalMs / 1000}s.`);
  }

  public stop(): void {
    if (this.weatherPollTimer) clearInterval(this.weatherPollTimer);
    if (this.openAQAryPollTimer) clearInterval(this.openAQAryPollTimer);
    console.log('[Ingestion] Ingestion engine stopped.');
  }

  public async runWeatherIngestionCycle(): Promise<{ count: number; durationMs: number; status: string }> {
    if (this.isIngesting) {
      console.log('[Ingestion] Cycle already in progress, skipping overlapping execution.');
      return { count: 0, durationMs: 0, status: 'SKIPPED' };
    }

    this.isIngesting = true;
    const startTime = Date.now();
    const db = await getDb();
    let observationsIngested: NormalizedWeather[] = [];
    let httpCode = 200;
    let logStatus: 'SUCCESS' | 'FAILED' | 'WARNING' = 'SUCCESS';
    let logMessage = '';

    try {
      console.log(`[Ingestion] Ingesting real-time weather for ${INDIAN_CITIES.length} Indian stations from Open-Meteo API...`);

      const chunkSize = 25;
      for (let i = 0; i < INDIAN_CITIES.length; i += chunkSize) {
        const chunk = INDIAN_CITIES.slice(i, i + chunkSize);
        try {
          const batchRes = await this.openMeteo.getBatchCurrentWeather(
            chunk.map(c => ({ id: c.id, latitude: c.latitude, longitude: c.longitude }))
          );
          observationsIngested.push(...batchRes.results);
          httpCode = batchRes.httpCode;
        } catch (chunkErr: any) {
          console.warn(`[Ingestion] Batch chunk ${i}-${i + chunkSize} failed: ${chunkErr.message}`);
        }
      }

      if (observationsIngested.length > 0) {
        this.isDemoMode = false;
        logMessage = `${observationsIngested.length} locations updated from Open-Meteo`;
      } else {
        throw new Error('Zero observations returned from Open-Meteo API.');
      }
    } catch (err: any) {
      console.error(`[Ingestion Error] Open-Meteo ingestion error: ${err.message}`);
      httpCode = err.httpCode || 500;
      logStatus = 'WARNING';

      if (process.env.DEMO_FALLBACK_ENABLED !== 'false') {
        console.warn(`[Ingestion] Engaging DEMO MODE: Generating clearly labeled simulated baseline observations.`);
        this.isDemoMode = true;
        observationsIngested = this.generateSimulatedObservations();
        logMessage = `DEMO MODE: Simulated fallback generated for ${observationsIngested.length} locations (API Error: ${err.message})`;
      } else {
        logStatus = 'FAILED';
        logMessage = `Ingestion failed: ${err.message}`;
      }
    }

    const durationMs = Date.now() - startTime;
    this.lastRunTime = new Date().toISOString();
    this.lastLatencyMs = durationMs;
    this.lastRecordsCount = observationsIngested.length;
    this.totalIngestedCount += observationsIngested.length;

    if (observationsIngested.length > 0) {
      const allDetectedEvents = [];

      for (const obs of observationsIngested) {
        await db.query(
          `INSERT INTO weather_observations (
            source, location_id, observed_at, ingested_at, latitude, longitude,
            temperature, apparent_temperature, humidity, precipitation, rain,
            showers, snowfall, wind_speed, wind_direction, wind_gusts,
            pressure, cloud_cover, weather_code, weather_condition, is_simulated, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22::jsonb)`,
          [
            obs.source,
            obs.locationId,
            obs.observedAt,
            obs.ingestedAt,
            obs.latitude,
            obs.longitude,
            obs.temperature,
            obs.apparentTemperature || null,
            obs.humidity,
            obs.precipitation,
            obs.rain,
            obs.showers,
            obs.snowfall,
            obs.windSpeed,
            obs.windDirection,
            obs.windGusts || null,
            obs.pressure,
            obs.cloudCover,
            obs.weatherCode,
            obs.weatherCondition,
            obs.isSimulated || false,
            JSON.stringify(obs.rawPayload || {}),
          ]
        );

        const detectedEvents = EventClassifier.classifyObservation(obs);
        for (const ev of detectedEvents) {
          allDetectedEvents.push(ev);
          await db.query(
            `INSERT INTO weather_events (
              event_type, location_id, detected_at, severity, confidence,
              source, status, summary, rationale, affected_radius_km, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
            [
              ev.eventType,
              ev.locationId,
              ev.detectedAt,
              ev.severity,
              ev.confidence,
              ev.source,
              ev.status,
              ev.summary,
              ev.rationale,
              ev.affectedRadiusKm,
              JSON.stringify(ev.metadata || {}),
            ]
          );
        }
      }

      const statusText = this.isDemoMode ? 'DEGRADED' : 'ONLINE';
      await db.query(
        `UPDATE sources
         SET api_status = $1::varchar,
             last_checked_at = CURRENT_TIMESTAMP,
             last_success_at = CASE WHEN $2::varchar = 'ONLINE' THEN CURRENT_TIMESTAMP ELSE last_success_at END,
             latency_ms = $3,
             records_count = records_count + $4
         WHERE id = 'open-meteo'`,
        [statusText, statusText, durationMs, observationsIngested.length]
      );

      await db.query(
        `INSERT INTO system_metrics (metric_name, metric_value, metric_unit, metadata)
         VALUES ('ingestion_latency_ms', $1, 'ms', $2::jsonb),
                ('records_ingested', $3, 'count', $2::jsonb)`,
        [durationMs, JSON.stringify({ source: 'open-meteo', demoMode: this.isDemoMode }), observationsIngested.length]
      );

      sseManager.broadcast('weather:update', {
        timestamp: new Date().toISOString(),
        source: 'Open-Meteo',
        recordsCount: observationsIngested.length,
        isDemoMode: this.isDemoMode,
        latencyMs: durationMs,
        eventsCount: allDetectedEvents.length,
      });

      if (allDetectedEvents.length > 0) {
        sseManager.broadcast('event:detected', {
          count: allDetectedEvents.length,
          events: allDetectedEvents.slice(0, 5),
        });
      }
    }

    const nowTimeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    const formattedConsoleLog = `[${nowTimeStr}] OPEN-METEO India ${logStatus} HTTP ${httpCode} ${logMessage} (${durationMs}ms)`;
    console.log(formattedConsoleLog);

    await db.query(
      `INSERT INTO ingestion_logs (source, location, status, http_code, message, records_count, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Open-Meteo', 'India All-Stations', logStatus, httpCode, logMessage, observationsIngested.length, durationMs]
    );

    sseManager.broadcast('ingestion:log', {
      source: 'Open-Meteo',
      location: 'India All-Stations',
      status: logStatus,
      httpCode,
      message: logMessage,
      recordsCount: observationsIngested.length,
      durationMs,
      timestamp: new Date().toISOString(),
    });

    this.isIngesting = false;
    return {
      count: observationsIngested.length,
      durationMs,
      status: logStatus,
    };
  }

  public async runOpenAQCycle(): Promise<void> {
    const db = await getDb();
    const nowTimeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });

    if (!this.openAQ.isAvailable()) {
      console.log(`[${nowTimeStr}] OPENAQ India CONFIG_REQUIRED OPENAQ CONFIGURATION REQUIRED`);
      await db.query(
        `UPDATE sources SET api_status = 'CONFIG_REQUIRED', last_checked_at = CURRENT_TIMESTAMP WHERE id = 'openaq'`
      );
      return;
    }

    try {
      const res = await this.openAQ.getLatestIndiaMeasurements();
      const status = res.httpCode === 200 ? 'SUCCESS' : 'WARNING';
      const logMsg = `${res.measurements.length} measurements received`;

      console.log(`[${nowTimeStr}] OPENAQ India ${status} ${logMsg}`);

      await db.query(
        `INSERT INTO ingestion_logs (source, location, status, http_code, message, records_count, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['OpenAQ', 'India Air Quality', status, res.httpCode, logMsg, res.measurements.length, res.durationMs]
      );

      await db.query(
        `UPDATE sources
         SET api_status = 'ONLINE',
             last_checked_at = CURRENT_TIMESTAMP,
             last_success_at = CURRENT_TIMESTAMP,
             latency_ms = $1,
             records_count = records_count + $2
         WHERE id = 'openaq'`,
        [res.durationMs, res.measurements.length]
      );
    } catch (err: any) {
      console.error(`[OpenAQ Error] ${err.message}`);
    }
  }

  private generateSimulatedObservations(): NormalizedWeather[] {
    const now = new Date();
    return INDIAN_CITIES.map(city => {
      const isHighAltitude = city.elevation > 1500;
      const baseTemp = isHighAltitude ? 14 : (24 + (30 - city.latitude) * 0.4);
      const isMonsoonCoastal = ['Mumbai', 'Panaji', 'Kochi', 'Thiruvananthapuram', 'Kolkata'].includes(city.city);
      const rain = isMonsoonCoastal ? Math.round(Math.random() * 22 * 10) / 10 : (Math.random() > 0.8 ? 5.2 : 0);
      const temp = Math.round((baseTemp + (Math.sin(city.longitude) * 3)) * 10) / 10;
      const humidity = isMonsoonCoastal ? Math.floor(75 + Math.random() * 20) : Math.floor(45 + Math.random() * 30);
      const windSpeed = Math.round((12 + Math.random() * 25) * 10) / 10;

      let weatherCode = 1;
      let weatherCondition = 'Mainly clear';

      if (rain > 15) {
        weatherCode = 65;
        weatherCondition = 'Rain: Heavy intensity';
      } else if (rain > 0) {
        weatherCode = 61;
        weatherCondition = 'Rain: Slight intensity';
      } else if (temp > 40) {
        weatherCode = 0;
        weatherCondition = 'Clear sky: Extreme heat';
      }

      return {
        source: 'DEMO / SIMULATED',
        locationId: city.id,
        latitude: city.latitude,
        longitude: city.longitude,
        observedAt: now.toISOString(),
        ingestedAt: now.toISOString(),
        temperature: temp,
        apparentTemperature: temp + (humidity > 60 ? 3 : 0),
        humidity,
        precipitation: rain,
        rain,
        showers: 0,
        snowfall: 0,
        windSpeed,
        windDirection: Math.floor(Math.random() * 360),
        windGusts: windSpeed + 10,
        pressure: Math.round(1013 - (city.elevation / 8.5)),
        cloudCover: rain > 0 ? 85 : 25,
        weatherCode,
        weatherCondition,
        isSimulated: true,
        rawPayload: { simulated: true, notice: 'DEMO MODE - Simulated Fallback Data' },
      };
    });
  }
}

export const ingestionEngine = IngestionEngine.getInstance();
