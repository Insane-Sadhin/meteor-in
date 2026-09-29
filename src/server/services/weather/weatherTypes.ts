export interface NormalizedWeather {
  source: string;
  locationId: string;
  latitude: number;
  longitude: number;
  observedAt: string; // ISO string from source
  ingestedAt: string; // ISO string when ingested
  temperature: number; // °C
  apparentTemperature?: number; // °C
  humidity: number; // %
  precipitation: number; // mm
  rain: number; // mm
  showers: number; // mm
  snowfall: number; // cm
  windSpeed: number; // km/h
  windDirection: number; // degrees
  windGusts?: number; // km/h
  pressure: number; // hPa
  cloudCover: number; // %
  weatherCode: number; // WMO weather code
  weatherCondition: string; // Human readable (e.g. 'Thunderstorm with heavy rain')
  airQualityAqi?: number; // AQI scale
  pm2_5?: number; // µg/m³
  pm10?: number; // µg/m³
  no2?: number; // µg/m³
  so2?: number; // µg/m³
  co?: number; // µg/m³
  o3?: number; // µg/m³
  isSimulated?: boolean;
  rawPayload: any;
}

export interface HourlyWeatherPoint {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  rain: number;
  weatherCode: number;
  weatherCondition: string;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  cloudCover: number;
}

export interface DailyForecastPoint {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  rainSum: number;
  precipitationProbabilityMax: number;
  weatherCode: number;
  weatherCondition: string;
  windSpeedMax: number;
  windDirectionDominant: number;
}

export interface WeatherEvent {
  id?: number;
  eventType: 'Heavy Rain' | 'Thunderstorm' | 'Flood Risk' | 'Heatwave' | 'Fog' | 'Strong Wind' | 'Squall';
  locationId: string;
  locationName: string;
  state: string;
  latitude: number;
  longitude: number;
  detectedAt: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'EXTREME';
  confidence: number; // 0.0 to 1.0 (e.g. 0.84 = 84%)
  source: string; // "SYSTEM DETECTION"
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  summary: string;
  rationale: string; // Detailed explainability
  affectedRadiusKm: number;
  metadata?: any;
}

export interface CitizenReport {
  id?: number;
  eventType: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'none';
  reporterName?: string;
  status: 'UNDER REVIEW' | 'VERIFIED' | 'CONTRADICTED' | 'DUPLICATE' | 'REJECTED';
  observedAt: string;
  submittedAt?: string;
  duplicateOfId?: number;
  metadata?: any;
}

export interface VerificationRecord {
  id?: number;
  reportId: number;
  status: 'CORRELATED' | 'UNVERIFIED' | 'CONTRADICTED';
  confidence: number;
  correlatedObservationId?: number;
  distanceKm: number;
  timeDiffMinutes: number;
  rationale: string;
  verifiedAt: string;
  stationData?: {
    stationName: string;
    temperature: number;
    rain: number;
    windSpeed: number;
    weatherCondition: string;
    observedAt: string;
  };
}

export interface IngestionLogEntry {
  id?: number;
  source: string;
  location?: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING' | 'SKIPPED';
  httpCode: number;
  message: string;
  recordsCount: number;
  durationMs: number;
  createdAt: string;
}

export interface DataSourceStatus {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  apiStatus: 'ONLINE' | 'CONFIG_REQUIRED' | 'OFFLINE' | 'DEGRADED' | 'NOT_CONNECTED';
  lastCheckedAt?: string;
  lastSuccessAt?: string;
  latencyMs: number;
  recordsCount: number;
  config?: any;
}
