import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { HomePage } from './components/HomePage.tsx';
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
  ArrowLeft,
  Sparkles,
  LayoutDashboard,
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

  // High-Level View Mode: 'home' (Flagship Homepage with Interactive India Map) or 'operations' (Full Ops Dashboard)
  const [currentView, setCurrentView] = useState<'home' | 'operations'>('home');

  // Active Tactical Mission Deck in Operations View
  const [activeDeck, setActiveDeck] = useState<'globe' | 'map' | 'radar' | 'aqi' | 'hazards'>('globe');

  // Modals & Navigation
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [initialCoords, setInitialCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Load all initial data from backend or edge fallback
  const loadInitialData = useCallback(async () => {
    const t0 = performance.now();
    try {
      const [weatherRes, reportsRes, sourcesRes] = await Promise.all([
        fetchCurrentWeather(),
        fetchReports(),
        fetchSources(),
      ]);

      const duration = Math.round(performance.now() - t0);
      setLatencyMs(duration || 85);
      setObservations(weatherRes.observations || []);
      setEvents(weatherRes.activeEvents || []);
      setReports(reportsRes.reports || []);
      setSources(sourcesRes.sources || []);

      if (weatherRes.observations && weatherRes.observations.length > 0) {
        setLastIngestionTime(weatherRes.observations[0].ingested_at || weatherRes.timestamp);
        setRecordsCount(weatherRes.count || weatherRes.observations.length);
        setIsDemoMode(!!weatherRes.observations[0].is_simulated);
      }
    } catch (err: any) {
      console.error('Failed to load live meteorological data', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Periodic live synoptic sync every 60s
    const pollInterval = setInterval(() => {
      loadInitialData();
    }, 60000);

    // Subscribe to Server-Sent Events (SSE) stream
    const unsubscribe = setupSSEConnection((eventType, data) => {
      if (eventType === 'connected') {
        setSseConnected(true);
      } else if (eventType === 'weather:update') {
        setLastIngestionTime(data.timestamp);
        setLatencyMs(data.latencyMs || 85);
        setRecordsCount(data.recordsCount || 51);
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
      clearInterval(pollInterval);
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

  const handleNavigateToDeck = (deck: 'globe' | 'map' | 'radar' | 'aqi' | 'hazards') => {
    setActiveDeck(deck);
    setCurrentView('operations');
  };

  const verifiedReportsCount = reports.filter(r => r.status === 'VERIFIED').length;

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 flex flex-col font-sans-lux selection:bg-purple-600 selection:text-white">
      {/* 1. Luxury Header with National Branding and Status Bar */}
      <Header
        sources={sources}
        lastIngestionTime={lastIngestionTime}
        latencyMs={latencyMs}
        recordsCount={recordsCount}
        sseConnected={sseConnected}
        isDemoMode={isDemoMode}
        currentView={currentView}
        activeDeck={activeDeck}
        onNavigateHome={() => setCurrentView('home')}
        onNavigateDeck={handleNavigateToDeck}
        onNavigateOperations={() => setCurrentView('operations')}
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

      {/* VIEW 1: FLAGSHIP HOMEPAGE WITH INTERACTIVE INDIA MAP */}
      {currentView === 'home' && (
        <HomePage
          observations={observations}
          events={events}
          reports={reports}
          sources={sources}
          onSelectStation={id => setSelectedStationId(id)}
          onNavigateToDeck={handleNavigateToDeck}
          onNavigateToOperations={() => {
            soundFx.playSwitch();
            setCurrentView('operations');
          }}
          onOpenReportModal={() => {
            soundFx.playSwitch();
            setIsReportModalOpen(true);
          }}
        />
      )}

      {/* VIEW 2: OPERATIONS COMMAND CENTER DASHBOARD */}
      {currentView === 'operations' && (
        <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Back to Homepage Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
            <button
              onClick={() => {
                soundFx.playSwitch();
                setCurrentView('home');
              }}
              className="flex items-center space-x-2 px-4 py-2 rounded-full glass-panel hover:bg-slate-800 text-xs font-mono text-purple-300 hover:text-white transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Homepage &amp; Interactive Map</span>
            </button>

            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>OPERATIONS DESK ACTIVE</span>
            </div>
          </div>

          {/* KPI Telemetry Counters */}
          <KpiCards
            locationsCount={observations.length}
            activeEventsCount={events.length}
            reportsCount={reports.length}
            verifiedReportsCount={verifiedReportsCount}
            dataSourcesCount={sources.filter(s => s.api_status === 'ONLINE').length}
            lastIngestionTime={lastIngestionTime}
          />

          {/* Tactical Mission Deck Switcher Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl glass-panel-glow border border-purple-500/30 backdrop-blur-2xl shadow-2xl">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <span className="text-[11px] text-slate-400 font-semibold uppercase px-2 hidden sm:inline">
                TACTICAL DECK:
              </span>

              {/* 3D Digital Earth */}
              <button
                onClick={() => {
                  soundFx.playSwitch();
                  setActiveDeck('globe');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-semibold active:scale-95 ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-semibold active:scale-95 ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-semibold active:scale-95 ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-semibold active:scale-95 ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-semibold active:scale-95 ${
                  activeDeck === 'hazards'
                    ? 'bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-lg shadow-rose-950/60 border border-rose-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Waves className="w-4 h-4 text-rose-300" />
                <span>Seismic &amp; Marine</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-purple-300 pr-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="hidden md:inline font-semibold">ALL APIS LIVE &amp; FREE</span>
            </div>
          </div>

          {/* Dynamic Active Hero Deck */}
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

          {/* Regional Trends & Analytical Extremes */}
          <TrendCharts observations={observations} />

          {/* Recent Station Observations Data Table */}
          <ObservationsTable
            observations={observations}
            onSelectStation={id => setSelectedStationId(id)}
            selectedStationId={selectedStationId}
          />
        </main>
      )}

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

      {/* Footer (Emotion Agency Luxury Dark Style) */}
      <footer className="bg-[#030408] border-t border-white/[0.08] py-8 px-4 sm:px-6 lg:px-12 mt-16 text-xs font-mono text-slate-500">
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 text-slate-400">
            <span className="font-bold text-white font-display text-sm tracking-wide">METEOR-IN</span>
            <span className="hidden sm:inline">&bull;</span>
            <span>National Weather Data Intelligence Platform for India</span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="text-purple-400">WMO Standard Synoptics</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span>Open-Meteo API</span>
            <span>&bull;</span>
            <span>RainViewer Radar</span>
            <span>&bull;</span>
            <span>CPCB NAQI</span>
            <span>&bull;</span>
            <span>USGS Seismology</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
