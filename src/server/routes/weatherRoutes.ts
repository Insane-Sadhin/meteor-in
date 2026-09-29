import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/database.ts';
import { OpenMeteoProvider } from '../services/weather/openMeteo.ts';
import { getCityById } from '../data/cities.ts';

export const weatherRouter = Router();
const openMeteo = new OpenMeteoProvider();

/**
 * GET /api/weather/current
 * Returns latest observation for each location station
 */
weatherRouter.get('/current', async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    // Query latest observation per station using DISTINCT ON (location_id)
    const { rows: observations } = await db.query(
      `SELECT DISTINCT ON (o.location_id)
         o.*,
         l.city,
         l.district,
         l.state,
         l.elevation,
         l.region,
         l.is_major_station
       FROM weather_observations o
       JOIN locations l ON o.location_id = l.id
       ORDER BY o.location_id, o.observed_at DESC`
    );

    // Get active events count
    const { rows: events } = await db.query(
      `SELECT e.*, l.city, l.state
       FROM weather_events e
       JOIN locations l ON e.location_id = l.id
       WHERE e.status = 'ACTIVE'
       ORDER BY e.detected_at DESC`
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: observations.length,
      activeEventsCount: events.length,
      activeEvents: events,
      observations,
    });
  } catch (err: any) {
    console.error('[Weather Route Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/weather/station/:id
 * Detailed station data including next 48h hourly and 7-day daily forecast
 */
weatherRouter.get('/station/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const city = getCityById(id);
    if (!city) {
      return res.status(404).json({ success: false, error: `Station '${id}' not found` });
    }

    const db = await getDb();

    // Fetch latest observation from DB
    const { rows: latestObs } = await db.query(
      `SELECT * FROM weather_observations
       WHERE location_id = $1
       ORDER BY observed_at DESC
       LIMIT 1`,
      [id]
    );

    // Fetch live hourly and forecast from Open-Meteo
    let hourly = [];
    let forecast = [];
    try {
      [hourly, forecast] = await Promise.all([
        openMeteo.getHourlyWeather(city.latitude, city.longitude),
        openMeteo.getForecast(city.latitude, city.longitude),
      ]);
    } catch (apiErr: any) {
      console.warn(`[Station Detail API Warning] ${apiErr.message}`);
    }

    res.json({
      success: true,
      station: city,
      latestObservation: latestObs[0] || null,
      hourly,
      forecast,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/weather/events
 * Returns active system-detected meteorological events
 */
weatherRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { rows: events } = await db.query(
      `SELECT e.*, l.city, l.district, l.state, l.latitude, l.longitude
       FROM weather_events e
       JOIN locations l ON e.location_id = l.id
       WHERE e.status = 'ACTIVE'
       ORDER BY e.detected_at DESC
       LIMIT 50`
    );

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/weather/trends
 * Aggregated trends across India for analytical charts
 */
weatherRouter.get('/trends', async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    // Regional temperature & rainfall summaries
    const { rows: regionalSummary } = await db.query(
      `SELECT 
         l.region,
         ROUND(AVG(o.temperature)::numeric, 1) as avg_temp,
         ROUND(MAX(o.temperature)::numeric, 1) as max_temp,
         ROUND(MIN(o.temperature)::numeric, 1) as min_temp,
         ROUND(AVG(o.humidity)::numeric, 0) as avg_humidity,
         ROUND(SUM(o.precipitation)::numeric, 1) as total_rain,
         ROUND(AVG(o.wind_speed)::numeric, 1) as avg_wind
       FROM weather_observations o
       JOIN locations l ON o.location_id = l.id
       WHERE o.observed_at >= NOW() - INTERVAL '24 hours'
       GROUP BY l.region
       ORDER BY avg_temp DESC`
    );

    // Top hottest and coolest cities
    const { rows: extremeTemps } = await db.query(
      `SELECT DISTINCT ON (o.location_id)
         l.city, l.state, o.temperature, o.weather_condition
       FROM weather_observations o
       JOIN locations l ON o.location_id = l.id
       ORDER BY o.location_id, o.observed_at DESC`
    );

    const sortedByTemp = [...extremeTemps].sort((a, b) => b.temperature - a.temperature);
    const hottest = sortedByTemp.slice(0, 5);
    const coolest = [...sortedByTemp].reverse().slice(0, 5);

    res.json({
      success: true,
      regionalSummary,
      hottest,
      coolest,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
