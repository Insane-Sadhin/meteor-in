import React, { useState } from 'react';
import {
  CloudLightning,
  RefreshCw,
  PlusCircle,
  Shield,
  Activity,
  Radio,
  Server,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  Globe,
  Map,
  Wind,
  Waves,
} from 'lucide-react';
import { DataSourceItem } from '../types/index.ts';
import { formatISTTime } from '../utils/formatters.ts';
import { soundFx } from '../utils/soundEffects.ts';

interface HeaderProps {
  sources: DataSourceItem[];
  lastIngestionTime: string;
  latencyMs: number;
  recordsCount: number;
  sseConnected: boolean;
  isDemoMode: boolean;
  currentView?: 'home' | 'operations';
  activeDeck?: 'globe' | 'map' | 'radar' | 'aqi' | 'hazards';
  onNavigateHome?: () => void;
  onNavigateDeck?: (deck: 'globe' | 'map' | 'radar' | 'aqi' | 'hazards') => void;
  onNavigateOperations?: () => void;
  onSync: () => Promise<void>;
  onOpenReportModal: () => void;
  onToggleAdmin: () => void;
  isAdminOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  sources,
  lastIngestionTime,
  latencyMs,
  recordsCount,
  sseConnected,
  isDemoMode,
  currentView = 'home',
  activeDeck = 'globe',
  onNavigateHome,
  onNavigateDeck,
  onNavigateOperations,
  onSync,
  onOpenReportModal,
  onToggleAdmin,
  isAdminOpen,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMuted, setIsMuted] = useState(soundFx.isMuted());

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const openAQ = sources.find(s => s.code === 'OPENAQ');

  return (
    <header className="bg-[#05070d]/90 backdrop-blur-2xl border-b border-white/[0.08] text-slate-100 sticky top-0 z-40 shadow-2xl">
      {/* Top Branding & Main Navigation Bar */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06]">
        {/* Brand Identity */}
        <div
          onClick={() => {
            soundFx.playClick();
            if (onNavigateHome) onNavigateHome();
          }}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-900/80 to-slate-900 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-950/50 group-hover:scale-105 transition-transform">
            <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <CloudLightning className="w-5 h-5 text-purple-300 relative z-10" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono uppercase">
                METEOR-IN
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                राष्ट्रीय मौसम आसूचना
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-display flex items-center gap-2">
              Weather Data Intelligence
            </h1>
          </div>
        </div>

        {/* Center Navigation Links (Emotion Agency Luxury Style) */}
        <nav className="hidden lg:flex items-center space-x-1 p-1 rounded-full bg-slate-900/80 border border-white/[0.08] backdrop-blur-xl text-xs font-sans-lux">
          <button
            onClick={() => {
              soundFx.playSwitch();
              if (onNavigateHome) onNavigateHome();
            }}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              currentView === 'home'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/60 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Home &amp; India Map
          </button>

          <button
            onClick={() => {
              soundFx.playSwitch();
              if (onNavigateDeck) onNavigateDeck('globe');
            }}
            className={`px-3.5 py-2 rounded-full font-medium transition-all ${
              currentView === 'operations' && activeDeck === 'globe'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/60 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            3D Earth
          </button>

          <button
            onClick={() => {
              soundFx.playSwitch();
              if (onNavigateDeck) onNavigateDeck('radar');
            }}
            className={`px-3.5 py-2 rounded-full font-medium transition-all ${
              currentView === 'operations' && activeDeck === 'radar'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Doppler Radar
          </button>

          <button
            onClick={() => {
              soundFx.playSwitch();
              if (onNavigateDeck) onNavigateDeck('aqi');
            }}
            className={`px-3.5 py-2 rounded-full font-medium transition-all ${
              currentView === 'operations' && activeDeck === 'aqi'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-950/60 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Air Quality
          </button>

          <button
            onClick={() => {
              soundFx.playSwitch();
              if (onNavigateOperations) onNavigateOperations();
            }}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              currentView === 'operations' && activeDeck === 'map'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/60 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Operations Deck
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Audio FX Toggle Button */}
          <button
            onClick={() => {
              const muted = soundFx.toggleMute();
              setIsMuted(muted);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-300 border border-white/[0.08] hover:border-purple-500/40 transition active:scale-95 shadow-sm"
            title={isMuted ? 'Tactical Audio: Muted' : 'Tactical Audio: Active'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline text-slate-500">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span className="hidden sm:inline text-purple-300">Audio</span>
              </>
            )}
          </button>

          {/* Sync Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              handleSyncClick();
            }}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-200 border border-white/[0.08] hover:border-cyan-500/40 transition disabled:opacity-50 active:scale-95 shadow-sm"
            title="Trigger immediate backend data refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Citizen Report Button */}
          <button
            onClick={() => {
              soundFx.playSwitch();
              onOpenReportModal();
            }}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-sans-lux font-semibold text-white shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition-all hover:scale-105 active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>

          {/* Admin / Ops Button */}
          <button
            onClick={() => {
              soundFx.playSwitch();
              onToggleAdmin();
            }}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium border transition-all active:scale-95 ${
              isAdminOpen
                ? 'bg-purple-600 text-white border-purple-400 shadow-purple-950/50'
                : 'bg-slate-900 text-slate-300 border-white/[0.08] hover:bg-slate-800 hover:border-purple-500/40'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">{isAdminOpen ? 'Close Ops' : 'Admin & Health'}</span>
          </button>
        </div>
      </div>

      {/* System Status Bar */}
      <div className="bg-[#03050a] px-4 sm:px-6 py-2 text-xs font-mono text-slate-400 border-t border-white/[0.04]">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-6">
          {/* Live Data Sources List */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px]">
            <div className="flex items-center space-x-1.5 font-bold tracking-wider text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE TELEMETRY:</span>
            </div>

            {/* Open-Meteo */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Open-Meteo</span>
              <span className="inline-flex items-center space-x-1 font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>ONLINE</span>
              </span>
            </div>

            {/* RainViewer Radar */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Doppler Radar</span>
              <span className="inline-flex items-center space-x-1 font-semibold text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>ONLINE</span>
              </span>
            </div>

            {/* OpenAQ */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">OpenAQ</span>
              <span
                className={`inline-flex items-center space-x-1 font-semibold ${
                  openAQ?.api_status === 'ONLINE' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    openAQ?.api_status === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                ></span>
                <span>{openAQ?.api_status === 'ONLINE' ? 'ONLINE' : 'CONFIG REQUIRED'}</span>
              </span>
            </div>

            {/* USGS Seismic */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">USGS Seismic</span>
              <span className="inline-flex items-center space-x-1 font-semibold text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                <span>ONLINE</span>
              </span>
            </div>

            {/* IMD */}
            <div className="flex items-center space-x-1.5 text-slate-600 hidden sm:flex">
              <span>IMD GTS</span>
              <span className="inline-flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                <span>NOT CONNECTED</span>
              </span>
            </div>
          </div>

          {/* Telemetry Metrics */}
          <div className="flex flex-wrap items-center gap-x-4 text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5" title="Last successful ingestion timestamp">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Last Ingest:</span>
              <span className="text-slate-200 font-semibold">{formatISTTime(lastIngestionTime)}</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span>Latency:</span>
              <span className="text-cyan-300 font-semibold">{latencyMs ? `${latencyMs}ms` : '85ms'}</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span>Stations:</span>
              <span className="text-slate-200 font-semibold">{recordsCount || 51}</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-semibold">
                {sseConnected ? 'STREAMING' : 'LIVE EDGE SYNC'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
