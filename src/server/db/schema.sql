-- METEOR-IN PostgreSQL Database Schema

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(64) PRIMARY KEY,
  city VARCHAR(128) NOT NULL,
  district VARCHAR(128) NOT NULL,
  state VARCHAR(128) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  elevation DOUBLE PRECISION DEFAULT 0,
  region VARCHAR(32) NOT NULL,
  is_major_station BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Data Sources Registry
CREATE TABLE IF NOT EXISTS sources (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  code VARCHAR(64) UNIQUE NOT NULL,
  type VARCHAR(32) NOT NULL, -- 'weather', 'environmental', 'government', 'crowdsourced'
  is_active BOOLEAN DEFAULT true,
  api_status VARCHAR(32) DEFAULT 'OFFLINE', -- 'ONLINE', 'CONFIG_REQUIRED', 'OFFLINE', 'DEGRADED', 'NOT_CONNECTED'
  last_checked_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  latency_ms INTEGER DEFAULT 0,
  records_count INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Weather Observations (Core Timeseries Table)
CREATE TABLE IF NOT EXISTS weather_observations (
  id SERIAL PRIMARY KEY,
  source VARCHAR(64) NOT NULL,
  location_id VARCHAR(64) REFERENCES locations(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  temperature DOUBLE PRECISION,
  apparent_temperature DOUBLE PRECISION,
  humidity DOUBLE PRECISION,
  precipitation DOUBLE PRECISION DEFAULT 0,
  rain DOUBLE PRECISION DEFAULT 0,
  showers DOUBLE PRECISION DEFAULT 0,
  snowfall DOUBLE PRECISION DEFAULT 0,
  wind_speed DOUBLE PRECISION,
  wind_direction DOUBLE PRECISION,
  wind_gusts DOUBLE PRECISION,
  pressure DOUBLE PRECISION,
  cloud_cover DOUBLE PRECISION,
  weather_code INTEGER,
  weather_condition VARCHAR(128),
  air_quality_aqi DOUBLE PRECISION,
  pm2_5 DOUBLE PRECISION,
  pm10 DOUBLE PRECISION,
  no2 DOUBLE PRECISION,
  so2 DOUBLE PRECISION,
  co DOUBLE PRECISION,
  o3 DOUBLE PRECISION,
  is_simulated BOOLEAN DEFAULT false,
  raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_obs_location_time ON weather_observations(location_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_obs_observed_at ON weather_observations(observed_at DESC);

-- Weather Events (System Automated Detections)
CREATE TABLE IF NOT EXISTS weather_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL, -- 'Heavy Rain', 'Thunderstorm', 'Flood Risk', 'Heatwave', 'Fog', 'Strong Wind'
  location_id VARCHAR(64) REFERENCES locations(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  severity VARCHAR(32) NOT NULL, -- 'LOW', 'MODERATE', 'HIGH', 'SEVERE', 'EXTREME'
  confidence DOUBLE PRECISION NOT NULL, -- 0.0 to 1.0 (e.g. 0.84 = 84%)
  source VARCHAR(64) DEFAULT 'SYSTEM DETECTION',
  status VARCHAR(32) DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESOLVED', 'DISMISSED'
  summary TEXT,
  rationale TEXT, -- Explain why: e.g. Precipitation threshold exceeded (24mm/h) + high rainfall intensity
  affected_radius_km DOUBLE PRECISION DEFAULT 25.0,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_events_status_time ON weather_events(status, detected_at DESC);

-- Citizen Reports
CREATE TABLE IF NOT EXISTS citizen_reports (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  location_name VARCHAR(128) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  media_url TEXT,
  media_type VARCHAR(32), -- 'image', 'video', 'none'
  reporter_name VARCHAR(64) DEFAULT 'Anonymous Citizen',
  status VARCHAR(32) DEFAULT 'UNDER REVIEW', -- 'UNDER REVIEW', 'VERIFIED', 'CONTRADICTED', 'DUPLICATE', 'REJECTED'
  observed_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duplicate_of_id INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON citizen_reports(status, submitted_at DESC);

-- Verification Records
CREATE TABLE IF NOT EXISTS verification_records (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES citizen_reports(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL, -- 'CORRELATED', 'UNVERIFIED', 'CONTRADICTED'
  confidence DOUBLE PRECISION NOT NULL, -- e.g. 0.88 = 88%
  correlated_observation_id INTEGER REFERENCES weather_observations(id) ON DELETE SET NULL,
  distance_km DOUBLE PRECISION,
  time_diff_minutes DOUBLE PRECISION,
  rationale TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Ingestion Logs
CREATE TABLE IF NOT EXISTS ingestion_logs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(64) NOT NULL,
  location VARCHAR(128),
  status VARCHAR(32) NOT NULL, -- 'SUCCESS', 'FAILED', 'WARNING', 'SKIPPED'
  http_code INTEGER DEFAULT 200,
  message TEXT NOT NULL,
  records_count INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON ingestion_logs(created_at DESC);

-- System Metrics
CREATE TABLE IF NOT EXISTS system_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(64) NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metric_unit VARCHAR(32),
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action VARCHAR(64) NOT NULL,
  actor VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64),
  entity_id VARCHAR(64),
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
