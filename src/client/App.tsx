import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { DemoBanner } from './components/DemoBanner.tsx';
import { NationalAlertTicker } from './components/NationalAlertTicker.tsx';
import { KpiCards } from './components/KpiCards.tsx';
import { WeatherMap } from './components/WeatherMap.tsx';
import { Globe3D } from './components/Globe3D.tsx';
import { DopplerRadarPlayer } from './components/DopplerRadarPlayer.tsx';
import { AirQualityDeck } from './components/AirQualityDeck.tsx';
import { SeismicHazardDeck } from './components/SeismicHazardDeck.tsx';
import { ActiveEvents } from './components/ActiveEvents.tsx';
import { TrendCharts } from './components/TrendCharts.tsx';
import { ObservationsTable } from './components/ObservationsTable.tsx';
import { CitizenReportModal } from './components/CitizenReportModal.tsx';
import { StationDetailModal } from './components/StationDetailModal.tsx';
import { AdminPanel } from './components/admin/AdminPanel.tsx';
import { soundFx } from './utils/soundEffects.ts';
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
import {
  Globe,
  Map,
  Radio,
  Wind,
  Waves,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';

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

  // Active Tactical Mission Deck
  const [activeDeck, setActiveDeck] = useState<'globe' | 'map' | 'radar' | 'aqi' | 'hazards'>('globe');

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
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
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

      {/* 2. Live National Emergency Alert Marquee Ticker */}
      <NationalAlertTicker
        events={events}
        observations={observations}
        onSelectStation={id => setSelectedStationId(id)}
      />

      {/* 3. Demo Mode Alert Banner (if simulated) */}
      <DemoBanner isDemoMode={isDemoMode} />

      {/* Main Operations Dashboard Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* 4. KPI Telemetry Counters */}
        <KpiCards
          locationsCount={observations.length}
          activeEventsCount={events.length}
          reportsCount={reports.length}
          verifiedReportsCount={verifiedReportsCount}
          dataSourcesCount={sources.filter(s => s.api_status === 'ONLINE').length}
          lastIngestionTime={lastIngestionTime}
        />

        {/* 5. Tactical Mission Deck Switcher Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl shadow-xl">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-[11px] text-slate-500 font-semibold uppercase px-2 hidden sm:inline">
              MISSION DECK:
            </span>

            {/* 3D Digital Earth */}
            <button
              onClick={() => {
                soundFx.playSwitch();
                setActiveDeck('globe');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all font-semibold active:scale-95 ${
                activeDeck === 'globe'
                  ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-lg shadow-cyan-950/60 border border-cyan-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Globe className="w-4 h-4 text-cyan-300" />
              <span>3D Digital Earth</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-200 text-[9px] font-bold">
                3D
              </span>
            </button>

            {/* GIS Synoptic Map */}
            <button
              onClick={() => {
                soundFx.playSwitch();
                setActiveDeck('map');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all font-semibold active:scale-95 ${
                activeDeck === 'map'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/60 border border-blue-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Map className="w-4 h-4 text-blue-300" />
              <span>GIS Synoptic Map</span>
            </button>

            {/* Doppler Radar */}
            <button
              onClick={() => {
                soundFx.playSwitch();
                setActiveDeck('radar');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all font-semibold active:scale-95 ${
                activeDeck === 'radar'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/60 border border-emerald-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-300" />
              <span>Doppler Radar</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </button>

            {/* Air Quality (CPCB NAQI) */}
            <button
              onClick={() => {
                soundFx.playSwitch();
                setActiveDeck('aqi');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all font-semibold active:scale-95 ${
                activeDeck === 'aqi'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-950/60 border border-teal-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Wind className="w-4 h-4 text-teal-300" />
              <span>Air Quality (NAQI)</span>
            </button>

            {/* Seismic & Marine Hazards */}
            <button
              onClick={() => {
                soundFx.playSwitch();
                setActiveDeck('hazards');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all font-semibold active:scale-95 ${
                activeDeck === 'hazards'
                  ? 'bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-lg shadow-rose-950/60 border border-rose-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Waves className="w-4 h-4 text-rose-300" />
              <span>Seismic & Marine Hazards</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pr-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="hidden md:inline">FREE OPEN APIS INTEGRATED</span>
          </div>
        </div>

        {/* 6. Dynamic Active Hero Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8">
            {activeDeck === 'globe' && (
              <Globe3D
                observations={observations}
                activeEvents={events}
                onSelectStation={id => setSelectedStationId(id)}
              />
            )}

            {activeDeck === 'map' && (
              <WeatherMap
                observations={observations}
                events={events}
                reports={reports}
                onSelectStation={id => setSelectedStationId(id)}
                selectedStationId={selectedStationId}
                onMapClickCoordinates={handleMapClick}
              />
            )}

            {activeDeck === 'radar' && (
              <DopplerRadarPlayer
                observations={observations}
                onSelectStation={id => setSelectedStationId(id)}
              />
            )}

            {activeDeck === 'aqi' && <AirQualityDeck />}

            {activeDeck === 'hazards' && <SeismicHazardDeck />}
          </div>

          {/* Active System Detections Panel */}
          <div className="lg:col-span-4">
            <ActiveEvents
              events={events}
              onSelectStation={id => setSelectedStationId(id)}
            />
          </div>
        </div>

        {/* 7. Regional Trends & Analytical Extremes */}
        <TrendCharts observations={observations} />

        {/* 8. Recent Station Observations Data Table */}
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
      <footer className="bg-[#050b14] border-t border-slate-800/80 py-4 px-4 sm:px-6 mt-10 text-xs font-mono text-slate-500">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">METEOR-IN</span>
            <span>&bull;</span>
            <span>National Real-Time Weather Intelligence Platform</span>
            <span>&bull;</span>
            <span>Three.js 3D Earth &bull; RainViewer Radar &bull; USGS Seismic &bull; Open-Meteo AQI</span>
          </div>
          <div>
            <span>100% Free Public APIs &bull; Zero Hardcoded Placeholders &bull; PostgreSQL Timeseries</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
