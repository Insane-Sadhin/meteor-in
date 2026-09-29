import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  Database,
} from 'lucide-react';
import { Observation } from '../types/index.ts';
import { formatISTTime, getTemperatureColor } from '../utils/formatters.ts';

interface ObservationsTableProps {
  observations: Observation[];
  onSelectStation: (stationId: string) => void;
  selectedStationId?: string | null;
}

export const ObservationsTable: React.FC<ObservationsTableProps> = ({
  observations,
  onSelectStation,
  selectedStationId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'city' | 'temp' | 'rain' | 'wind' | 'time'>('city');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    return observations
      .filter(obs => {
        const matchesSearch =
          obs.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          obs.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
          obs.weather_condition.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRegion = regionFilter === 'ALL' || obs.region === regionFilter;
        return matchesSearch && matchesRegion;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'city') cmp = a.city.localeCompare(b.city);
        else if (sortBy === 'temp') cmp = a.temperature - b.temperature;
        else if (sortBy === 'rain') cmp = (a.precipitation || 0) - (b.precipitation || 0);
        else if (sortBy === 'wind') cmp = (a.wind_speed || 0) - (b.wind_speed || 0);
        else if (sortBy === 'time') cmp = new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime();

        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [observations, searchTerm, regionFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'city' | 'temp' | 'rain' | 'wind' | 'time') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'city' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="bg-[#111c30] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Table Header and Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#0e1728]">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              RECENT STATION OBSERVATIONS
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time normalized feeds across national monitoring stations ({filtered.length} of {observations.length})
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search station or state..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-[#090f1d] border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono w-48 sm:w-56"
            />
          </div>

          {/* Region Dropdown */}
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            className="bg-[#090f1d] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
          >
            <option value="ALL">All Regions</option>
            <option value="North">North India</option>
            <option value="South">South India</option>
            <option value="East">East India</option>
            <option value="West">West India</option>
            <option value="Central">Central India</option>
            <option value="North-East">North-East</option>
            <option value="Island">Island UTs</option>
          </select>
        </div>
      </div>

      {/* Table Data Container */}
      <div className="overflow-x-auto max-h-[460px]">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-[#090f1d] text-slate-400 border-b border-slate-800 sticky top-0 z-10 select-none">
            <tr>
              <th
                onClick={() => toggleSort('city')}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center space-x-1">
                  <span>STATION / REGION</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold">COORDINATES</th>
              <th
                onClick={() => toggleSort('temp')}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center space-x-1">
                  <span>TEMPERATURE</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold">HUMIDITY</th>
              <th
                onClick={() => toggleSort('rain')}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center space-x-1">
                  <span>PRECIPITATION</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('wind')}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center space-x-1">
                  <span>WIND</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold">PRESSURE</th>
              <th className="py-2.5 px-3 font-semibold">CONDITION</th>
              <th className="py-2.5 px-3 font-semibold">SOURCE</th>
              <th
                onClick={() => toggleSort('time')}
                className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center space-x-1">
                  <span>OBSERVED (IST)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500">
                  No matching meteorological stations found for query "{searchTerm}"
                </td>
              </tr>
            ) : (
              filtered.map(obs => {
                const isSelected = selectedStationId === obs.location_id;
                const rain = (obs.precipitation || obs.rain || 0);

                return (
                  <tr
                    key={obs.location_id}
                    onClick={() => onSelectStation(obs.location_id)}
                    className={`hover:bg-[#162238] transition cursor-pointer ${
                      isSelected ? 'bg-sky-950/40 text-white' : ''
                    }`}
                  >
                    {/* Station */}
                    <td className="py-2 px-3">
                      <div className="font-bold text-white flex items-center space-x-1.5">
                        <span>{obs.city}</span>
                        {obs.is_simulated && (
                          <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-300 border border-amber-800">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {obs.state} &bull; {obs.region}
                      </div>
                    </td>

                    {/* Coordinates */}
                    <td className="py-2 px-3 text-slate-400 text-[11px]">
                      {obs.latitude.toFixed(2)}°N, {obs.longitude.toFixed(2)}°E
                    </td>

                    {/* Temperature */}
                    <td className="py-2 px-3">
                      <div className="flex items-center space-x-1.5">
                        <span
                          style={{ color: getTemperatureColor(obs.temperature) }}
                          className="font-bold text-sm"
                        >
                          {obs.temperature.toFixed(1)}°C
                        </span>
                        {obs.apparent_temperature && (
                          <span className="text-[10px] text-slate-400">
                            ({obs.apparent_temperature.toFixed(0)}°)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Humidity */}
                    <td className="py-2 px-3 text-slate-300">
                      {obs.humidity}%
                    </td>

                    {/* Precipitation */}
                    <td className="py-2 px-3">
                      <span className={rain > 0 ? 'text-sky-400 font-bold' : 'text-slate-500'}>
                        {rain.toFixed(1)} mm
                      </span>
                    </td>

                    {/* Wind */}
                    <td className="py-2 px-3">
                      <span className={obs.wind_speed > 30 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {Math.round(obs.wind_speed)} km/h
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">({Math.round(obs.wind_direction)}°)</span>
                    </td>

                    {/* Pressure */}
                    <td className="py-2 px-3 text-slate-400">
                      {obs.pressure ? `${obs.pressure.toFixed(0)} hPa` : '-'}
                    </td>

                    {/* Condition */}
                    <td className="py-2 px-3 text-sky-300 font-medium">
                      {obs.weather_condition}
                    </td>

                    {/* Source */}
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-emerald-400">
                        {obs.source}
                      </span>
                    </td>

                    {/* Observed Time */}
                    <td className="py-2 px-3 text-slate-300">
                      {formatISTTime(obs.observed_at)}
                    </td>

                    {/* Action */}
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectStation(obs.location_id);
                        }}
                        className="p-1 rounded hover:bg-slate-700 text-sky-400 hover:text-white transition"
                        title="View Station Details & Forecast"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
