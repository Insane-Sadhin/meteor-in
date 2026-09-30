import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Observation, WeatherEventItem } from '../types/index.ts';
import { soundFx } from '../utils/soundEffects.ts';
import { searchIndianCities, fetchLiveCityWeather, GeocodedCityResult } from '../utils/citySearch.ts';
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
  Loader2,
  CheckCircle2,
  X,
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
  const [searchResults, setSearchResults] = useState<GeocodedCityResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [extraObservations, setExtraObservations] = useState<Observation[]>([]);

  // Combined stations: base observations + dynamically searched cities
  const allStations = React.useMemo(() => {
    const map = new Map<string, Observation>();
    observations.forEach(o => map.set(o.location_id, o));
    extraObservations.forEach(o => map.set(o.location_id, o));
    return Array.from(map.values());
  }, [observations, extraObservations]);

  // Sync selectedStation from selectedStationId prop
  useEffect(() => {
    if (selectedStationId) {
      const match = allStations.find(o => o.location_id === selectedStationId);
      if (match) {
        setSelectedStation(match);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([match.latitude, match.longitude], 8, { duration: 1.2 });
        }
      }
    } else if (allStations.length > 0 && !selectedStation) {
      const delhi = allStations.find(o => o.location_id === 'delhi') || allStations[0];
      setSelectedStation(delhi);
    }
  }, [selectedStationId, allStations]);

  // Debounced live city search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchIndianCities(searchQuery);
        setSearchResults(results);
        setIsSearchOpen(true);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

    // Premium Dark Cartography Layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO | METEOR-IN GIS',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Invalidate map size after DOM mount
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when stations, activeMetric or selectedStation changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    allStations.forEach(station => {
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
        const aqi = station.air_quality_aqi ?? (station.pm2_5 ? Math.round(station.pm2_5 * 2.5) : 125);
        if (aqi <= 50) { badgeColor = '#00e599'; haloColor = 'rgba(0, 229, 153, 0.5)'; }
        else if (aqi <= 100) { badgeColor = '#2dd4bf'; haloColor = 'rgba(45, 212, 191, 0.5)'; }
        else if (aqi <= 200) { badgeColor = '#ffb800'; haloColor = 'rgba(255, 184, 0, 0.5)'; }
        else if (aqi <= 300) { badgeColor = '#ff7b00'; haloColor = 'rgba(255, 123, 0, 0.5)'; }
        else { badgeColor = '#ff3366'; haloColor = 'rgba(255, 51, 102, 0.6)'; }
        displayValue = `${aqi}`;
      }

      const isSelected = selectedStation?.location_id === station.location_id;

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
            }" style="background-color: rgba(8, 12, 22, 0.9); border-color: ${badgeColor};">
              <span class="w-1.5 h-1.5 rounded-full mr-1" style="background-color: ${badgeColor};"></span>
              <span>${displayValue}</span>
            </div>
            <div class="hidden group-hover:block absolute bottom-full mb-1 px-2.5 py-1 rounded-lg bg-[#070b14] border border-purple-500/40 text-[11px] font-mono text-white whitespace-nowrap shadow-2xl z-50 pointer-events-none">
              <strong class="text-purple-300">${station.city}</strong> &bull; ${station.temperature.toFixed(1)}°C &bull; ${station.weather_condition}
            </div>
          </div>
        `,
        iconSize: [44, 24],
        iconAnchor: [22, 12],
      });

      const marker = L.marker([station.latitude, station.longitude], { icon: customIcon });

      marker.on('click', () => {
        soundFx.playClick();
        setSelectedStation(station);
      });

      marker.addTo(layer);
    });
  }, [allStations, activeMetric, selectedStation, onSelectStation]);

  // Handle Select from City Search
  const handleSelectSearchedCity = async (city: GeocodedCityResult) => {
    soundFx.playClick();
    setIsSearchOpen(false);
    setSearchQuery(city.name);

    try {
      // Check if already in allStations
      let obs = allStations.find(s => s.location_id === city.id || s.city.toLowerCase() === city.name.toLowerCase());
      if (!obs) {
        obs = await fetchLiveCityWeather(city);
        setExtraObservations(prev => [obs!, ...prev]);
      }

      setSelectedStation(obs);

      // Smoothly fly map to target city
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([city.latitude, city.longitude], 8, { duration: 1.2 });
      }
    } catch (err) {
      console.error('Failed to load searched city weather', err);
    }
  };

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
      <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-slate-950/75 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Branding & City Search Bar */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg">
              <MapPin className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide font-display uppercase">
                Interactive National Synoptic Map
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {allStations.length} Verified Surface Stations Active
              </p>
            </div>
          </div>

          {/* Live Indian City Search Input */}
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setIsSearchOpen(true); }}
                placeholder="Search any Indian city..."
                className="w-full pl-8 pr-7 py-1.5 rounded-full bg-slate-900/90 border border-purple-500/30 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition"
              />
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" />
              ) : searchQuery ? (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Autocomplete Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 z-50 rounded-2xl bg-[#090d18] border border-purple-500/40 shadow-2xl overflow-hidden backdrop-blur-2xl">
                <div className="p-2 border-b border-white/[0.06] text-[10px] font-mono text-purple-300 uppercase tracking-wider font-semibold">
                  Matching Indian Locations
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {searchResults.map((city, idx) => (
                    <button
                      key={city.id || idx}
                      onClick={() => handleSelectSearchedCity(city)}
                      className="w-full p-2.5 text-left hover:bg-purple-950/40 border-b border-white/[0.04] last:border-0 flex items-center justify-between text-xs font-mono transition"
                    >
                      <div>
                        <span className="font-bold text-white block">{city.name}</span>
                        <span className="text-[10px] text-slate-400">{city.admin1} &bull; Lat {city.latitude.toFixed(2)}°N</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Inspect
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Layer Metric Switcher */}
        <div className="flex items-center space-x-1.5 p-1 rounded-full bg-slate-900/90 border border-white/[0.08] text-xs font-mono">
          <button
            onClick={() => { soundFx.playSwitch(); setActiveMetric('temp'); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all ${
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
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all ${
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
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all ${
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
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all ${
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
          <div className="absolute top-4 left-4 z-20 w-80 sm:w-92 p-5 rounded-3xl glass-panel-glow border border-purple-500/40 text-white shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-top-3">
            {/* Capsule Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 block font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>VERIFIED LIVE TELEMETRY</span>
                </span>
                <h4 className="text-xl font-bold font-display tracking-tight text-white mt-0.5">
                  {selectedStation.city}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedStation.state} &bull; Elev: {selectedStation.elevation}m
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black font-display text-white block leading-none">
                  {selectedStation.temperature.toFixed(1)}°C
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
              <span className="text-[10px] font-mono text-purple-300 font-semibold px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/30">
                {selectedStation.source}
              </span>
            </div>

            {/* Matrix Metrics */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono my-3">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block">Humidity</span>
                <span className="text-sm font-bold text-cyan-300">{selectedStation.humidity}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block">Rainfall</span>
                <span className="text-sm font-bold text-blue-300">
                  {selectedStation.precipitation ? `${selectedStation.precipitation.toFixed(1)} mm` : '0 mm'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block">Wind Gale</span>
                <span className="text-sm font-bold text-purple-300">{selectedStation.wind_speed} km/h</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] text-slate-500">
                Lat {selectedStation.latitude.toFixed(2)}°, Lon {selectedStation.longitude.toFixed(2)}°
              </span>
              <button
                onClick={() => {
                  soundFx.playClick();
                  onSelectStation(selectedStation.location_id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-purple-950/50 transition-all active:scale-95 text-[11px]"
              >
                <span>Full Telemetry</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Regional Quick Tabs on Map */}
        <div className="absolute top-4 right-4 z-10 hidden md:flex items-center space-x-1 p-1 rounded-full bg-slate-950/90 border border-white/[0.08] backdrop-blur-xl text-xs font-mono">
          {[
            { id: 'all', label: 'All India' },
            { id: 'north', label: 'North' },
            { id: 'south', label: 'South' },
            { id: 'west', label: 'West' },
            { id: 'east', label: 'East' },
            { id: 'northeast', label: 'NE' },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => flyToRegion(r.id)}
              className={`px-2.5 py-1 rounded-full transition-all ${
                activeRegion === r.id
                  ? 'bg-purple-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
