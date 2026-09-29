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
} from 'lucide-react';
import { DataSourceItem } from '../types/index.ts';
import { getSourceStatusStyle, formatISTTime } from '../utils/formatters.ts';

interface HeaderProps {
  sources: DataSourceItem[];
  lastIngestionTime: string;
  latencyMs: number;
  recordsCount: number;
  sseConnected: boolean;
  isDemoMode: boolean;
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
  onSync,
  onOpenReportModal,
  onToggleAdmin,
  isAdminOpen,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  // Find sources by code or id
  const openMeteo = sources.find(s => s.code === 'OPEN_METEO');
  const openAQ = sources.find(s => s.code === 'OPENAQ');
  const citizenSrc = sources.find(s => s.code === 'CITIZEN_REPORTS');
  const imdSrc = sources.find(s => s.code === 'IMD_ADAPTER');
  const satSrc = sources.find(s => s.code === 'INSAT_ADAPTER');

  return (
    <header className="bg-[#0f172a] border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-lg">
      {/* Top National Branding Banner */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400 shadow-md">
            <CloudLightning className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                METEOR-IN
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                राष्ट्रीय मौसम आसूचना मंच
              </span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              LIVE WEATHER INTELLIGENCE — INDIA
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition disabled:opacity-50"
            title="Trigger immediate backend data refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          <button
            onClick={onOpenReportModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white shadow-sm transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Submit Citizen Report</span>
          </button>

          <button
            onClick={onToggleAdmin}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition ${
              isAdminOpen
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>{isAdminOpen ? 'Close Operations Center' : 'Operations & Admin'}</span>
          </button>
        </div>
      </div>

      {/* System Status Bar (As Specified in Prompt) */}
      <div className="bg-[#0b1324] px-4 sm:px-6 py-2 border-t border-slate-800/40 text-xs font-mono">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-6">
          {/* Live Data Sources List */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <div className="flex items-center space-x-1.5 font-bold tracking-wider text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE DATA:</span>
            </div>

            {/* Open-Meteo */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Open-Meteo</span>
              <span className="inline-flex items-center space-x-1 font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
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

            {/* Citizen Reports */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Citizen Reports</span>
              <span className="inline-flex items-center space-x-1 font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>ONLINE</span>
              </span>
            </div>

            {/* IMD */}
            <div className="flex items-center space-x-1.5 text-slate-500">
              <span>IMD</span>
              <span className="inline-flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                <span>NOT CONNECTED</span>
              </span>
            </div>

            {/* Satellite */}
            <div className="flex items-center space-x-1.5 text-slate-500 hidden md:flex">
              <span>Satellite</span>
              <span className="inline-flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                <span>NOT CONNECTED</span>
              </span>
            </div>
          </div>

          {/* Telemetry Metrics */}
          <div className="flex flex-wrap items-center gap-x-4 text-slate-400">
            <div className="flex items-center space-x-1.5" title="Last successful ingestion timestamp">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Last Ingest:</span>
              <span className="text-slate-200 font-semibold">{formatISTTime(lastIngestionTime)}</span>
            </div>

            <div className="flex items-center space-x-1.5" title="Data latency from API source">
              <span>Latency:</span>
              <span className="text-sky-300 font-semibold">{latencyMs ? `${latencyMs}ms` : 'N/A'}</span>
            </div>

            <div className="flex items-center space-x-1.5" title="Records ingested in latest cycle">
              <span>Stations:</span>
              <span className="text-slate-200 font-semibold">{recordsCount}</span>
            </div>

            <div className="flex items-center space-x-1.5" title="Server-Sent Events streaming status">
              <Radio className={`w-3.5 h-3.5 ${sseConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
              <span className={sseConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                {sseConnected ? 'STREAMING' : 'DISCONNECTED'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
