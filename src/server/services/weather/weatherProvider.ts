import type {
  NormalizedWeather,
  HourlyWeatherPoint,
  DailyForecastPoint,
} from './weatherTypes.ts';

export interface WeatherProvider {
  name: string;
  code: string;
  isConfigured(): boolean;
  getCurrentWeather(lat: number, lon: number, locationId?: string): Promise<NormalizedWeather>;
  getHourlyWeather(lat: number, lon: number): Promise<HourlyWeatherPoint[]>;
  getForecast(lat: number, lon: number): Promise<DailyForecastPoint[]>;
  getHistoricalWeather(lat: number, lon: number, start: string, end: string): Promise<NormalizedWeather[]>;
}

export class IMDProvider implements WeatherProvider {
  name = 'India Meteorological Department (Adapter)';
  code = 'IMD_ADAPTER';

  isConfigured(): boolean {
    return !!process.env.IMD_API_KEY && !!process.env.IMD_ENDPOINT_URL;
  }

  async getCurrentWeather(lat: number, lon: number, locationId?: string): Promise<NormalizedWeather> {
    if (!this.isConfigured()) {
      throw new Error('IMD Provider is not connected. Official credentials or API endpoint are not configured in environment variables.');
    }
    throw new Error('IMD official transport adapter not yet provisioned with official government certificates.');
  }

  async getHourlyWeather(lat: number, lon: number): Promise<HourlyWeatherPoint[]> {
    throw new Error('IMD official transport adapter not yet provisioned.');
  }

  async getForecast(lat: number, lon: number): Promise<DailyForecastPoint[]> {
    throw new Error('IMD official transport adapter not yet provisioned.');
  }

  async getHistoricalWeather(lat: number, lon: number, start: string, end: string): Promise<NormalizedWeather[]> {
    throw new Error('IMD official transport adapter not yet provisioned.');
  }
}

export class GovernmentDataProvider implements WeatherProvider {
  name = 'Government Meteorological Portal (Adapter)';
  code = 'GOV_DATA_ADAPTER';

  isConfigured(): boolean {
    return !!process.env.GOV_DATA_PORTAL_KEY;
  }

  async getCurrentWeather(lat: number, lon: number, locationId?: string): Promise<NormalizedWeather> {
    throw new Error('Government Data Portal adapter not configured with authorized API keys.');
  }

  async getHourlyWeather(lat: number, lon: number): Promise<HourlyWeatherPoint[]> {
    throw new Error('Government Data Portal adapter not configured.');
  }

  async getForecast(lat: number, lon: number): Promise<DailyForecastPoint[]> {
    throw new Error('Government Data Portal adapter not configured.');
  }

  async getHistoricalWeather(lat: number, lon: number, start: string, end: string): Promise<NormalizedWeather[]> {
    throw new Error('Government Data Portal adapter not configured.');
  }
}
