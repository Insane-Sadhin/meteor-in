import React from 'react';
import {
  MapPin,
  AlertTriangle,
  FileText,
  CheckCircle,
  Database,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { formatISTTime } from '../utils/formatters.ts';

interface KpiCardsProps {
  locationsCount: number;
  activeEventsCount: number;
  reportsCount: number;
  verifiedReportsCount: number;
  dataSourcesCount: number;
  lastIngestionTime: string;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  locationsCount,
  activeEventsCount,
  reportsCount,
  verifiedReportsCount,
  dataSourcesCount,
  lastIngestionTime,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. Live Locations */}
      <div className="bg-[#111c30] border border-slate-800 rounded-lg p-3.5 shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider">Live Locations</span>
          <MapPin className="w-4 h-4 text-sky-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-white">{locationsCount}</span>
          <span className="text-[11px] text-emerald-400 font-mono">Stations</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 truncate">All 28 States & UTs</div>
      </div>

      {/* 2. Active Events */}
      <div className={`rounded-lg p-3.5 shadow-sm border transition ${
        activeEventsCount > 0
          ? 'bg-[#181828] border-amber-800/80 shadow-amber-950/20'
          : 'bg-[#111c30] border-slate-800'
      }`}>
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider">Active Events</span>
          <AlertTriangle className={`w-4 h-4 ${activeEventsCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className={`text-2xl font-bold font-mono ${activeEventsCount > 0 ? 'text-amber-300' : 'text-slate-300'}`}>
            {activeEventsCount}
          </span>
          <span className="text-[11px] text-amber-400/80 font-mono">Detections</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 truncate">Automated System Triggers</div>
      </div>

      {/* 3. Reports Today */}
      <div className="bg-[#111c30] border border-slate-800 rounded-lg p-3.5 shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider">Reports Today</span>
          <FileText className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-white">{reportsCount}</span>
          <span className="text-[11px] text-indigo-400 font-mono">Citizen</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 truncate">Crowdsourced Inputs</div>
      </div>

      {/* 4. Verified Reports */}
      <div className="bg-[#111c30] border border-slate-800 rounded-lg p-3.5 shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider">Verified Reports</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-emerald-400">{verifiedReportsCount}</span>
          <span className="text-[11px] text-slate-400 font-mono">
            {reportsCount > 0 ? `${Math.round((verifiedReportsCount / reportsCount) * 100)}%` : '0%'}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 truncate">Ground-Truth Correlated</div>
      </div>

      {/* 5. Data Sources */}
      <div className="bg-[#111c30] border border-slate-800 rounded-lg p-3.5 shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider">Data Sources</span>
          <Database className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-white">{dataSourcesCount}</span>
          <span className="text-[11px] text-cyan-400 font-mono">Feeds</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 truncate">Open-Meteo Primary</div>
      </div>

      {/* 6. Last Ingestion */}
      <div className="bg-[#111c30] border border-slate-800 rounded-lg p-3.5 shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider">Last Ingestion</span>
          <Clock className="w-4 h-4 text-sky-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-base font-bold font-mono text-slate-200">
            {formatISTTime(lastIngestionTime)}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 truncate">Poll Interval: 5 min</div>
      </div>
    </div>
  );
};
