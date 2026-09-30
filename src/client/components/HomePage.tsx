import React from 'react';
import { Observation, WeatherEventItem, CitizenReportItem, DataSourceItem } from '../types/index.ts';
import { InteractiveIndiaMap } from './InteractiveIndiaMap.tsx';
import { soundFx } from '../utils/soundEffects.ts';
import {
  Globe,
  Radio,
  Wind,
  Waves,
  Shield,
  Activity,
  ArrowRight,
  Sparkles,
  Compass,
  Thermometer,
  CloudRain,
  MapPin,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface HomePageProps {
  observations: Observation[];
  events: WeatherEventItem[];
  reports: CitizenReportItem[];
  sources: DataSourceItem[];
  onSelectStation: (stationId: string) => void;
  onNavigateToDeck: (deck: 'globe' | 'map' | 'radar' | 'aqi' | 'hazards') => void;
  onNavigateToOperations: () => void;
  onOpenReportModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  observations,
  events,
  reports,
  sources,
  onSelectStation,
  onNavigateToDeck,
  onNavigateToOperations,
  onOpenReportModal,
}) => {
  // Compute national live extremes
  const hottest = observations.length > 0
    ? [...observations].sort((a, b) => b.temperature - a.temperature)[0]
    : null;

  const coldest = observations.length > 0
    ? [...observations].sort((a, b) => a.temperature - b.temperature)[0]
    : null;

  const wettest = observations.length > 0
    ? [...observations].sort((a, b) => (b.precipitation || 0) - (a.precipitation || 0))[0]
    : null;

  const windiest = observations.length > 0
    ? [...observations].sort((a, b) => (b.wind_speed || 0) - (a.wind_speed || 0))[0]
    : null;

  return (
    <div className="relative min-h-screen text-slate-100 overflow-hidden bg-[#05070d]">
      {/* Ambient Radial Glowing Orbs (Emotion Agency Vibe) */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full ambient-orb-violet pointer-events-none blur-3xl -z-10" />
      <div className="absolute top-1/3 right-10 w-[550px] h-[550px] rounded-full ambient-orb-cyan pointer-events-none blur-3xl -z-10" />
      <div className="absolute bottom-1/4 left-10 w-[500px] h-[500px] rounded-full ambient-orb-violet pointer-events-none blur-3xl -z-10" />

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-12 max-w-[1720px] mx-auto">
        <div className="flex flex-col items-center text-center space-y-6 max-w-5xl mx-auto">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-mono shadow-xl backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span className="font-semibold tracking-wider uppercase">NATIONAL WEATHER INTELLIGENCE</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-slate-300 font-sans">LIVE SYNOPTIC PLATFORM</span>
          </div>

          {/* Editorial Display Heading (Emotion Agency Typography) */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight font-display text-white leading-[1.08]">
            The Atmosphere of India, <br />
            <span className="font-serif-lux italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-300">
              Decoded in Real-Time.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-3xl font-sans-lux leading-relaxed">
            Ingesting live atmospheric observations across 51 surface stations, 
            high-resolution precipitation radar sweeps, CPCB air quality indices, 
            and tectonic early warning feeds into an advanced GIS intelligence cockpit.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <a
              href="#interactive-map"
              onClick={() => soundFx.playClick()}
              className="flex items-center space-x-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-sans-lux font-semibold text-sm shadow-xl shadow-purple-950/60 border border-purple-400/40 transition-all hover:scale-105 active:scale-95"
            >
              <span>Explore Interactive India Map</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <button
              onClick={() => {
                soundFx.playSwitch();
                onNavigateToDeck('globe');
              }}
              className="flex items-center space-x-2 px-6 py-3.5 rounded-full glass-panel hover:bg-slate-800/80 text-white font-sans-lux font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>3D Digital Earth Globe</span>
            </button>

            <button
              onClick={() => {
                soundFx.playSwitch();
                onNavigateToOperations();
              }}
              className="flex items-center space-x-2 px-5 py-3.5 rounded-full bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white border border-white/[0.08] font-mono text-xs transition-all active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Operations Center</span>
            </button>
          </div>

          {/* Live Micro Status Bar */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>51 Live Surface Stations</span>
            </span>
            <span className="text-slate-700">&bull;</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>RainViewer Doppler Radar</span>
            </span>
            <span className="text-slate-700">&bull;</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              <span>CPCB NAQI Standards</span>
            </span>
            <span className="text-slate-700">&bull;</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
              <span>USGS Seismic Warning</span>
            </span>
          </div>
        </div>
      </section>

      {/* Flagship Feature: Interactive Map of India */}
      <section id="interactive-map" className="py-8 px-4 sm:px-6 lg:px-12 max-w-[1720px] mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-purple-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PRIMARY GIS SURFACE TELEMETRY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white">
              Live Interactive Map of India
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-sans-lux">
              Click on any station beacon to inspect instantaneous meteorological observations or filter by zone.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <button
              onClick={() => {
                soundFx.playSwitch();
                onNavigateToOperations();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:text-white transition"
            >
              <span>Full Analytics Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* The Interactive India Map */}
        <InteractiveIndiaMap
          observations={observations}
          events={events}
          onSelectStation={onSelectStation}
        />
      </section>

      {/* National Atmospheric Extremes Bar */}
      <section className="py-6 px-4 sm:px-6 lg:px-12 max-w-[1720px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Hottest */}
          <div className="p-4 rounded-2xl glass-panel border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Thermal Peak</span>
              <h5 className="text-sm font-bold text-white truncate">{hottest ? hottest.city : 'Scanning...'}</h5>
              <span className="text-[10px] text-slate-500 font-mono">{hottest ? hottest.state : ''}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-display text-amber-400 leading-none">
                {hottest ? `${hottest.temperature.toFixed(1)}°` : '--'}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">High Temp</span>
            </div>
          </div>

          {/* Coldest */}
          <div className="p-4 rounded-2xl glass-panel border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Alpine Min</span>
              <h5 className="text-sm font-bold text-white truncate">{coldest ? coldest.city : 'Scanning...'}</h5>
              <span className="text-[10px] text-slate-500 font-mono">{coldest ? coldest.state : ''}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-display text-cyan-400 leading-none">
                {coldest ? `${coldest.temperature.toFixed(1)}°` : '--'}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">Low Temp</span>
            </div>
          </div>

          {/* Wettest */}
          <div className="p-4 rounded-2xl glass-panel border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Precipitation Peak</span>
              <h5 className="text-sm font-bold text-white truncate">{wettest ? wettest.city : 'Scanning...'}</h5>
              <span className="text-[10px] text-slate-500 font-mono">{wettest ? wettest.state : ''}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-display text-blue-400 leading-none">
                {wettest ? `${(wettest.precipitation || 0).toFixed(1)}` : '--'}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">mm/h Rain</span>
            </div>
          </div>

          {/* Windiest */}
          <div className="p-4 rounded-2xl glass-panel border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Wind Velocity</span>
              <h5 className="text-sm font-bold text-white truncate">{windiest ? windiest.city : 'Scanning...'}</h5>
              <span className="text-[10px] text-slate-500 font-mono">{windiest ? windiest.state : ''}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-display text-purple-400 leading-none">
                {windiest ? `${windiest.wind_speed}` : '--'}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">km/h Gale</span>
            </div>
          </div>
        </div>
      </section>

      {/* Intelligence Pillars Bento Showcase (Emotion Agency Aesthetic) */}
      <section className="py-12 px-4 sm:px-6 lg:px-12 max-w-[1720px] mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-purple-400">
            ADVANCED SYNOPTIC MODULES
          </span>
          <h3 className="text-3xl font-bold font-display text-white">
            Specialized Atmospheric Intelligence
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 font-sans-lux">
            Multi-modal data streams harmonized into specialized tactical decks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: 3D Earth Globe */}
          <div
            onClick={() => {
              soundFx.playSwitch();
              onNavigateToDeck('globe');
            }}
            className="group relative p-6 rounded-3xl glass-panel border border-white/[0.08] hover:border-cyan-500/50 transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition" />
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-5 shadow-lg">
              <Globe className="w-6 h-6 group-hover:rotate-45 transition-transform duration-500" />
            </div>
            <h4 className="text-lg font-bold font-display text-white mb-2 group-hover:text-cyan-300 transition">
              3D Digital Earth Orbiter
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4 font-sans-lux">
              High-performance WebGL digital earth with dynamic 3D meteorological station columns and active event shockwaves.
            </p>
            <div className="flex items-center text-xs font-mono text-cyan-400 font-semibold gap-1">
              <span>Launch 3D Globe</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 2: Doppler Radar */}
          <div
            onClick={() => {
              soundFx.playSwitch();
              onNavigateToDeck('radar');
            }}
            className="group relative p-6 rounded-3xl glass-panel border border-white/[0.08] hover:border-emerald-500/50 transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition" />
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-5 shadow-lg">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-lg font-bold font-display text-white mb-2 group-hover:text-emerald-300 transition">
              Doppler Weather Radar
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4 font-sans-lux">
              Live RainViewer composite precipitation sweeps with interactive scrubbing across past loops and nowcast projections.
            </p>
            <div className="flex items-center text-xs font-mono text-emerald-400 font-semibold gap-1">
              <span>Launch Radar Player</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 3: Air Quality NAQI */}
          <div
            onClick={() => {
              soundFx.playSwitch();
              onNavigateToDeck('aqi');
            }}
            className="group relative p-6 rounded-3xl glass-panel border border-white/[0.08] hover:border-teal-500/50 transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition" />
            <div className="w-12 h-12 rounded-2xl bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400 mb-5 shadow-lg">
              <Wind className="w-6 h-6 group-hover:scale-110 transition" />
            </div>
            <h4 className="text-lg font-bold font-display text-white mb-2 group-hover:text-teal-300 transition">
              Air Quality & CPCB NAQI
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4 font-sans-lux">
              Automated Indian National AQI calculations across PM2.5, PM10, toxic trace gases, and official health advisories.
            </p>
            <div className="flex items-center text-xs font-mono text-teal-400 font-semibold gap-1">
              <span>Inspect NAQI Matrix</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 4: Seismic & Marine */}
          <div
            onClick={() => {
              soundFx.playSwitch();
              onNavigateToDeck('hazards');
            }}
            className="group relative p-6 rounded-3xl glass-panel border border-white/[0.08] hover:border-rose-500/50 transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition" />
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-5 shadow-lg">
              <Waves className="w-6 h-6 group-hover:scale-110 transition" />
            </div>
            <h4 className="text-lg font-bold font-display text-white mb-2 group-hover:text-rose-300 transition">
              Seismic & Coastal Hazards
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4 font-sans-lux">
              Real-time USGS tectonic fault monitoring along the Himalayan arc and Indian Ocean coastal swell wave heights.
            </p>
            <div className="flex items-center text-xs font-mono text-rose-400 font-semibold gap-1">
              <span>Explore Hazard Feeds</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      </section>

      {/* Citizen Crowdsourcing Feature Banner */}
      <section className="py-8 px-4 sm:px-6 lg:px-12 max-w-[1720px] mx-auto">
        <div className="p-8 sm:p-10 rounded-3xl glass-panel-glow border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-mono text-purple-400 uppercase tracking-wider font-semibold">
              DUAL-FACTOR CROWDSOURCING VERIFICATION
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold font-display text-white">
              Report Live Meteorological Phenomena
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans-lux">
              Submit micro-localized observations of cloudbursts, hail, or severe squalls. 
              The backend correlation engine automatically correlates your report against nearby automated surface stations.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => {
                soundFx.playSwitch();
                onOpenReportModal();
              }}
              className="px-6 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-sans-lux font-bold text-sm shadow-xl shadow-emerald-950/60 transition active:scale-95"
            >
              Submit Citizen Observation
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
