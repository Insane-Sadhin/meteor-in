import axios, { type AxiosInstance } from 'axios';

export interface AirQualityMeasurement {
  locationId: string;
  latitude: number;
  longitude: number;
  pm2_5?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  temperature?: number;
  humidity?: number;
  observedAt: string;
  source: string;
}

export interface OpenAQStatus {
  isConfigured: boolean;
  status: 'ONLINE' | 'CONFIG_REQUIRED' | 'OFFLINE';
  message: string;
  lastCheckedAt?: string;
  latencyMs?: number;
}

export class OpenAQService {
  private apiKey?: string;
  private client: AxiosInstance;
  private status: OpenAQStatus = {
    isConfigured: false,
    status: 'CONFIG_REQUIRED',
    message: 'OPENAQ CONFIGURATION REQUIRED',
  };

  constructor() {
    this.apiKey = process.env.OPENAQ_API_KEY?.trim();
    this.status.isConfigured = !!this.apiKey && this.apiKey.length > 5;
    this.status.status = this.status.isConfigured ? 'ONLINE' : 'CONFIG_REQUIRED';
    this.status.message = this.status.isConfigured
      ? 'OpenAQ API Connected'
      : 'OPENAQ CONFIGURATION REQUIRED';

    this.client = axios.create({
      baseURL: 'https://api.openaq.org/v3',
      timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10),
      headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {},
    });
  }

  getStatus(): OpenAQStatus {
    return { ...this.status };
  }

  isAvailable(): boolean {
    return this.status.isConfigured;
  }

  /**
   * Fetch measurements for India
   */
  async getLatestIndiaMeasurements(): Promise<{
    measurements: AirQualityMeasurement[];
    durationMs: number;
    httpCode: number;
  }> {
    if (!this.isAvailable()) {
      return {
        measurements: [],
        durationMs: 0,
        httpCode: 400,
      };
    }

    const startTime = Date.now();
    try {
      // OpenAQ v3 API: locations or measurements for India (iso = IN)
      const res = await this.client.get('/locations', {
        params: {
          iso: 'IN',
          limit: 100,
        },
      });

      const durationMs = Date.now() - startTime;
      this.status.status = 'ONLINE';
      this.status.lastCheckedAt = new Date().toISOString();
      this.status.latencyMs = durationMs;

      const measurements: AirQualityMeasurement[] = [];
      const results = res.data?.results || [];

      for (const loc of results) {
        if (!loc.coordinates) continue;
        const m: AirQualityMeasurement = {
          locationId: loc.id?.toString() || loc.name,
          latitude: loc.coordinates.latitude,
          longitude: loc.coordinates.longitude,
          observedAt: loc.datetimeLast?.utc || new Date().toISOString(),
          source: 'OpenAQ',
        };

        // Extract sensors if available in v3 structure
        if (Array.isArray(loc.sensors)) {
          for (const s of loc.sensors) {
            const param = s.parameter?.name?.toLowerCase();
            const val = s.latest?.value;
            if (val === undefined || val === null) continue;

            if (param === 'pm25' || param === 'pm2.5') m.pm2_5 = val;
            else if (param === 'pm10') m.pm10 = val;
            else if (param === 'no2') m.no2 = val;
            else if (param === 'so2') m.so2 = val;
            else if (param === 'co') m.co = val;
            else if (param === 'o3') m.o3 = val;
            else if (param === 'temperature') m.temperature = val;
            else if (param === 'relativehumidity') m.humidity = val;
          }
        }

        measurements.push(m);
      }

      return {
        measurements,
        durationMs,
        httpCode: res.status,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      console.warn(`[OpenAQ] Request failed: ${err.message}`);
      this.status.status = 'OFFLINE';
      this.status.message = `OpenAQ Request Failed: ${err.message}`;
      return {
        measurements: [],
        durationMs,
        httpCode: err.response?.status || 500,
      };
    }
  }
}
