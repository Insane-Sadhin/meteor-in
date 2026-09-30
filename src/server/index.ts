import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { getDb } from './db/database.ts';
import { weatherRouter } from './routes/weatherRoutes.ts';
import { reportRouter } from './routes/reportRoutes.ts';
import { sourceRouter } from './routes/sourceRoutes.ts';
import { ingestionRouter } from './routes/ingestionRoutes.ts';
import { healthRouter } from './routes/healthRoutes.ts';
import { adminRouter } from './routes/adminRoutes.ts';
import { hazardRouter } from './routes/hazardRoutes.ts';
import { sseManager } from './services/realtime/sseManager.ts';
import { ingestionEngine } from './services/ingestion/ingestionEngine.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/realtime/stream')) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api')) {
        console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
      }
    });
  }
  next();
});

// Real-time Server-Sent Events (SSE) Stream
app.get('/api/realtime/stream', (req: Request, res: Response) => {
  const clientId = sseManager.addClient(res);
  console.log(`[SSE] Real-time client connected: ${clientId} (Total: ${sseManager.getConnectionCount()})`);
});

// API Routes
app.use('/api/weather', weatherRouter);
app.use('/api/reports', reportRouter);
app.use('/api/sources', sourceRouter);
app.use('/api/ingestion', ingestionRouter);
app.use('/api/system/health', healthRouter);
app.use('/api/admin', adminRouter);
app.use('/api/environmental', hazardRouter);
app.use('/api/hazards', hazardRouter);

// Basic root ping
app.get('/api/ping', (req: Request, res: Response) => {
  res.json({
    name: 'METEOR-IN National Weather Intelligence API',
    status: 'ONLINE',
    time: new Date().toISOString(),
  });
});

// Serve frontend dist in production if built
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('{*path}', (req: Request, res: Response, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.resolve(distPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) next();
  });
});

async function bootstrap() {
  try {
    console.log('====================================================');
    console.log('  METEOR-IN: National Weather Data Intelligence Platform');
    console.log('  Ministry / National Meteorological Operations Center');
    console.log('====================================================');

    // 1. Initialize PostgreSQL Database
    console.log('[Boot] Initializing database and verifying schema...');
    await getDb();

    // 2. Start HTTP Server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Boot] Server listening on http://localhost:${PORT}`);
      console.log(`[Boot] SSE Stream active on http://localhost:${PORT}/api/realtime/stream`);
    });

    // 3. Start Live Data Ingestion Engine
    console.log('[Boot] Bootstrapping real-time ingestion pipeline...');
    await ingestionEngine.start();

  } catch (err: any) {
    console.error('[Boot Fatal Error]', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Stopping METEOR-IN platform...');
  ingestionEngine.stop();
  const db = await getDb();
  await db.close();
  process.exit(0);
});

bootstrap();
