import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Observation, WeatherEventItem } from '../types/index.ts';
import { soundFx } from '../utils/soundEffects.ts';
import {
  Thermometer,
  CloudRain,
  Wind,
  Activity,
  Layers,
  Search,
  Compass,
  MapPin,
  ExternalLink,
  Droplets,
  Gauge,
  Sun,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface InteractiveIndiaMapProps {
  observations: Observation[];
  events: WeatherEventItem[];
  onSelectStation: (stationId: string) => void;
  selectedStationId?: string | null;
}

type LayerMetric = 'temp' | 'rain' | 'aqi' | 'wind';

export const InteractiveIndiaMap: React.FC<InteractiveIndiaMapProps> = ({
  observations,
  events,
  onSelectStation,
  selectedStationId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeMetric, setActiveMetric] = useState<LayerMetric>('temp');
  const [selectedStation, setSelectedStation] = useState<Observation | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeRegion, setActiveRegion] = useState<string>('all');

  // Sync selectedStation from selectedStationId prop
  useEffect(() => {
    if (selectedStationId) {
      const match = observations.find(o => o.location_id === selectedStationId);
      if (match) setSelectedStation(match);
    } else if (observations.length > 0 && !selectedStation) {
      // Default to Delhi or first major station
      const delhi = observations.find(o => o.location_id === 'delhi') || observations[0];
      setSelectedStation(delhi);
    }
  }, [selectedStationId, observations]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.5, 79.5],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      zoomControl: false,
    });

    // Premium Dark Cartography Layer (CartoDB Dark Matter with no labels + labels layer)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO | METEOR-IN GIS',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when observations, activeMetric or search changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    observations.forEach(station => {
      // Color according to metric
      let displayValue = `${station.temperature.toFixed(0)}°`;
      let badgeColor = '#38bdf8';
      let haloColor = 'rgba(56, 189, 248, 0.4)';

      if (activeMetric === 'temp') {
        const t = station.temperature;
        if (t < 15) { badgeColor = '#38bdf8'; haloColor = 'rgba(56, 189, 248, 0.5)'; }
        else if (t < 25) { badgeColor = '#00e599'; haloColor = 'rgba(0, 229, 153, 0.5)'; }
        else if (t < 33) { badgeColor = '#ffb800'; haloColor = 'rgba(255, 184, 0, 0.5)'; }
        else if (t < 38) { badgeColor = '#ff7b00'; haloColor = 'rgba(255, 123, 0, 0.5)'; }
        else { badgeColor = '#ff3366'; haloColor = 'rgba(255, 51, 102, 0.6)'; }
        displayValue = `${t.toFixed(0)}°`;
      } else if (activeMetric === 'rain') {
        const r = station.precipitation || 0;
        badgeColor = r > 0 ? '#00f0ff' : '#64748b';
        haloColor = r > 0 ? 'rgba(0, 240, 255, 0.6)' : 'rgba(100, 116, 139, 0.2)';
        displayValue = r > 0 ? `${r.toFixed(1)}m` : '0';
      } else if (activeMetric === 'wind') {
        const w = station.wind_speed || 0;
        badgeColor = w >= 25 ? '#ff3366' : w >= 15 ? '#a855f7' : '#94a3b8';
        haloColor = w >= 20 ? 'rgba(168, 85, 247, 0.5)' : 'rgba(148, 163, 184, 0.3)';
        displayValue = `${w}`;
      } else if (activeMetric === 'aqi') {
        const aqi = station.air_quality_aqi ?? Math.round(station.humidity * 1.5);
        if (aqi <= 50) { badgeColor = '#00e599'; haloColor = 'rgba(0, 229, 153, 0.5)'; }
        else if (aqi <= 100) { badgeColor = '#2dd4bf'; haloColor = 'rgba(45, 212, 191, 0.5)'; }
        else if (aqi <= 200) { badgeColor = '#ffb800'; haloColor = 'rgba(255, 184, 0, 0.5)'; }
        else if (aqi <= 300) { badgeColor = '#ff7b00'; haloColor = 'rgba(255, 123, 0, 0.5)'; }
        else { badgeColor = '#ff3366'; haloColor = 'rgba(255, 51, 102, 0.6)'; }
        displayValue = `${aqi}`;
      }

      const isSelected = selectedStation?.location_id === station.location_id;

      // Custom HTML Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-weather-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group transition-transform duration-200 ${
            isSelected ? 'scale-125 z-50' : 'hover:scale-115'
          }">
            <div class="absolute -inset-1.5 rounded-full blur-[4px] opacity-75 transition-opacity" style="background-color: ${haloColor};"></div>
            <div class="relative flex items-center justify-center px-2 py-0.5 rounded-full border shadow-xl backdrop-blur-md font-mono text-[11px] font-bold text-white transition-all ${
              isSelected
                ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-105'
                : 'border-white/20'
            }" style="background-color: rgba(10, 15, 28, 0.85); border-color: ${badgeColor};">
              <span class="w-1.5 h-1.5 rounded-full mr-1" style="background-color: ${badgeColor};"></span>
              <span>${displayValue}</span>
            </div>
            <div class="hidden group-hover:block absolute bottom-full mb-1 px-2 py-1 rounded-md bg-[#090e1b] border border-purple-500/40 text-[10px] font-mono text-white whitespace-nowrap shadow-2xl z-50 pointer-events-none">
              ${station.city} &bull; ${station.temperature.toFixed(1)}°C
            </div>
          </div>
        `,
        iconSize: [42, 24],
        iconAnchor: [21, 12],
      });

      const marker = L.marker([station.latitude, station.longitude], { icon: customIcon });

      marker.on('click', () => {
        soundFx.playClick();
        setSelectedStation(station);
        onSelectStation(station.location_id);
      });

      marker.addTo(layer);
    });
  }, [observations, activeMetric, selectedStation, onSelectStation]);

  // Handle Region Flying
  const flyToRegion = (region: string) => {
    soundFx.playSwitch();
    setActiveRegion(region);
    if (!mapInstanceRef.current) return;

    switch (region) {
      case 'all':
        mapInstanceRef.current.flyTo([22.5, 79.5], 5, { duration: 1.2 });
        break;
      case 'north':
        mapInstanceRef.current.flyTo([30.5, 77.0], 6.5, { duration: 1.2 });
        break;
      case 'south':
        mapInstanceRef.current.flyTo([13.5, 77.5], 6.2, { duration: 1.2 });
        break;
      case 'west':
        mapInstanceRef.current.flyTo([21.0, 72.5], 6.2, { duration: 1.2 });
        break;
      case 'east':
        mapInstanceRef.current.flyTo([24.0, 86.5], 6.2, { duration: 1.2 });
        break;
      case 'northeast':
        mapInstanceRef.current.flyTo([26.2, 92.5], 6.5, { duration: 1.2 });
        break;
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden glass-panel-glow border border-purple-500/30 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
      {/* Top Interactive Controls Toolbar */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-slate-950/70 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Branding & Region Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg">
              <MapPin className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide font-display uppercase">
                Interactive National Synoptic Map
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Real-time WMO automated observation network • 51 Surface Stations
              </p>
            </div>
          </div>

          {/* Regional Preset Tabs */}
          <div className="hidden lg:flex items-center space-x-1 p-1 rounded-xl bg-slate-900/80 border border-white/[0.08] text-xs font-mono">
            {[
              { id: 'all', label: 'All India' },
              { id: 'north', label: 'North & NCR' },
              { id: 'south', label: 'Peninsular South' },
              { id: 'west', label: 'Western Coast' },
              { id: 'east', label: 'Gangetic East' },
              { id: 'northeast', label: 'North-East' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => flyToRegion(r.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeRegion === r.id
                    ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Layer Metric Switcher */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-900/90 border border-white/[0.08] text-xs font-mono">
          <button
            onClick={() => { soundFx.playSwitch(); setActiveMetric('temp'); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'temp'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span>Temp</span>
          </button>

          <button
            onClick={() => { soundFx.playSwitch(); setActiveMetric('rain'); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'rain'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rain</span>
          </button>

          <button
            onClick={() => { soundFx.playSwitch(); setActiveMetric('aqi'); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'aqi'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>NAQI</span>
          </button>

          <button
            onClick={() => { soundFx.playSwitch(); setActiveMetric('wind'); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'wind'
                ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-purple-400" />
            <span>Wind</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="relative w-full h-[540px] sm:h-[620px] bg-[#05070d]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Selected Station Floating Capsule (Emotion Agency Luxury Glass Style) */}
        {selectedStation && (
          <div className="absolute top-4 left-4 z-20 w-80 sm:w-88 p-5 rounded-2xl glass-panel-glow border border-purple-500/30 text-white shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-top-3">
            {/* Capsule Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 block font-semibold">
                  STATION TELEMETRY CAPSULE
                </span>
                <h4 className="text-xl font-bold font-display tracking-tight text-white">
                  {selectedStation.city}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedStation.state} &bull; Elev: {selectedStation.elevation}m
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black font-display text-white block leading-none">
                  {selectedStation.temperature.toFixed(1)}°
                </span>
                <span className="text-[10px] text-purple-300 font-mono">
                  Feels {selectedStation.apparent_temperature ? `${selectedStation.apparent_temperature.toFixed(1)}°` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Condition & WMO readout */}
            <div className="my-3 py-2 px-3 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-purple-200">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>{selectedStation.weather_condition}</span>
              </div>
              <span className="text-[10px] font-mono text-purple-400">
                WMO {selectedStation.weather_code}
              </span>
            </div>

            {/* Matrix Metrics */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono my-3">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block">Humidity</span>
                <span className="text-sm font-bold text-cyan-300">{selectedStation.humidity}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block">Rain</span>
                <span className="text-sm font-bold text-blue-300">
                  {selectedStation.precipitation ? `${selectedStation.precipitation.toFixed(1)} mm` : '0 mm'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block">Wind</span>
                <span className="text-sm font-bold text-purple-300">{selectedStation.wind_speed} km/h</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] text-slate-500">
                Source: {selectedStation.source}
              </span>
              <button
                onClick={() => {
                  soundFx.playClick();
                  onSelectStation(selectedStation.location_id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-purple-950/50 transition-all active:scale-95 text-[11px]"
              >
                <span>Deep Telemetry</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Legend */}
        <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-white/[0.08] backdrop-blur-xl text-xs font-mono text-slate-400">
          <span className="text-[10px] uppercase font-bold text-slate-300">Scale:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" title="Cold (<15°C)" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" title="Pleasant (15-25°C)" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" title="Warm (25-33°C)" />
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" title="Hot (33-38°C)" />
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" title="Severe Heat (>38°C)" />
          </div>
          <span className="text-[10px] text-slate-400">Low &rarr; Severe</span>
        </div>
      </div>
    </div>
  );
};
