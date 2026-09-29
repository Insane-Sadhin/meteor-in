export interface Observation {
  id: number;
  source: string;
  location_id: string;
  observed_at: string;
  ingested_at: string;
  latitude: number;
  longitude: number;
  temperature: number;
  apparent_temperature?: number;
  humidity: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  wind_speed: number;
  wind_direction: number;
  wind_gusts?: number;
  pressure: number;
  cloud_cover: number;
  weather_code: number;
  weather_condition: string;
  air_quality_aqi?: number;
  pm2_5?: number;
  pm10?: number;
  is_simulated?: boolean;
  city: string;
  district: string;
  state: string;
  elevation: number;
  region: string;
  is_major_station: boolean;
}

export interface WeatherEventItem {
  id: number;
  event_type: string;
  location_id: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  detected_at: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'EXTREME';
  confidence: number;
  source: string;
  status: string;
  summary: string;
  rationale: string;
  affected_radius_km: number;
}

export interface CitizenReportItem {
  id: number;
  event_type: string;
  description: string;
  location_name: string;
  latitude: number;
  longitude: number;
  media_url?: string;
  media_type: string;
  reporter_name: string;
  status: 'UNDER REVIEW' | 'VERIFIED' | 'CONTRADICTED' | 'DUPLICATE' | 'REJECTED';
  observed_at: string;
  submitted_at: string;
  duplicate_of_id?: number;
  verification_status?: 'CORRELATED' | 'UNVERIFIED' | 'CONTRADICTED';
  verification_confidence?: number;
  distance_km?: number;
  time_diff_minutes?: number;
  verification_rationale?: string;
  metadata?: any;
}

export interface DataSourceItem {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
  api_status: 'ONLINE' | 'CONFIG_REQUIRED' | 'OFFLINE' | 'DEGRADED' | 'NOT_CONNECTED' | 'NOT_CONFIGURED';
  last_checked_at?: string;
  last_success_at?: string;
  latency_ms: number;
  records_count: number;
}

export interface IngestionLog {
  id: number;
  source: string;
  location: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING' | 'SKIPPED';
  http_code: number;
  message: string;
  records_count: number;
  duration_ms: number;
  created_at: string;
}

export interface SystemHealthData {
  system: {
    nodeVersion: string;
    platform: string;
    uptimeSeconds: number;
    memoryRssMb: number;
    memoryHeapUsedMb: number;
  };
  database: {
    engine: string;
    status: string;
    queryLatencyMs: number;
    totalObservations: number;
    activeEvents: number;
    citizenReports: number;
    verifiedReports: number;
  };
  ingestion: {
    isIngesting: boolean;
    isDemoMode: boolean;
    lastRunTime: string;
    ingestionLatencyMs: number;
    recordsPerMinute: number;
    failedRequests24h: number;
  };
  realtime: {
    transport: string;
    activeConnections: number;
  };
  apiAvailability: Record<string, string>;
}
