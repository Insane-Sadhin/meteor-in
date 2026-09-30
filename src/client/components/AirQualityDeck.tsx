import React, { useState, useEffect } from 'react';
import { CityAirQuality } from '../types/index.ts';
import { fetchAirQuality } from '../utils/api.ts';
import { soundFx } from '../utils/soundEffects.ts';
import {
  Wind,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Search,
  RefreshCw,
  Sun,
  Activity,
  HeartPulse,
  Info,
} from 'lucide-react';

export const AirQualityDeck: React.FC = () => {
  const [aqiList, setAqiList] = useState<CityAirQuality[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<CityAirQuality | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'highest' | 'lowest' | 'city'>('highest');

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchAirQuality();
    setAqiList(data);
    if (data.length > 0 && !selectedCity) {
      setSelectedCity(data[0]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCategoryColor = (cat: CityAirQuality['aqiCategory']) => {
    switch (cat) {
      case 'Good':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
      case 'Satisfactory':
        return 'text-teal-400 bg-teal-950/60 border-teal-500/40';
      case 'Moderate':
        return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
      case 'Poor':
        return 'text-orange-400 bg-orange-950/60 border-orange-500/40';
      case 'Very Poor':
        return 'text-rose-400 bg-rose-950/60 border-rose-500/40';
      case 'Severe':
        return 'text-purple-300 bg-purple-950/70 border-purple-500/50';
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  const getHealthAdvisory = (cat: CityAirQuality['aqiCategory']) => {
    switch (cat) {
      case 'Good':
        return 'Minimal health impact. Air quality is ideal for all outdoor activities.';
      case 'Satisfactory':
        return 'Minor breathing discomfort may occur for sensitive individuals.';
      case 'Moderate':
        return 'May cause breathing discomfort to children, elderly, and people with lung/heart disease.';
      case 'Poor':
        return 'Breathing discomfort to most people on prolonged exposure. Limit prolonged exertion.';
      case 'Very Poor':
        return 'Respiratory illness on prolonged exposure. Significant risk for cardiopulmonary patients.';
      case 'Severe':
        return 'Affects healthy people and seriously impacts those with existing diseases. Stay indoors.';
      default:
        return 'Advisory pending sensor confirmation.';
    }
  };

  // Filter & sort
  const filteredList = aqiList
    .filter(
      item =>
        item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.state.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'highest') return b.indianAqi - a.indianAqi;
      if (sortBy === 'lowest') return a.indianAqi - b.indianAqi;
      return a.city.localeCompare(b.city);
    });

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
      {/* Deck Header */}
      <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/70 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-md">
            <Wind className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide font-mono uppercase">
                National Air Quality & NAQI Intelligence
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                CPCB Standards &bull; Free Open-Meteo
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live atmospheric aerosols, PM2.5/PM10 concentrations and toxic trace gases
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            onClick={() => { soundFx.playClick(); loadData(); }}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Fetching...' : 'Refresh AQI'}</span>
          </button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Selected City Featured Gauge & Pollutants */}
        <div className="lg:col-span-5 space-y-4">
          {selectedCity ? (
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider block">
                    Target Station Telemetry
                  </span>
                  <h4 className="text-xl font-bold text-white tracking-wide">{selectedCity.city}</h4>
                  <p className="text-xs text-slate-400">{selectedCity.state} &bull; India</p>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold tracking-wide flex items-center gap-1.5 ${getCategoryColor(
                    selectedCity.aqiCategory
                  )}`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{selectedCity.aqiCategory.toUpperCase()}</span>
                </div>
              </div>

              {/* Large AQI Gauge Hero Box */}
              <div className="relative p-5 rounded-2xl bg-[#040b17] border border-cyan-500/20 text-center overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-cyan-500/10 blur-2xl" />
                <span className="text-xs font-mono text-slate-400 uppercase block">
                  Indian National AQI (CPCB)
                </span>
                <div className="text-5xl font-black text-white font-mono my-2 tracking-tight">
                  {selectedCity.indianAqi}
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden my-2 flex">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, (selectedCity.indianAqi / 500) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>0 (Good)</span>
                  <span>100</span>
                  <span>200</span>
                  <span>300</span>
                  <span>400</span>
                  <span>500+ (Severe)</span>
                </div>
              </div>

              {/* Health Advisory */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex items-start gap-2.5">
                <HeartPulse className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200 block">Health Advisory</span>
                  <span className="text-slate-400">{getHealthAdvisory(selectedCity.aqiCategory)}</span>
                </div>
              </div>

              {/* Pollutants Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">PM2.5</span>
                  <span className="text-sm font-bold text-amber-300">{selectedCity.pm2_5}</span>
                  <span className="text-[9px] text-slate-500 block">µg/m³</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">PM10</span>
                  <span className="text-sm font-bold text-teal-300">{selectedCity.pm10}</span>
                  <span className="text-[9px] text-slate-500 block">µg/m³</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">NO₂</span>
                  <span className="text-sm font-bold text-cyan-300">{selectedCity.nitrogenDioxide}</span>
                  <span className="text-[9px] text-slate-500 block">µg/m³</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">SO₂</span>
                  <span className="text-sm font-bold text-purple-300">{selectedCity.sulphurDioxide}</span>
                  <span className="text-[9px] text-slate-500 block">µg/m³</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">CO</span>
                  <span className="text-sm font-bold text-slate-200">{selectedCity.carbonMonoxide}</span>
                  <span className="text-[9px] text-slate-500 block">µg/m³</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Ozone (O₃)</span>
                  <span className="text-sm font-bold text-sky-300">{selectedCity.ozone}</span>
                  <span className="text-[9px] text-slate-500 block">µg/m³</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Dust</span>
                  <span className="text-sm font-bold text-orange-300">{selectedCity.dust}</span>
                  <span className="text-[9px] text-slate-500 block">µg/m³</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">UV Index</span>
                  <span className="text-sm font-bold text-yellow-300">{selectedCity.uvIndex}</span>
                  <span className="text-[9px] text-slate-500 block">Index</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-500 font-mono text-xs">
              Select a city to inspect comprehensive aerosol telemetry.
            </div>
          )}
        </div>

        {/* Right Column: National Cities List with Filters */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search city or state..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500/60 transition"
              />
            </div>

            {/* Sort Switch */}
            <div className="flex items-center space-x-1 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => { soundFx.playClick(); setSortBy('highest'); }}
                className={`px-2 py-1 rounded transition ${
                  sortBy === 'highest' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Severe First
              </button>
              <button
                onClick={() => { soundFx.playClick(); setSortBy('lowest'); }}
                className={`px-2 py-1 rounded transition ${
                  sortBy === 'lowest' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cleanest First
              </button>
            </div>
          </div>

          {/* City Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredList.map(item => {
              const isSelected = selectedCity?.locationId === item.locationId;
              return (
                <button
                  key={item.locationId}
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedCity(item);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-teal-950/40 border-teal-500/60 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white tracking-wide">{item.city}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">{item.state}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black font-mono text-white leading-none">
                        {item.indianAqi}
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">NAQI</span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${getCategoryColor(
                        item.aqiCategory
                      )}`}
                    >
                      {item.aqiCategory}
                    </span>
                    <span className="text-slate-400">PM2.5: <strong className="text-slate-200">{item.pm2_5}</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
