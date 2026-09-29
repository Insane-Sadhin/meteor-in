import React from 'react';
import {
  AlertTriangle,
  Zap,
  CloudRain,
  Flame,
  Wind,
  EyeOff,
  Radio,
  Check,
  ChevronRight,
} from 'lucide-react';
import { WeatherEventItem } from '../types/index.ts';
import { formatISTTime, getSeverityBadge } from '../utils/formatters.ts';

interface ActiveEventsProps {
  events: WeatherEventItem[];
  onSelectStation: (stationId: string) => void;
}

export const ActiveEvents: React.FC<ActiveEventsProps> = ({ events, onSelectStation }) => {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'Heavy Rain':
        return <CloudRain className="w-4 h-4 text-sky-400" />;
      case 'Thunderstorm':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Flood Risk':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'Heatwave':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'Fog':
        return <EyeOff className="w-4 h-4 text-slate-300" />;
      case 'Strong Wind':
        return <Wind className="w-4 h-4 text-teal-400" />;
      default:
        return <Radio className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="bg-[#111c30] border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#0e1728]">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            ACTIVE SYSTEM DETECTIONS
          </h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/80">
          {events.length} ACTIVE
        </span>
      </div>

      {/* Notice Banner */}
      <div className="px-3.5 py-1.5 bg-slate-900/60 border-b border-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-between">
        <span>SOURCE: AUTOMATED HEURISTIC INFERENCE</span>
        <span className="text-amber-400 font-semibold">NOT OFFICIAL IMD WARNING</span>
      </div>

      {/* Events List */}
      <div className="divide-y divide-slate-800/80 overflow-y-auto flex-1 max-h-[580px] p-2 space-y-2">
        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">
            <Check className="w-8 h-8 mx-auto text-emerald-400/80 mb-2" />
            <p className="text-slate-300 font-medium">All Stations Nominal</p>
            <p className="text-[11px] text-slate-400 mt-1">No anomalous meteorological thresholds currently breached across national observation network.</p>
          </div>
        ) : (
          events.map(ev => {
            const badge = getSeverityBadge(ev.severity);
            const confPercent = Math.round(ev.confidence * 100);

            return (
              <div
                key={ev.id}
                onClick={() => onSelectStation(ev.location_id)}
                className="bg-[#15233c] hover:bg-[#1a2c4c] p-3 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition shadow-sm group"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="p-1 rounded bg-slate-800 border border-slate-700">
                      {getEventIcon(ev.event_type)}
                    </span>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-bold font-mono text-amber-400 uppercase tracking-wider">
                          SYSTEM DETECTION
                        </span>
                        <span className="text-slate-400 text-xs">&bull;</span>
                        <span className="text-xs font-bold text-white group-hover:text-sky-300 transition">
                          {ev.city}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-200">
                        {ev.event_type}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {ev.severity}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 mt-1 font-semibold">
                      Confidence {confPercent}%
                    </span>
                  </div>
                </div>

                {/* Explainability / Rationale */}
                <div className="mt-2 bg-[#0c1424] p-2 rounded border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Rationale:</div>
                  {ev.rationale}
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/60">
                  <span>Detected: {formatISTTime(ev.detected_at)}</span>
                  <span className="text-sky-400 flex items-center group-hover:translate-x-0.5 transition">
                    Station details <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
