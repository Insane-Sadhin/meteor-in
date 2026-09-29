import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import dotenv from 'dotenv';
import { INDIAN_CITIES } from '../data/cities.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DbAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  isPgLite: boolean;
}

let dbInstance: DbAdapter | null = null;
let isInitialized = false;

export async function getDb(): Promise<DbAdapter> {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    try {
      console.log(`[DB] Connecting to PostgreSQL instance via DATABASE_URL...`);
      const pool = new pg.Pool({ connectionString: databaseUrl });
      await pool.query('SELECT 1');
      console.log(`[DB] Connected to PostgreSQL successfully.`);

      dbInstance = {
        async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
          const res = await pool.query(sql, params);
          return { rows: res.rows as T[], rowCount: res.rowCount ?? res.rows.length };
        },
        async exec(sql: string): Promise<void> {
          await pool.query(sql);
        },
        async close() {
          await pool.end();
        },
        isPgLite: false,
      };
    } catch (err: any) {
      console.warn(`[DB] Could not connect to remote PostgreSQL (${err.message}). Falling back to embedded PostgreSQL (PGlite).`);
    }
  }

  if (!dbInstance) {
    console.log(`[DB] Initializing embedded PostgreSQL (PGlite) engine in ./data/pgdata...`);
    const dataDir = path.resolve(process.cwd(), 'data', 'pgdata');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const pglite = new PGlite(dataDir);
    await pglite.waitReady;
    console.log(`[DB] Embedded PostgreSQL engine ready.`);

    dbInstance = {
      async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
        const res = await pglite.query(sql, params);
        return { rows: res.rows as T[], rowCount: res.rows.length };
      },
      async exec(sql: string): Promise<void> {
        await pglite.exec(sql);
      },
      async close() {
        await pglite.close();
      },
      isPgLite: true,
    };
  }

  if (!isInitialized) {
    await initializeSchema(dbInstance);
    isInitialized = true;
  }

  return dbInstance;
}

async function initializeSchema(db: DbAdapter): Promise<void> {
  try {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Execute entire schema in one call
    await db.exec(schemaSql);
    console.log(`[DB] PostgreSQL schema tables verified & ready.`);

    // Seed Data Sources Registry
    const sources = [
      { id: 'open-meteo', name: 'Open-Meteo Weather API', code: 'OPEN_METEO', type: 'weather', api_status: 'ONLINE' },
      { id: 'openaq', name: 'OpenAQ Environmental Platform', code: 'OPENAQ', type: 'environmental', api_status: process.env.OPENAQ_API_KEY ? 'ONLINE' : 'CONFIG_REQUIRED' },
      { id: 'openweather', name: 'OpenWeather Secondary Provider', code: 'OPENWEATHER', type: 'weather', api_status: process.env.OPENWEATHER_API_KEY ? 'ONLINE' : 'NOT_CONFIGURED' },
      { id: 'imd', name: 'India Meteorological Department (Adapter)', code: 'IMD_ADAPTER', type: 'government', api_status: 'NOT_CONNECTED' },
      { id: 'satellite', name: 'INSAT-3DR Geostationary Feed (Adapter)', code: 'INSAT_ADAPTER', type: 'government', api_status: 'NOT_CONNECTED' },
      { id: 'citizen', name: 'National Citizen Meteorological Reports', code: 'CITIZEN_REPORTS', type: 'crowdsourced', api_status: 'ONLINE' },
    ];

    for (const s of sources) {
      await db.query(
        `INSERT INTO sources (id, name, code, type, api_status, is_active, last_checked_at)
         VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name,
           api_status = EXCLUDED.api_status,
           last_checked_at = CURRENT_TIMESTAMP`,
        [s.id, s.name, s.code, s.type, s.api_status]
      );
    }

    // Seed Indian Locations
    for (const loc of INDIAN_CITIES) {
      await db.query(
        `INSERT INTO locations (id, city, district, state, latitude, longitude, elevation, region, is_major_station)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           city = EXCLUDED.city,
           district = EXCLUDED.district,
           state = EXCLUDED.state,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           elevation = EXCLUDED.elevation,
           region = EXCLUDED.region,
           is_major_station = EXCLUDED.is_major_station`,
        [loc.id, loc.city, loc.district, loc.state, loc.latitude, loc.longitude, loc.elevation, loc.region, loc.isMajorStation]
      );
    }

    console.log(`[DB] Seeded ${INDIAN_CITIES.length} Indian meteorological observation stations.`);
  } catch (err: any) {
    console.error(`[DB Init Error] Failed to initialize schema:`, err);
    throw err;
  }
}
