import axios, { type AxiosInstance } from 'axios';
import type { WeatherProvider } from './weatherProvider.ts';
import type {
  NormalizedWeather,
  HourlyWeatherPoint,
  DailyForecastPoint,
} from './weatherTypes.ts';

export class OpenWeatherProvider implements WeatherProvider {
  name = 'OpenWeather API (Secondary Provider)';
  code = 'OPENWEATHER';

  private apiKey?: string;
  private client: AxiosInstance;

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY?.trim();
    this.client = axios.create({
      baseURL: 'https://api.openweathermap.org/data/2.5',
      timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10),
    });
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 5;
  }

  async getCurrentWeather(lat: number, lon: number, locationId = 'unknown'): Promise<NormalizedWeather> {
    if (!this.isConfigured()) {
      throw new Error('OpenWeather API key is not configured in OPENWEATHER_API_KEY');
    }

    const res = await this.client.get('/weather', {
      params: {
        lat,
        lon,
        appid: this.apiKey,
        units: 'metric',
      },
    });

    const data = res.data;
    const rain = data.rain ? (data.rain['1h'] || data.rain['3h'] || 0) : 0;

    return {
      source: 'OpenWeather',
      locationId,
      latitude: lat,
      longitude: lon,
      observedAt: new Date(data.dt * 1000).toISOString(),
      ingestedAt: new Date().toISOString(),
      temperature: data.main?.temp ?? 0,
      apparentTemperature: data.main?.feels_like,
      humidity: data.main?.humidity ?? 0,
      precipitation: rain,
      rain,
      showers: 0,
      snowfall: data.snow ? (data.snow['1h'] || 0) : 0,
      windSpeed: (data.wind?.speed ?? 0) * 3.6,
      windDirection: data.wind?.deg ?? 0,
      windGusts: data.wind?.gust ? data.wind.gust * 3.6 : undefined,
      pressure: data.main?.pressure ?? 1013,
      cloudCover: data.clouds?.all ?? 0,
      weatherCode: data.weather?.[0]?.id ?? 800,
      weatherCondition: data.weather?.[0]?.description ?? 'Unknown',
      isSimulated: false,
      rawPayload: data,
    };
  }

  async getHourlyWeather(lat: number, lon: number): Promise<HourlyWeatherPoint[]> {
    if (!this.isConfigured()) return [];
    const res = await this.client.get('/forecast', {
      params: { lat, lon, appid: this.apiKey, units: 'metric' },
    });
    return (res.data.list || []).map((item: any) => ({
      time: item.dt_txt,
      temperature: item.main?.temp ?? 0,
      apparentTemperature: item.main?.feels_like ?? 0,
      humidity: item.main?.humidity ?? 0,
      precipitation: item.rain ? (item.rain['3h'] || 0) : 0,
      rain: item.rain ? (item.rain['3h'] || 0) : 0,
      weatherCode: item.weather?.[0]?.id ?? 800,
      weatherCondition: item.weather?.[0]?.description ?? 'Clear',
      windSpeed: (item.wind?.speed ?? 0) * 3.6,
      windDirection: item.wind?.deg ?? 0,
      pressure: item.main?.pressure ?? 1013,
      cloudCover: item.clouds?.all ?? 0,
    }));
  }

  async getForecast(lat: number, lon: number): Promise<DailyForecastPoint[]> {
    return [];
  }

  async getHistoricalWeather(lat: number, lon: number, start: string, end: string): Promise<NormalizedWeather[]> {
    return [];
  }
}
