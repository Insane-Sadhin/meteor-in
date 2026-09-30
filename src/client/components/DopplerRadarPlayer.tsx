import React, { useState, useEffect, useRef } from 'react';
import { RadarMetadata, RadarFrame, Observation } from '../types/index.ts';
import { fetchRadarMetadata } from '../utils/api.ts';
import { soundFx } from '../utils/soundEffects.ts';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Radio,
  Layers,
  Info,
  Maximize2,
  RefreshCw,
  Eye,
  Activity,
} from 'lucide-react';

interface DopplerRadarPlayerProps {
  observations: Observation[];
  onSelectStation?: (stationId: string) => void;
}

export const DopplerRadarPlayer: React.FC<DopplerRadarPlayerProps> = ({
  observations,
  onSelectStation,
}) => {
  const [radarMeta, setRadarMeta] = useState<RadarMetadata | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(600); // ms per frame
  const [colorScheme, setColorScheme] = useState<number>(2); // 2: Universal blue-green-orange-red
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [radarOpacity, setRadarOpacity] = useState<number>(0.75);

  const timerRef = useRef<any>(null);

  // Fetch radar metadata
  const loadRadar = async () => {
    setIsLoading(true);
    const data = await fetchRadarMetadata();
    if (data && data.radar && (data.radar.past?.length || data.radar.nowcast?.length)) {
      setRadarMeta(data);
      const totalFrames = (data.radar.past?.length || 0) + (data.radar.nowcast?.length || 0);
      setCurrentFrameIndex(Math.max(0, (data.radar.past?.length || 1) - 1));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRadar();
  }, []);

  // Frame list: combines past and nowcast
  const frames: RadarFrame[] = React.useMemo(() => {
    if (!radarMeta || !radarMeta.radar) return [];
    return [...(radarMeta.radar.past || []), ...(radarMeta.radar.nowcast || [])];
  }, [radarMeta]);

  const currentFrame = frames[currentFrameIndex];
  const isNowcast = radarMeta?.radar?.past
    ? currentFrameIndex >= radarMeta.radar.past.length
    : false;

  // Animation playback loop
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      timerRef.current = setInterval(() => {
        setCurrentFrameIndex(prev => (prev + 1) % frames.length);
      }, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, frames.length, playbackSpeed]);

  const togglePlay = () => {
    soundFx.playClick();
    setIsPlaying(prev => !prev);
  };

  const stepForward = () => {
    soundFx.playClick();
    setIsPlaying(false);
    setCurrentFrameIndex(prev => (prev + 1) % frames.length);
  };

  const stepBackward = () => {
    soundFx.playClick();
    setIsPlaying(false);
    setCurrentFrameIndex(prev => (prev - 1 + frames.length) % frames.length);
  };

  // Convert frame unix time to IST
  const formatFrameTime = (unixSec: number) => {
    if (!unixSec) return 'LIVE SWEEP';
    const d = new Date(unixSec * 1000);
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }) + ' IST';
  };

  // Pre-calculate sample tile for India center: z=5, x=23, y=14
  // RainViewer tile format: {host}{path}/256/{z}/{x}/{y}/{colorScheme}/1_1.png
  const getRadarTileUrl = (z: number, x: number, y: number) => {
    if (!radarMeta || !currentFrame) return '';
    return `${radarMeta.host}${currentFrame.path}/256/${z}/${x}/${y}/${colorScheme}/1_1.png`;
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
      {/* Top Header Bar */}
      <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Live Doppler Weather Radar • India Composite
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                RainViewer V2 &bull; 100% Free
              </span>
            </div>
            <p className="text-xs text-slate-400">
              High-resolution precipitation reflectivity & storm cell track sweeps
            </p>
          </div>
        </div>

        {/* Live / Nowcast Status Badge */}
        <div className="flex items-center space-x-2">
          {isNowcast ? (
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-purple-950/70 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              NOWCAST FORECAST
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              RECORDED RADAR
            </span>
          )}

          <button
            onClick={() => { soundFx.playClick(); loadRadar(); }}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Radar Frames"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Radar Screen Display with Tactical Grid */}
      <div className="relative w-full h-[480px] bg-[#030914] overflow-hidden flex items-center justify-center">
        {/* Tactical Crosshair / Coordinate Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Radar Concentric Distance Rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[180px] h-[180px] rounded-full border border-cyan-500/15" />
            <div className="w-[340px] h-[340px] rounded-full border border-cyan-500/15" />
            <div className="w-[500px] h-[500px] rounded-full border border-cyan-500/10" />
            <div className="w-[660px] h-[660px] rounded-full border border-cyan-500/5" />
          </div>

          {/* Cross lines */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/20" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500/20" />

          {/* Rotating Radar Sweep Line */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[480px] h-[480px] rounded-full animate-spin [animation-duration:5s] [animation-timing-function:linear] pointer-events-none">
              <div
                className="w-1/2 h-1/2 origin-bottom-right"
                style={{
                  background: 'conic-gradient(from 180deg at 100% 100%, transparent 60deg, rgba(6, 182, 212, 0.25) 90deg, rgba(6, 182, 212, 0.5) 90deg)',
                }}
              />
            </div>
          </div>

          {/* Compass Readouts */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-[11px] text-cyan-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-cyan-500/30">
            000° N • HIMALAYAN FRONT
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[11px] text-cyan-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-cyan-500/30">
            180° S • INDIAN OCEAN BASIN
          </div>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-cyan-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-cyan-500/30">
            270° W • ARABIAN SEA
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-cyan-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-cyan-500/30">
            090° E • BAY OF BENGAL
          </div>
        </div>

        {/* Simulated GIS Tactical Background with Subcontinent Map */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#040d1a] to-[#020611]">
          {/* 3x3 Radar Tile Grid covering Indian Peninsula & Bay of Bengal */}
          {radarMeta && currentFrame && (
            <div
              className="absolute inset-0 grid grid-cols-3 grid-rows-3 transition-opacity duration-300"
              style={{ opacity: radarOpacity }}
            >
              {[
                { x: 22, y: 13 }, { x: 23, y: 13 }, { x: 24, y: 13 },
                { x: 22, y: 14 }, { x: 23, y: 14 }, { x: 24, y: 14 },
                { x: 22, y: 15 }, { x: 23, y: 15 }, { x: 24, y: 15 },
              ].map((tile, i) => (
                <div key={i} className="relative w-full h-full overflow-hidden border border-cyan-500/5">
                  <img
                    src={getRadarTileUrl(5, tile.x, tile.y)}
                    alt=""
                    className="w-full h-full object-cover filter contrast-125"
                    onError={(e) => {
                      // Seamless fallback if single tile missing
                      (e.target as HTMLElement).style.opacity = '0';
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Weather Station Markers Overlay */}
        <div className="absolute inset-0 z-20 pointer-events-auto">
          {observations.slice(0, 16).map((station) => {
            // Rough mapping of Indian station coords to radar screen
            // Lat: 8 to 36 (range 28) -> Y
            // Lon: 68 to 96 (range 28) -> X
            const topPercent = Math.max(8, Math.min(88, ((36 - station.latitude) / 28) * 100));
            const leftPercent = Math.max(8, Math.min(92, ((station.longitude - 68) / 28) * 100));

            const hasRain = station.precipitation > 0;

            return (
              <button
                key={station.location_id}
                onClick={() => {
                  soundFx.playClick();
                  if (onSelectStation) onSelectStation(station.location_id);
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                title={`${station.city}: ${station.temperature}°C, ${station.weather_condition}`}
              >
                <div className="relative flex items-center justify-center">
                  <div className={`w-2.5 h-2.5 rounded-full ${hasRain ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'}`} />
                  <div className={`absolute w-2 h-2 rounded-full ${hasRain ? 'bg-cyan-300' : 'bg-amber-300'}`} />
                </div>
                {/* Station Tag */}
                <div className="hidden group-hover:block absolute left-4 top-1/2 -translate-y-1/2 z-30 whitespace-nowrap px-2 py-1 rounded bg-slate-900/95 border border-cyan-500/50 text-[11px] font-mono text-cyan-300 shadow-xl backdrop-blur-md">
                  <strong>{station.city}</strong>: {station.temperature.toFixed(1)}°C | {station.precipitation} mm
                </div>
              </button>
            );
          })}
        </div>

        {/* Center Target Marker */}
        <div className="z-20 pointer-events-none text-center">
          <div className="text-[10px] font-mono font-bold text-cyan-400/80 tracking-widest bg-slate-950/70 px-3 py-1 rounded border border-cyan-500/20 backdrop-blur-sm">
            NAGPUR RADAR ZENITH (LAT 21.14°N, LON 79.08°E)
          </div>
        </div>
      </div>

      {/* Bottom Timeline & Playback Controller */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col gap-3">
        {/* Frame Progress Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Activity className="w-3.5 h-3.5" />
              <span>SWEEP TIME: {currentFrame ? formatFrameTime(currentFrame.time) : 'SYNCING...'}</span>
            </span>
            <span>
              Frame <strong className="text-white">{currentFrameIndex + 1}</strong> of {frames.length || 1}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={currentFrameIndex}
            onChange={(e) => {
              soundFx.playClick();
              setIsPlaying(false);
              setCurrentFrameIndex(parseInt(e.target.value, 10));
            }}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <button
              onClick={stepBackward}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Previous Frame"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-lg shadow-cyan-900/40"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              onClick={stepForward}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Next Frame"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Radar Reflectivity dBZ Legend */}
          <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Reflectivity:</span>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-2 rounded-sm bg-blue-500" title="Light Rain (15-25 dBZ)" />
              <span className="w-3 h-2 rounded-sm bg-emerald-400" title="Moderate (25-35 dBZ)" />
              <span className="w-3 h-2 rounded-sm bg-amber-400" title="Heavy Rain (35-45 dBZ)" />
              <span className="w-3 h-2 rounded-sm bg-orange-500" title="Downpour (45-55 dBZ)" />
              <span className="w-3 h-2 rounded-sm bg-rose-600" title="Severe Storm / Hail (55+ dBZ)" />
            </div>
            <span className="text-[10px] text-slate-400">15 → 65+ dBZ</span>
          </div>

          {/* Opacity Control */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-400">Radar Layer:</span>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={radarOpacity}
              onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-800 rounded accent-cyan-400"
              title="Adjust Radar Tile Opacity"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
