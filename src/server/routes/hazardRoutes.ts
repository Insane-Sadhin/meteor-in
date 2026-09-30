import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { FreeAirQualityService } from '../services/environmental/freeAirQuality.ts';
import { SeismicAndMarineService } from '../services/hazards/seismicService.ts';

export const hazardRouter = Router();

/**
 * GET /api/environmental/air-quality
 * Real-time free national air quality metrics (PM2.5, PM10, Indian NAQI)
 */
hazardRouter.get('/air-quality', async (req: Request, res: Response) => {
  try {
    const airQualityData = await FreeAirQualityService.getNationalAirQuality();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: airQualityData.length,
      airQuality: airQualityData,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/hazards/seismic
 * Live USGS seismic & tectonic early warning feed for Indian subcontinent
 */
hazardRouter.get('/seismic', async (req: Request, res: Response) => {
  try {
    const seismicEvents = await SeismicAndMarineService.getSeismicActivity();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: seismicEvents.length,
      events: seismicEvents,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/hazards/marine
 * Coastal marine sea-state, wave heights, and swell direction for Indian peninsular coasts
 */
hazardRouter.get('/marine', async (req: Request, res: Response) => {
  try {
    const marinePoints = await SeismicAndMarineService.getCoastalMarineConditions();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: marinePoints.length,
      coastalData: marinePoints,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/hazards/radar
 * RainViewer free live radar frames metadata for Doppler radar animation
 */
hazardRouter.get('/radar', async (req: Request, res: Response) => {
  try {
    const response = await axios.get('https://api.rainviewer.com/public/weather-maps.json', { timeout: 6000 });
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: response.data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
