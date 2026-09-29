import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  Thermometer,
  CloudRain,
  Wind,
  Cloud,
  AlertTriangle,
  UserCheck,
  Eye,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { Observation, WeatherEventItem, CitizenReportItem } from '../types/index.ts';
import {
  formatISTTime,
  getTemperatureColor,
  getSeverityBadge,
  getVerificationBadge,
} from '../utils/formatters.ts';

interface WeatherMapProps {
  observations: Observation[];
  events: WeatherEventItem[];
  reports: CitizenReportItem[];
  onSelectStation: (stationId: string) => void;
  selectedStationId?: string | null;
  onMapClickCoordinates?: (lat: number, lon: number) => void;
  isPickingCoordinates?: boolean;
}

type MapLayerType = 'temperature' | 'rainfall' | 'wind' | 'clouds' | 'events' | 'reports';

export const WeatherMap: React.FC<WeatherMapProps> = ({
  observations,
  events,
  reports,
  onSelectStation,
  selectedStationId,
  onMapClickCoordinates,
  isPickingCoordinates = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const eventsLayerRef = useRef<L.LayerGroup | null>(null);
  const reportsLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('temperature');

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Base coordinates centered over India
    const map = L.map(mapContainerRef.current, {
      center: [22.8, 80.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 14,
      zoomControl: false,
    });

    // Dark GIS meteorological tile layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO | METEOR-IN GIS',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    eventsLayerRef.current = L.layerGroup().addTo(map);
    reportsLayerRef.current = L.layerGroup().addTo(map);

    // Coordinate picker handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickCoordinates) {
        onMapClickCoordinates(
          Math.round(e.latlng.lat * 10000) / 10000,
          Math.round(e.latlng.lng * 10000) / 10000
        );
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when observations, active layer, or reports change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !eventsLayerRef.current || !reportsLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    eventsLayerRef.current.clearLayers();
    reportsLayerRef.current.clearLayers();

    // 1. Station Observation Markers
    observations.forEach(obs => {
      const isSelected = selectedStationId === obs.location_id;
      const hasActiveEvent = events.some(e => e.location_id === obs.location_id);

      let markerContent = '';
      let markerBg = '#0284c7';

      if (activeLayer === 'temperature') {
        markerBg = getTemperatureColor(obs.temperature);
        markerContent = `${Math.round(obs.temperature)}°`;
      } else if (activeLayer === 'rainfall') {
        const rain = (obs.precipitation || 0) + (obs.rain || 0);
        markerBg = rain > 15 ? '#3b82f6' : (rain > 0 ? '#0ea5e9' : '#334155');
        markerContent = rain > 0 ? `${rain.toFixed(1)}` : '0';
      } else if (activeLayer === 'wind') {
        const wind = obs.wind_speed || 0;
        markerBg = wind > 40 ? '#f43f5e' : (wind > 20 ? '#06b6d4' : '#475569');
        markerContent = `${Math.round(wind)}`;
      } else if (activeLayer === 'clouds') {
        const clouds = obs.cloud_cover || 0;
        markerBg = clouds > 75 ? '#64748b' : (clouds > 30 ? '#475569' : '#0284c7');
        markerContent = `${clouds}%`;
      } else {
        markerBg = getTemperatureColor(obs.temperature);
        markerContent = `${Math.round(obs.temperature)}°`;
      }

      const customIcon = L.divIcon({
        className: 'custom-weather-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            ${hasActiveEvent ? '<div class="absolute -inset-1.5 rounded-full bg-amber-500/40 animate-ping"></div>' : ''}
            <div style="background-color: ${markerBg}; border-color: ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)'}" 
                 class="relative z-10 px-1.5 py-0.5 rounded shadow-lg text-[11px] font-mono font-bold text-white border flex items-center justify-center min-w-[28px] h-[22px] transition transform group-hover:scale-110 ${isSelected ? 'scale-125 ring-2 ring-white' : ''}">
              ${markerContent}
            </div>
            <div class="absolute top-[22px] left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1 rounded pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition shadow z-20">
              ${obs.city}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([obs.latitude, obs.longitude], { icon: customIcon });

      // Build popup strictly matching prompt requirements
      const popupHtml = `
        <div class="font-sans text-slate-100 p-2 min-w-[240px]">
          <div class="border-b border-slate-700 pb-2 mb-2 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold uppercase tracking-wide text-white">${obs.city.toUpperCase()}</h3>
              <p class="text-[11px] text-slate-400 font-mono">${obs.state} &bull; ${obs.region}</p>
            </div>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
              ${obs.elevation}m ASL
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs font-mono my-2.5">
            <div class="bg-slate-800/80 p-1.5 rounded border border-slate-700/60">
              <span class="text-slate-400 text-[10px] block">TEMPERATURE</span>
              <span class="text-base font-bold text-white">${obs.temperature.toFixed(1)}°C</span>
              ${obs.apparent_temperature ? `<span class="text-[10px] text-slate-400 block">Feels: ${obs.apparent_temperature.toFixed(1)}°C</span>` : ''}
            </div>

            <div class="bg-slate-800/80 p-1.5 rounded border border-slate-700/60">
              <span class="text-slate-400 text-[10px] block">HUMIDITY</span>
              <span class="text-base font-bold text-white">${obs.humidity}%</span>
              <span class="text-[10px] text-slate-400 block">RH Saturated</span>
            </div>

            <div class="bg-slate-800/80 p-1.5 rounded border border-slate-700/60">
              <span class="text-slate-400 text-[10px] block">RAIN</span>
              <span class="text-base font-bold text-sky-400">${(obs.precipitation || obs.rain || 0).toFixed(1)} mm</span>
              <span class="text-[10px] text-slate-400 block">Rate / hr</span>
            </div>

            <div class="bg-slate-800/80 p-1.5 rounded border border-slate-700/60">
              <span class="text-slate-400 text-[10px] block">WIND</span>
              <span class="text-base font-bold text-slate-200">${Math.round(obs.wind_speed)} km/h</span>
              <span class="text-[10px] text-slate-400 block">Dir: ${Math.round(obs.wind_direction)}°</span>
            </div>
          </div>

          <div class="text-[11px] font-mono space-y-1 border-t border-slate-700/60 pt-2 text-slate-300">
            <div class="flex justify-between">
              <span class="text-slate-400">PRESSURE:</span>
              <span class="text-slate-200 font-semibold">${obs.pressure ? `${obs.pressure.toFixed(1)} hPa` : 'N/A'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">CONDITION:</span>
              <span class="text-sky-300 font-semibold">${obs.weather_condition}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">DATA SOURCE:</span>
              <span class="text-emerald-400 font-semibold">${obs.source}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">UPDATED:</span>
              <span class="text-slate-200 font-semibold">${formatISTTime(obs.observed_at)}</span>
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-700">
            <button onclick="window.__selectStation('${obs.location_id}')" class="w-full py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-mono font-medium transition text-center">
              View Hourly & 7-Day Forecast &rarr;
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'meteor-popup',
        maxWidth: 320,
      });

      marker.on('click', () => {
        onSelectStation(obs.location_id);
      });

      markersLayerRef.current?.addLayer(marker);
    });

    // 2. Weather Event Visual Overlays (Circles + Radar Indicators)
    if (activeLayer === 'events' || activeLayer === 'rainfall' || activeLayer === 'temperature') {
      events.forEach(ev => {
        const circleColor = ev.severity === 'EXTREME' ? '#c026d3' : (ev.severity === 'SEVERE' ? '#f43f5e' : '#f59e0b');
        const circle = L.circle([ev.latitude, ev.longitude], {
          radius: (ev.affected_radius_km || 25) * 1000,
          color: circleColor,
          weight: 1.5,
          fillColor: circleColor,
          fillOpacity: 0.12,
          dashArray: '4, 4',
        });

        circle.bindTooltip(`
          <div class="text-xs font-mono">
            <strong>SYSTEM DETECTION: ${ev.event_type}</strong><br/>
            Severity: ${ev.severity} &bull; Conf: ${Math.round(ev.confidence * 100)}%
          </div>
        `);

        eventsLayerRef.current?.addLayer(circle);
      });
    }

    // 3. Citizen Report Markers
    if (activeLayer === 'reports') {
      reports.forEach(rep => {
        const isVerified = rep.status === 'VERIFIED';
        const isUnderReview = rep.status === 'UNDER REVIEW';
        const isContradicted = rep.status === 'CONTRADICTED';
        const isDuplicate = rep.status === 'DUPLICATE';

        const repColor = isVerified ? '#10b981' : (isUnderReview ? '#f59e0b' : (isDuplicate ? '#a855f7' : '#ef4444'));

        const reportIcon = L.divIcon({
          className: 'citizen-report-marker',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer group">
              <div style="background-color: ${repColor}" class="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white transform transition group-hover:scale-125">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([rep.latitude, rep.longitude], { icon: reportIcon });

        const repPopup = `
          <div class="p-2 font-mono text-slate-100 text-xs">
            <div class="flex items-center justify-between border-b border-slate-700 pb-1 mb-2">
              <span class="font-bold text-white">CITIZEN REPORT #${rep.id}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] ${
                isVerified ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
              }">${rep.status}</span>
            </div>
            <div class="font-semibold text-sky-300 mb-1">${rep.event_type}</div>
            <p class="text-slate-300 text-[11px] mb-2 italic">"${rep.description}"</p>
            <div class="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-700/60 pt-1">
              <div>Location: <span class="text-slate-200">${rep.location_name}</span></div>
              <div>Reporter: <span class="text-slate-200">${rep.reporter_name}</span></div>
              <div>Reported At: <span class="text-slate-200">${formatISTTime(rep.observed_at)}</span></div>
              ${rep.distance_km ? `<div>Station Proximity: <span class="text-sky-300">${rep.distance_km} km (Δt: ${rep.time_diff_minutes}m)</span></div>` : ''}
              ${rep.verification_rationale ? `<div class="mt-1 text-slate-300 text-[10px] bg-slate-800 p-1 rounded">${rep.verification_rationale}</div>` : ''}
            </div>
          </div>
        `;

        marker.bindPopup(repPopup, { maxWidth: 300 });
        reportsLayerRef.current?.addLayer(marker);
      });
    }

    // Attach global click handler for popup buttons
    (window as any).__selectStation = (stationId: string) => {
      onSelectStation(stationId);
    };
  }, [observations, events, reports, activeLayer, selectedStationId]);

  return (
    <div className="relative bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[580px] lg:h-[640px]">
      {/* Top Map Layer Selector Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-1.5 bg-[#0b1324]/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 shadow-lg">
        <button
          onClick={() => setActiveLayer('temperature')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
            activeLayer === 'temperature'
              ? 'bg-sky-600 text-white shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          <span>Temperature</span>
        </button>

        <button
          onClick={() => setActiveLayer('rainfall')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
            activeLayer === 'rainfall'
              ? 'bg-sky-600 text-white shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <CloudRain className="w-3.5 h-3.5 text-sky-400" />
          <span>Rainfall</span>
        </button>

        <button
          onClick={() => setActiveLayer('wind')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
            activeLayer === 'wind'
              ? 'bg-sky-600 text-white shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Wind className="w-3.5 h-3.5 text-teal-400" />
          <span>Wind</span>
        </button>

        <button
          onClick={() => setActiveLayer('clouds')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
            activeLayer === 'clouds'
              ? 'bg-sky-600 text-white shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Cloud className="w-3.5 h-3.5 text-slate-300" />
          <span>Clouds</span>
        </button>

        <button
          onClick={() => setActiveLayer('events')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
            activeLayer === 'events'
              ? 'bg-amber-600 text-white shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Events ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveLayer('reports')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
            activeLayer === 'reports'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Citizen Reports ({reports.length})</span>
        </button>
      </div>

      {/* Coordinate Picking Hint if Active */}
      {isPickingCoordinates && (
        <div className="absolute top-16 left-3 z-[1000] bg-emerald-950/90 border border-emerald-600/80 text-emerald-200 px-3 py-1.5 rounded text-xs font-mono shadow-lg animate-pulse">
          Click anywhere on India map to select latitude and longitude
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full flex-1 z-0 bg-[#0b1320]" />

      {/* Dynamic Visual Legend (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-[#0f172a]/95 backdrop-blur-md p-2.5 rounded-lg border border-slate-700/80 shadow-xl max-w-[280px] font-mono text-[11px]">
        {activeLayer === 'temperature' && (
          <div>
            <div className="text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>TEMPERATURE SCALE</span>
              <span className="text-[10px] text-slate-400">°C</span>
            </div>
            <div className="h-2.5 w-full rounded bg-gradient-to-r from-sky-400 via-emerald-400 via-amber-400 via-orange-500 to-rose-600 mb-1"></div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>&lt;10°</span>
              <span>20°</span>
              <span>28°</span>
              <span>35°</span>
              <span>42°+</span>
            </div>
          </div>
        )}

        {activeLayer === 'rainfall' && (
          <div>
            <div className="text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>PRECIPITATION RATE</span>
              <span className="text-[10px] text-slate-400">mm/h</span>
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-300">
              <span className="w-3 h-3 rounded bg-slate-700 inline-block"></span>
              <span>0 (None)</span>
              <span className="w-3 h-3 rounded bg-sky-400 inline-block ml-2"></span>
              <span>1-15 (Light)</span>
              <span className="w-3 h-3 rounded bg-blue-600 inline-block ml-2"></span>
              <span>15+ (Heavy)</span>
            </div>
          </div>
        )}

        {activeLayer === 'wind' && (
          <div>
            <div className="text-slate-300 font-semibold mb-1">WIND VELOCITY (km/h)</div>
            <div className="flex items-center space-x-2 text-[10px] text-slate-300">
              <span className="w-3 h-3 rounded bg-slate-600"></span> <span>&lt;15 Calm</span>
              <span className="w-3 h-3 rounded bg-cyan-500"></span> <span>15-35 Breeze</span>
              <span className="w-3 h-3 rounded bg-rose-500"></span> <span>40+ Gale</span>
            </div>
          </div>
        )}

        {activeLayer === 'events' && (
          <div>
            <div className="text-slate-300 font-semibold mb-1">SYSTEM DETECTIONS</div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Moderate</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Severe</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <span>Extreme</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 border border-dashed border-amber-400"></span>
                <span>Radius (km)</span>
              </div>
            </div>
          </div>
        )}

        {activeLayer === 'reports' && (
          <div>
            <div className="text-slate-300 font-semibold mb-1">CITIZEN GROUND-TRUTH</div>
            <div className="space-y-0.5 text-[10px]">
              <div className="flex items-center space-x-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Verified / Correlated</span>
              </div>
              <div className="flex items-center space-x-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Under Review</span>
              </div>
              <div className="flex items-center space-x-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Contradicted by Station</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
