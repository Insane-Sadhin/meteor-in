import axios, { type AxiosInstance } from 'axios';
import type { WeatherProvider } from './weatherProvider.ts';
import type {
  NormalizedWeather,
  HourlyWeatherPoint,
  DailyForecastPoint,
} from './weatherTypes.ts';
import { interpretWeatherCode } from './weatherNormalizer.ts';

interface CacheEntry {
  data: any;
  timestamp: number;
}

export class OpenMeteoProvider implements WeatherProvider {
  name = 'Open-Meteo Weather API';
  code = 'OPEN_METEO';

  private baseUrl: string;
  private client: AxiosInstance;
  private cache: Map<string, CacheEntry> = new Map();
  private lastKnownGood: Map<string, NormalizedWeather> = new Map();
  private cacheTtlMs = 3 * 60 * 1000; // 3 minutes cache

  constructor() {
    this.baseUrl = process.env.OPENMETEO_BASE_URL || 'https://api.open-meteo.com/v1/forecast';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10),
      headers: {
        'User-Agent': 'Meteor-IN-WeatherIntelligence/1.0',
        'Accept': 'application/json',
      },
    });
  }

  isConfigured(): boolean {
    return true;
  }

  async getCurrentWeather(lat: number, lon: number, locationId = 'unknown'): Promise<NormalizedWeather> {
    const cacheKey = `curr_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    const params = {
      latitude: lat,
      longitude: lon,
      current: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'precipitation',
        'rain',
        'showers',
        'snowfall',
        'weather_code',
        'cloud_cover',
        'surface_pressure',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
      ].join(','),
      timezone: 'Asia/Kolkata',
    };

    let attempts = 0;
    const maxAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10);
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const startTime = Date.now();
        const response = await this.client.get('', { params });
        const latency = Date.now() - startTime;

        const current = response.data.current;
        if (!current) {
          throw new Error('Malformed Open-Meteo response: current field missing');
        }

        const weatherInfo = interpretWeatherCode(current.weather_code ?? 0);

        const normalized: NormalizedWeather = {
          source: 'Open-Meteo',
          locationId,
          latitude: lat,
          longitude: lon,
          observedAt: current.time ? new Date(current.time + '+05:30').toISOString() : new Date().toISOString(),
          ingestedAt: new Date().toISOString(),
          temperature: current.temperature_2m ?? 0,
          apparentTemperature: current.apparent_temperature,
          humidity: current.relative_humidity_2m ?? 0,
          precipitation: current.precipitation ?? 0,
          rain: current.rain ?? 0,
          showers: current.showers ?? 0,
          snowfall: current.snowfall ?? 0,
          windSpeed: current.wind_speed_10m ?? 0,
          windDirection: current.wind_direction_10m ?? 0,
          windGusts: current.wind_gusts_10m,
          pressure: current.surface_pressure ?? 1013.25,
          cloudCover: current.cloud_cover ?? 0,
          weatherCode: current.weather_code ?? 0,
          weatherCondition: weatherInfo.condition,
          isSimulated: false,
          rawPayload: response.data,
        };

        this.cache.set(cacheKey, { data: normalized, timestamp: Date.now() });
        this.lastKnownGood.set(locationId, normalized);

        return normalized;
      } catch (err: any) {
        lastError = err;
        const delay = Math.pow(2, attempts) * 500;
        console.warn(`[Open-Meteo] Request failed for (${lat}, ${lon}) attempt ${attempts}/${maxAttempts}: ${err.message}. Retrying in ${delay}ms...`);
        if (attempts < maxAttempts) {
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }

    const lastGood = this.lastKnownGood.get(locationId);
    if (lastGood) {
      console.warn(`[Open-Meteo] Returning last known good data for ${locationId} from ${lastGood.observedAt}`);
      return lastGood;
    }

    throw new Error(`Open-Meteo API unreachable after ${maxAttempts} attempts: ${lastError?.message}`);
  }

  async getBatchCurrentWeather(
    locations: Array<{ id: string; latitude: number; longitude: number }>
  ): Promise<{ results: NormalizedWeather[]; durationMs: number; httpCode: number }> {
    if (locations.length === 0) {
      return { results: [], durationMs: 0, httpCode: 200 };
    }

    const startTime = Date.now();
    const lats = locations.map(l => l.latitude.toFixed(4)).join(',');
    const lons = locations.map(l => l.longitude.toFixed(4)).join(',');

    const params = {
      latitude: lats,
      longitude: lons,
      current: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'precipitation',
        'rain',
        'showers',
        'snowfall',
        'weather_code',
        'cloud_cover',
        'surface_pressure',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
      ].join(','),
      timezone: 'Asia/Kolkata',
    };

    try {
      const response = await this.client.get('', { params });
      const durationMs = Date.now() - startTime;
      const data = response.data;

      const results: NormalizedWeather[] = [];
      const isArrayResponse = Array.isArray(data);

      locations.forEach((loc, index) => {
        const itemData = isArrayResponse ? data[index] : (index === 0 ? data : null);
        if (!itemData || !itemData.current) return;

        const current = itemData.current;
        const weatherInfo = interpretWeatherCode(current.weather_code ?? 0);

        const normalized: NormalizedWeather = {
          source: 'Open-Meteo',
          locationId: loc.id,
          latitude: loc.latitude,
          longitude: loc.longitude,
          observedAt: current.time ? new Date(current.time + '+05:30').toISOString() : new Date().toISOString(),
          ingestedAt: new Date().toISOString(),
          temperature: current.temperature_2m ?? 0,
          apparentTemperature: current.apparent_temperature,
          humidity: current.relative_humidity_2m ?? 0,
          precipitation: current.precipitation ?? 0,
          rain: current.rain ?? 0,
          showers: current.showers ?? 0,
          snowfall: current.snowfall ?? 0,
          windSpeed: current.wind_speed_10m ?? 0,
          windDirection: current.wind_direction_10m ?? 0,
          windGusts: current.wind_gusts_10m,
          pressure: current.surface_pressure ?? 1013.25,
          cloudCover: current.cloud_cover ?? 0,
          weatherCode: current.weather_code ?? 0,
          weatherCondition: weatherInfo.condition,
          isSimulated: false,
          rawPayload: itemData,
        };

        this.lastKnownGood.set(loc.id, normalized);
        results.push(normalized);
      });

      return { results, durationMs, httpCode: response.status };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      console.error(`[Open-Meteo] Batch request failed: ${err.message}`);
      throw {
        message: err.message,
        durationMs,
        httpCode: err.response?.status || 500,
      };
    }
  }

  async getHourlyWeather(lat: number, lon: number): Promise<HourlyWeatherPoint[]> {
    const params = {
      latitude: lat,
      longitude: lon,
      hourly: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'precipitation',
        'rain',
        'weather_code',
        'surface_pressure',
        'cloud_cover',
        'wind_speed_10m',
        'wind_direction_10m',
      ].join(','),
      forecast_days: 2,
      timezone: 'Asia/Kolkata',
    };

    const response = await this.client.get('', { params });
    const hourly = response.data.hourly;
    if (!hourly || !hourly.time) return [];

    const points: HourlyWeatherPoint[] = [];
    const count = Math.min(hourly.time.length, 48);

    for (let i = 0; i < count; i++) {
      const weatherInfo = interpretWeatherCode(hourly.weather_code?.[i] ?? 0);
      points.push({
        time: hourly.time[i],
        temperature: hourly.temperature_2m?.[i] ?? 0,
        apparentTemperature: hourly.apparent_temperature?.[i] ?? 0,
        humidity: hourly.relative_humidity_2m?.[i] ?? 0,
        precipitation: hourly.precipitation?.[i] ?? 0,
        rain: hourly.rain?.[i] ?? 0,
        weatherCode: hourly.weather_code?.[i] ?? 0,
        weatherCondition: weatherInfo.condition,
        windSpeed: hourly.wind_speed_10m?.[i] ?? 0,
        windDirection: hourly.wind_direction_10m?.[i] ?? 0,
        pressure: hourly.surface_pressure?.[i] ?? 1013.25,
        cloudCover: hourly.cloud_cover?.[i] ?? 0,
      });
    }

    return points;
  }

  async getForecast(lat: number, lon: number): Promise<DailyForecastPoint[]> {
    const params = {
      latitude: lat,
      longitude: lon,
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'rain_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'wind_direction_10m_dominant',
      ].join(','),
      timezone: 'Asia/Kolkata',
    };

    const response = await this.client.get('', { params });
    const daily = response.data.daily;
    if (!daily || !daily.time) return [];

    const forecasts: DailyForecastPoint[] = [];
    for (let i = 0; i < daily.time.length; i++) {
      const weatherInfo = interpretWeatherCode(daily.weather_code?.[i] ?? 0);
      forecasts.push({
        date: daily.time[i],
        temperatureMax: daily.temperature_2m_max?.[i] ?? 0,
        temperatureMin: daily.temperature_2m_min?.[i] ?? 0,
        precipitationSum: daily.precipitation_sum?.[i] ?? 0,
        rainSum: daily.rain_sum?.[i] ?? 0,
        precipitationProbabilityMax: daily.precipitation_probability_max?.[i] ?? 0,
        weatherCode: daily.weather_code?.[i] ?? 0,
        weatherCondition: weatherInfo.condition,
        windSpeedMax: daily.wind_speed_10m_max?.[i] ?? 0,
        windDirectionDominant: daily.wind_direction_10m_dominant?.[i] ?? 0,
      });
    }

    return forecasts;
  }

  async getHistoricalWeather(lat: number, lon: number, start: string, end: string): Promise<NormalizedWeather[]> {
    return [];
  }
}
