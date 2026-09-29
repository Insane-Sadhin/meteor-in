import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Thermometer,
  CloudRain,
  Wind,
  Compass,
  Gauge,
  Calendar,
  Clock,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchStationDetail } from '../utils/api.ts';
import { formatISTTime, formatISTDateTime, getTemperatureColor } from '../utils/formatters.ts';

interface StationDetailModalProps {
  stationId: string | null;
  onClose: () => void;
}

export const StationDetailModal: React.FC<StationDetailModalProps> = ({ stationId, onClose }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stationId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchStationDetail(stationId)
      .then(res => {
        setData(res);
      })
      .catch(err => {
        setError(err.message || 'Failed to load station telemetry');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [stationId]);

  if (!stationId) return null;

  const station = data?.station;
  const obs = data?.latestObservation;
  const hourly = data?.hourly || [];
  const forecast = data?.forecast || [];

  // Format hourly data for Recharts (next 24 hours)
  const hourlyChartData = hourly.slice(0, 24).map((h: any) => ({
    time: h.time.split('T')[1] || h.time,
    temp: Math.round(h.temperature * 10) / 10,
    rain: Math.round((h.precipitation || h.rain || 0) * 10) / 10,
    wind: Math.round(h.windSpeed),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#111c30] border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1728]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  {station ? `${station.city} METEOROLOGICAL STATION` : 'Station Loading...'}
                </h3>
                {obs?.is_simulated && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    DEMO / SIMULATED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {station ? `${station.district}, ${station.state} &bull; ${station.elevation}m ASL &bull; ${station.latitude.toFixed(4)}°N, ${station.longitude.toFixed(4)}°E` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[85vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-2" />
              <span>Fetching live hourly & forecast telemetry from Open-Meteo...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/80 border border-rose-800 rounded text-rose-300">
              {error}
            </div>
          ) : (
            <>
              {/* Current Metrics Card */}
              {obs && (
                <div className="bg-[#0b1324] border border-slate-800 p-3.5 rounded-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                      LATEST OBSERVATION TELEMETRY
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Observed: <strong className="text-slate-200">{formatISTDateTime(obs.observed_at)}</strong> &bull; Source: <strong className="text-emerald-400">{obs.source}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#142036] p-2.5 rounded border border-slate-700/60">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] mb-1">
                        <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                        <span>TEMPERATURE</span>
                      </div>
                      <div className="text-xl font-bold" style={{ color: getTemperatureColor(obs.temperature) }}>
                        {obs.temperature.toFixed(1)}°C
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Feels like {obs.apparent_temperature?.toFixed(1) || obs.temperature.toFixed(1)}°C
                      </div>
                    </div>

                    <div className="bg-[#142036] p-2.5 rounded border border-slate-700/60">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] mb-1">
                        <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                        <span>PRECIPITATION</span>
                      </div>
                      <div className="text-xl font-bold text-sky-400">
                        {(obs.precipitation || obs.rain || 0).toFixed(1)} mm
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Humidity: {obs.humidity}%
                      </div>
                    </div>

                    <div className="bg-[#142036] p-2.5 rounded border border-slate-700/60">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] mb-1">
                        <Wind className="w-3.5 h-3.5 text-teal-400" />
                        <span>SURFACE WIND</span>
                      </div>
                      <div className="text-xl font-bold text-slate-200">
                        {Math.round(obs.wind_speed)} km/h
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Direction: {Math.round(obs.wind_direction)}° {obs.wind_gusts ? `&bull; Gusts: ${Math.round(obs.wind_gusts)}` : ''}
                      </div>
                    </div>

                    <div className="bg-[#142036] p-2.5 rounded border border-slate-700/60">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] mb-1">
                        <Gauge className="w-3.5 h-3.5 text-purple-400" />
                        <span>PRESSURE & SKY</span>
                      </div>
                      <div className="text-xl font-bold text-slate-200">
                        {obs.pressure ? `${obs.pressure.toFixed(0)} hPa` : '1013 hPa'}
                      </div>
                      <div className="text-[10px] text-sky-300 truncate">
                        {obs.weather_condition} ({obs.cloud_cover}% clouds)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Next 24-Hour Forecast Trend Chart */}
              {hourlyChartData.length > 0 && (
                <div className="bg-[#0b1324] border border-slate-800 p-3.5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>NEXT 24-HOUR FORECAST EVOLUTION (Open-Meteo)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Time (Hours IST)</span>
                  </div>

                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} domain={['dataMin - 3', 'dataMax + 3']} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace' }}
                          formatter={(val: any, name: any) => [`${val} ${name === 'temp' ? '°C' : 'mm'}`, name === 'temp' ? 'Temperature' : 'Rain']}
                        />
                        <Area type="monotone" dataKey="temp" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#tempGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 7-Day Daily Forecast Table */}
              {forecast.length > 0 && (
                <div className="bg-[#0b1324] border border-slate-800 p-3.5 rounded-lg">
                  <div className="text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-2 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" />
                    <span>7-DAY SYNOPTIC METEOROLOGICAL FORECAST</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-1.5 px-2">DATE</th>
                          <th className="py-1.5 px-2">CONDITION</th>
                          <th className="py-1.5 px-2">TEMP (MAX / MIN)</th>
                          <th className="py-1.5 px-2">RAIN PROB</th>
                          <th className="py-1.5 px-2">WIND MAX</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {forecast.map((f: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-1.5 px-2 font-bold text-white">{f.date}</td>
                            <td className="py-1.5 px-2 text-sky-300">{f.weatherCondition}</td>
                            <td className="py-1.5 px-2 font-mono">
                              <span className="text-orange-400 font-semibold">{f.temperatureMax.toFixed(1)}°</span> / <span className="text-sky-400">{f.temperatureMin.toFixed(1)}°</span>
                            </td>
                            <td className="py-1.5 px-2">
                              {f.precipitationProbabilityMax > 0 ? (
                                <span className="text-sky-400 font-semibold">{f.precipitationProbabilityMax}% ({f.precipitationSum.toFixed(1)}mm)</span>
                              ) : (
                                <span className="text-slate-500">0%</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-slate-400">
                              {Math.round(f.windSpeedMax)} km/h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
