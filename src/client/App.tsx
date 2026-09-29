import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { DemoBanner } from './components/DemoBanner.tsx';
import { KpiCards } from './components/KpiCards.tsx';
import { WeatherMap } from './components/WeatherMap.tsx';
import { ActiveEvents } from './components/ActiveEvents.tsx';
import { TrendCharts } from './components/TrendCharts.tsx';
import { ObservationsTable } from './components/ObservationsTable.tsx';
import { CitizenReportModal } from './components/CitizenReportModal.tsx';
import { StationDetailModal } from './components/StationDetailModal.tsx';
import { AdminPanel } from './components/admin/AdminPanel.tsx';
import {
  Observation,
  WeatherEventItem,
  CitizenReportItem,
  DataSourceItem,
} from './types/index.ts';
import {
  fetchCurrentWeather,
  fetchReports,
  fetchSources,
  setupSSEConnection,
  triggerManualIngestion,
} from './utils/api.ts';

export const App: React.FC = () => {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [events, setEvents] = useState<WeatherEventItem[]>([]);
  const [reports, setReports] = useState<CitizenReportItem[]>([]);
  const [sources, setSources] = useState<DataSourceItem[]>([]);

  const [lastIngestionTime, setLastIngestionTime] = useState<string>('');
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [recordsCount, setRecordsCount] = useState<number>(0);
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Modals & Navigation
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [initialCoords, setInitialCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Load all initial data from backend
  const loadInitialData = useCallback(async () => {
    try {
      const [weatherRes, reportsRes, sourcesRes] = await Promise.all([
        fetchCurrentWeather(),
        fetchReports(),
        fetchSources(),
      ]);

      setObservations(weatherRes.observations || []);
      setEvents(weatherRes.activeEvents || []);
      setReports(reportsRes.reports || []);
      setSources(sourcesRes.sources || []);

      if (weatherRes.observations && weatherRes.observations.length > 0) {
        setLastIngestionTime(weatherRes.observations[0].ingested_at || weatherRes.timestamp);
        setRecordsCount(weatherRes.count);
        setIsDemoMode(!!weatherRes.observations[0].is_simulated);
      }
    } catch (err: any) {
      console.error('Failed to load live meteorological data', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Subscribe to Server-Sent Events (SSE) stream
    const unsubscribe = setupSSEConnection((eventType, data) => {
      if (eventType === 'connected') {
        setSseConnected(true);
      } else if (eventType === 'weather:update') {
        setLastIngestionTime(data.timestamp);
        setLatencyMs(data.latencyMs || 0);
        setRecordsCount(data.recordsCount || 0);
        setIsDemoMode(!!data.isDemoMode);
        // Refresh observations silently without page reload
        fetchCurrentWeather().then(res => {
          setObservations(res.observations || []);
          setEvents(res.activeEvents || []);
        });
      } else if (eventType === 'event:detected') {
        fetchCurrentWeather().then(res => {
          setEvents(res.activeEvents || []);
        });
      } else if (eventType === 'report:new') {
        setReports(prev => [data, ...prev]);
      } else if (eventType === 'report:updated') {
        setReports(prev =>
          prev.map(r => (r.id === parseInt(data.id, 10) ? { ...r, status: data.status } : r))
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadInitialData]);

  // Handle Sync Now button click
  const handleManualSync = async () => {
    await triggerManualIngestion();
    await loadInitialData();
  };

  // Map coordinate click handler for citizen report picking
  const handleMapClick = (lat: number, lon: number) => {
    setInitialCoords({ lat, lon });
    setIsReportModalOpen(true);
  };

  const verifiedReportsCount = reports.filter(r => r.status === 'VERIFIED').length;

  return (
    <div className="min-h-screen bg-[#0b1320] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* 1. Header with National Branding and Live Status Bar */}
      <Header
        sources={sources}
        lastIngestionTime={lastIngestionTime}
        latencyMs={latencyMs}
        recordsCount={recordsCount}
        sseConnected={sseConnected}
        isDemoMode={isDemoMode}
        onSync={handleManualSync}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onToggleAdmin={() => setIsAdminOpen(!isAdminOpen)}
        isAdminOpen={isAdminOpen}
      />

      {/* 2. Demo Mode Alert Banner (if simulated) */}
      <DemoBanner isDemoMode={isDemoMode} />

      {/* Main Operations Dashboard Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* 3. KPI Telemetry Counters */}
        <KpiCards
          locationsCount={observations.length}
          activeEventsCount={events.length}
          reportsCount={reports.length}
          verifiedReportsCount={verifiedReportsCount}
          dataSourcesCount={sources.filter(s => s.api_status === 'ONLINE').length}
          lastIngestionTime={lastIngestionTime}
        />

        {/* 4. Hero Section: Large India Map + Active Weather Events */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Large India Leaflet GIS Map */}
          <div className="lg:col-span-8">
            <WeatherMap
              observations={observations}
              events={events}
              reports={reports}
              onSelectStation={id => setSelectedStationId(id)}
              selectedStationId={selectedStationId}
              onMapClickCoordinates={handleMapClick}
            />
          </div>

          {/* Active System Detections Panel */}
          <div className="lg:col-span-4">
            <ActiveEvents
              events={events}
              onSelectStation={id => setSelectedStationId(id)}
            />
          </div>
        </div>

        {/* 5. Regional Trends & Analytical Extremes */}
        <TrendCharts observations={observations} />

        {/* 6. Recent Station Observations Data Table */}
        <ObservationsTable
          observations={observations}
          onSelectStation={id => setSelectedStationId(id)}
          selectedStationId={selectedStationId}
        />
      </main>

      {/* Modals */}
      <CitizenReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setInitialCoords(null);
        }}
        onSuccess={newReport => {
          setReports(prev => [newReport, ...prev]);
        }}
        initialCoords={initialCoords}
      />

      <StationDetailModal
        stationId={selectedStationId}
        onClose={() => setSelectedStationId(null)}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onRefreshAll={loadInitialData}
      />

      {/* Footer */}
      <footer className="bg-[#090f1d] border-t border-slate-800 py-4 px-4 sm:px-6 mt-10 text-xs font-mono text-slate-500">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">METEOR-IN</span>
            <span>&bull;</span>
            <span>National Real-Time Weather Intelligence Platform</span>
            <span>&bull;</span>
            <span>WMO Standards Compliance</span>
          </div>
          <div>
            <span>Primary Provider: Open-Meteo API &bull; PostgreSQL Timeseries &bull; SSE Live Streaming</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
