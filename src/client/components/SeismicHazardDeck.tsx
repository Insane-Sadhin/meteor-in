import React, { useState, useEffect } from 'react';
import { SeismicEvent, CoastalMarinePoint } from '../types/index.ts';
import { fetchSeismicHazards, fetchMarineConditions } from '../utils/api.ts';
import { soundFx } from '../utils/soundEffects.ts';
import {
  Activity,
  Waves,
  AlertTriangle,
  Compass,
  Anchor,
  ShieldAlert,
  Radio,
  RefreshCw,
  ArrowUpRight,
  Gauge,
} from 'lucide-react';

export const SeismicHazardDeck: React.FC = () => {
  const [seismicEvents, setSeismicEvents] = useState<SeismicEvent[]>([]);
  const [marinePoints, setMarinePoints] = useState<CoastalMarinePoint[]>([]);
  const [activeTab, setActiveTab] = useState<'seismic' | 'marine'>('seismic');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    const [seismic, marine] = await Promise.all([
      fetchSeismicHazards(),
      fetchMarineConditions(),
    ]);
    setSeismicEvents(seismic);
    setMarinePoints(marine);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getMagnitudeColor = (mag: number) => {
    if (mag >= 6.0) return 'text-rose-400 bg-rose-950/70 border-rose-500/60';
    if (mag >= 4.5) return 'text-orange-400 bg-orange-950/70 border-orange-500/60';
    if (mag >= 3.5) return 'text-amber-400 bg-amber-950/70 border-amber-500/60';
    return 'text-cyan-400 bg-cyan-950/70 border-cyan-500/60';
  };

  const getSeaConditionColor = (cond: CoastalMarinePoint['seaSurfaceCondition']) => {
    switch (cond) {
      case 'Calm':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
      case 'Moderate':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40';
      case 'Rough':
        return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
      case 'High Swell':
        return 'text-rose-400 bg-rose-950/70 border-rose-500/50';
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
      {/* Deck Header */}
      <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/70 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide font-mono uppercase">
                Geophysical Hazards & Coastal Sea-State
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                USGS & Open-Meteo Marine &bull; Free APIs
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Indian tectonic fault monitoring & Peninsular coastal wave telemetry
            </p>
          </div>
        </div>

        {/* Tab & Refresh Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => { soundFx.playSwitch(); setActiveTab('seismic'); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition ${
                activeTab === 'seismic'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Seismic ({seismicEvents.length})</span>
            </button>

            <button
              onClick={() => { soundFx.playSwitch(); setActiveTab('marine'); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition ${
                activeTab === 'marine'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Marine Sea-State ({marinePoints.length})</span>
            </button>
          </div>

          <button
            onClick={() => { soundFx.playClick(); loadData(); }}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Hazard Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Tab 1: Seismic Earthquakes */}
        {activeTab === 'seismic' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
              <span>Himalayan Collision Zone, Andaman Subduction & Indian Plate</span>
              <span>Source: USGS Real-Time Earthquake Program</span>
            </div>

            {seismicEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No recent seismic anomalies detected in the Indian subcontinent perimeter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {seismicEvents.map(event => (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">Epicenter</span>
                        <h5 className="text-xs font-bold text-white leading-snug">{event.place}</h5>
                      </div>
                      <div
                        className={`px-2.5 py-1 rounded-lg border text-sm font-black font-mono ${getMagnitudeColor(
                          event.magnitude
                        )}`}
                      >
                        M {event.magnitude.toFixed(1)}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                      <div className="p-1.5 rounded bg-slate-950/70 border border-slate-800/80">
                        <span className="text-slate-500 block">Focal Depth</span>
                        <span className="text-slate-200 font-bold">{event.depthKm} km</span>
                      </div>
                      <div className="p-1.5 rounded bg-slate-950/70 border border-slate-800/80">
                        <span className="text-slate-500 block">Tsunami Alert</span>
                        <span className={event.tsunamiAlert ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                          {event.tsunamiAlert ? 'YES' : 'NONE'}
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-slate-950/70 border border-slate-800/80">
                        <span className="text-slate-500 block">Severity</span>
                        <span className="text-slate-200 font-bold">{event.severity}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>Lat {event.latitude.toFixed(2)}°N, Lon {event.longitude.toFixed(2)}°E</span>
                      <span>{new Date(event.time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })} IST</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Coastal Marine & Wave Heights */}
        {activeTab === 'marine' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
              <span>Arabian Sea & Bay of Bengal Strategic Ports • Live Swell Telemetry</span>
              <span>Source: Open-Meteo Global Marine Model</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {marinePoints.map((point, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 block">{point.sea}</span>
                      <h5 className="text-sm font-bold text-white">{point.city}</h5>
                      <span className="text-[10px] text-slate-400">{point.state}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSeaConditionColor(
                        point.seaSurfaceCondition
                      )}`}
                    >
                      {point.seaSurfaceCondition}
                    </span>
                  </div>

                  {/* Wave Height Hero Indicator */}
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Waves className="w-5 h-5 text-cyan-400" />
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Wave Height</span>
                        <span className="text-lg font-black font-mono text-cyan-300">
                          {point.waveHeightMeters} m
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-[9px] text-slate-500 block">Period</span>
                      <span className="text-slate-300 font-bold">{point.wavePeriodSeconds}s</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Compass className="w-3 h-3 text-cyan-400" />
                      <span>Swell: {point.waveDirectionDegrees}°</span>
                    </span>
                    <span>
                      {point.waveHeightMeters >= 2.5 ? (
                        <span className="text-rose-400 font-bold">Port Warning</span>
                      ) : (
                        <span className="text-emerald-400">Nav Safe</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
