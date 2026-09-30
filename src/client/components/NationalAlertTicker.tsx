import React from 'react';
import { Observation, WeatherEventItem } from '../types/index.ts';
import { soundFx } from '../utils/soundEffects.ts';
import { AlertTriangle, Flame, CloudRain, Wind, Radio, ShieldAlert } from 'lucide-react';

interface NationalAlertTickerProps {
  events: WeatherEventItem[];
  observations: Observation[];
  onSelectStation?: (stationId: string) => void;
}

export const NationalAlertTicker: React.FC<NationalAlertTickerProps> = ({
  events,
  observations,
  onSelectStation,
}) => {
  // Synthesize national alerts list from detected events and observations
  const alerts: Array<{ id: string; type: string; message: string; severity: string; stationId?: string }> = [];

  events.forEach(e => {
    alerts.push({
      id: `ev-${e.id}`,
      type: e.event_type,
      message: `${e.city} (${e.state}): ${e.summary}`,
      severity: e.severity,
      stationId: e.location_id,
    });
  });

  // Check temperature and rain extremes
  observations.forEach(o => {
    if (o.temperature >= 40.0) {
      alerts.push({
        id: `heat-${o.location_id}`,
        type: 'Heatwave Advisory',
        message: `${o.city} recorded severe high temperature of ${o.temperature.toFixed(1)}°C`,
        severity: 'HIGH',
        stationId: o.location_id,
      });
    }
    if (o.precipitation >= 20.0) {
      alerts.push({
        id: `rain-${o.location_id}`,
        type: 'Torrential Precipitation',
        message: `${o.city} experiencing heavy rainfall (${o.precipitation.toFixed(1)} mm)`,
        severity: 'SEVERE',
        stationId: o.location_id,
      });
    }
  });

  // If no critical alerts, provide standard baseline bulletin
  if (alerts.length === 0) {
    alerts.push(
      {
        id: 'std-1',
        type: 'ROUTINE MONITORING',
        message: 'All IMD synoptic weather observation stations reporting normal operational conditions across all meteorological zones.',
        severity: 'LOW',
      },
      {
        id: 'std-2',
        type: 'SATELLITE TELEMETRY',
        message: 'INSAT-3DR thermal infrared & visible imaging channels synchronized with Open-Meteo high-resolution NWP grid.',
        severity: 'LOW',
      }
    );
  }

  return (
    <div className="w-full bg-[#070e1b] border-y border-cyan-500/20 py-1.5 px-4 overflow-hidden relative shadow-inner">
      <div className="max-w-[1720px] mx-auto flex items-center space-x-3 text-xs font-mono">
        {/* Flashing Tag */}
        <div className="flex items-center space-x-1.5 shrink-0 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/50 text-rose-400 font-bold tracking-wider uppercase text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          <span>NATIONAL BULLETIN</span>
        </div>

        {/* Marquee Ticker */}
        <div className="flex-1 overflow-x-auto no-scrollbar whitespace-nowrap flex items-center space-x-8 text-slate-300">
          {alerts.map((alert, i) => (
            <div
              key={alert.id || i}
              onClick={() => {
                if (alert.stationId && onSelectStation) {
                  soundFx.playClick();
                  onSelectStation(alert.stationId);
                }
              }}
              className={`inline-flex items-center space-x-2 shrink-0 ${
                alert.stationId ? 'cursor-pointer hover:text-white transition' : ''
              }`}
            >
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  alert.severity === 'SEVERE' || alert.severity === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                }`}
              >
                {alert.type}
              </span>
              <span className="text-xs text-slate-300 font-medium">{alert.message}</span>
              <span className="text-slate-600 font-bold">&bull;</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
