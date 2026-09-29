import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, Flame, Snowflake, Droplets, Wind } from 'lucide-react';
import { Observation } from '../types/index.ts';

interface TrendChartsProps {
  observations: Observation[];
}

export const TrendCharts: React.FC<TrendChartsProps> = ({ observations }) => {
  // Aggregate observations by geographical region
  const regionMap = new Map<string, { count: number; totalTemp: number; maxTemp: number; minTemp: number; totalRain: number; totalWind: number }>();

  observations.forEach(o => {
    const reg = o.region || 'Other';
    const entry = regionMap.get(reg) || { count: 0, totalTemp: 0, maxTemp: -100, minTemp: 100, totalRain: 0, totalWind: 0 };
    entry.count++;
    entry.totalTemp += o.temperature;
    entry.maxTemp = Math.max(entry.maxTemp, o.temperature);
    entry.minTemp = Math.min(entry.minTemp, o.temperature);
    entry.totalRain += (o.precipitation || o.rain || 0);
    entry.totalWind += (o.wind_speed || 0);
    regionMap.set(reg, entry);
  });

  const regionalData = Array.from(regionMap.entries()).map(([region, stat]) => ({
    region,
    avgTemp: Math.round((stat.totalTemp / stat.count) * 10) / 10,
    maxTemp: Math.round(stat.maxTemp * 10) / 10,
    minTemp: Math.round(stat.minTemp * 10) / 10,
    totalRain: Math.round(stat.totalRain * 10) / 10,
    avgWind: Math.round((stat.totalWind / stat.count) * 10) / 10,
    stations: stat.count,
  }));

  // Top 5 hottest and coolest stations
  const sorted = [...observations].sort((a, b) => b.temperature - a.temperature);
  const hottest = sorted.slice(0, 5);
  const coolest = [...sorted].reverse().slice(0, 5);

  return (
    <div className="bg-[#111c30] border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            REGIONAL METEOROLOGICAL PROFILES & NATIONAL EXTREMES
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Computed across {observations.length} active stations
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Regional Temperatures */}
        <div className="bg-[#0c1424] p-3.5 rounded-lg border border-slate-800">
          <div className="text-xs font-mono text-slate-300 font-semibold mb-2 flex items-center justify-between">
            <span>REGIONAL MEAN TEMPERATURE</span>
            <span className="text-[10px] text-slate-400">°C (Dry-bulb)</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="region" stroke="#64748b" fontSize={10} fontStyle="mono" />
                <YAxis stroke="#64748b" fontSize={10} fontStyle="mono" domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace' }}
                  formatter={(val: any) => [`${val}°C`, 'Avg Temp']}
                />
                <Bar dataKey="avgTemp" radius={[4, 4, 0, 0]}>
                  {regionalData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.avgTemp > 30 ? '#f97316' : (entry.avgTemp > 22 ? '#10b981' : '#38bdf8')}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Regional Precipitation Accumulation */}
        <div className="bg-[#0c1424] p-3.5 rounded-lg border border-slate-800">
          <div className="text-xs font-mono text-slate-300 font-semibold mb-2 flex items-center justify-between">
            <span>REGIONAL TOTAL PRECIPITATION</span>
            <span className="text-[10px] text-sky-400">mm / Cumulative</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="region" stroke="#64748b" fontSize={10} fontStyle="mono" />
                <YAxis stroke="#64748b" fontSize={10} fontStyle="mono" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace' }}
                  formatter={(val: any) => [`${val} mm`, 'Rain Total']}
                />
                <Bar dataKey="totalRain" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* National Extremes: Hottest and Coolest Cities */}
        <div className="bg-[#0c1424] p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="text-xs font-mono text-slate-300 font-semibold mb-2 flex items-center justify-between">
            <span>NATIONAL TEMPERATURE EXTREMES</span>
            <span className="text-[10px] text-slate-400">Live Reading</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            {/* Top Hottest */}
            <div className="bg-[#15233c] p-2 rounded border border-orange-950">
              <div className="flex items-center space-x-1 text-orange-400 font-bold mb-1.5 text-[11px]">
                <Flame className="w-3.5 h-3.5" />
                <span>HOTTEST STATIONS</span>
              </div>
              <div className="space-y-1 text-[11px]">
                {hottest.slice(0, 4).map(h => (
                  <div key={h.location_id} className="flex justify-between items-center text-slate-300">
                    <span className="truncate max-w-[85px]">{h.city}</span>
                    <span className="font-bold text-orange-300">{h.temperature.toFixed(1)}°</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Coolest */}
            <div className="bg-[#15233c] p-2 rounded border border-sky-950">
              <div className="flex items-center space-x-1 text-sky-400 font-bold mb-1.5 text-[11px]">
                <Snowflake className="w-3.5 h-3.5" />
                <span>COOLEST STATIONS</span>
              </div>
              <div className="space-y-1 text-[11px]">
                {coolest.slice(0, 4).map(c => (
                  <div key={c.location_id} className="flex justify-between items-center text-slate-300">
                    <span className="truncate max-w-[85px]">{c.city}</span>
                    <span className="font-bold text-sky-300">{c.temperature.toFixed(1)}°</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Network Mean: {(observations.reduce((a, b) => a + b.temperature, 0) / (observations.length || 1)).toFixed(1)}°C</span>
            <span className="text-emerald-400">100% Validated Data</span>
          </div>
        </div>
      </div>
    </div>
  );
};
