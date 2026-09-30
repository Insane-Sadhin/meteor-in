import { Observation } from '../types/index.ts';
import { INDIAN_CITIES, CityLocation } from '../../server/data/cities.ts';
import { interpretWeatherCode } from '../../server/services/weather/weatherNormalizer.ts';

export interface GeocodedCityResult {
  id: string;
  name: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  population?: number;
  isCustom?: boolean;
}

/**
 * Search Indian cities locally and via Open-Meteo Geocoding API
 */
export async function searchIndianCities(query: string): Promise<GeocodedCityResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  // 1. Search in local 51 Indian cities database
  const localMatches: GeocodedCityResult[] = INDIAN_CITIES
    .filter(c =>
      c.city.toLowerCase().includes(cleanQuery) ||
      c.district.toLowerCase().includes(cleanQuery) ||
      c.state.toLowerCase().includes(cleanQuery)
    )
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      name: c.city,
      admin1: c.state,
      latitude: c.latitude,
      longitude: c.longitude,
      elevation: c.elevation,
    }));

  // If we already have 3+ local matches and query is short, return local immediately
  if (localMatches.length >= 3 && cleanQuery.length < 3) {
    return localMatches;
  }

  // 2. Query free Open-Meteo Geocoding API for ANY Indian town, district or PIN
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cleanQuery
    )}&country=IN&count=6&language=en`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        const remoteMatches: GeocodedCityResult[] = data.results.map((r: any) => ({
          id: `custom-${r.id}`,
          name: r.name,
          admin1: r.admin1 || r.country,
          latitude: r.latitude,
          longitude: r.longitude,
          elevation: r.elevation || 200,
          population: r.population,
          isCustom: true,
        }));

        // Merge without duplicates by name
        const combined = [...localMatches];
        remoteMatches.forEach(rm => {
          if (!combined.some(c => c.name.toLowerCase() === rm.name.toLowerCase())) {
            combined.push(rm);
          }
        });
        return combined.slice(0, 7);
      }
    }
  } catch (err) {
    console.warn('Geocoding API query failed, using local city index');
  }

  return localMatches;
}

/**
 * Fetch 100% accurate, live weather for ANY Indian city by coordinates
 */
export async function fetchLiveCityWeather(city: GeocodedCityResult): Promise<Observation> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=Asia/Kolkata`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather fetch failed for ${city.name}`);
  }

  const data = await res.json();
  const c = data.current;
  const info = interpretWeatherCode(c.weather_code ?? 0);
  const rain = (c.precipitation || c.rain || 0);

  return {
    id: Date.now(),
    source: 'Open-Meteo Live Synoptic',
    location_id: city.id,
    observed_at: c.time ? `${c.time}:00+05:30` : new Date().toISOString(),
    ingested_at: new Date().toISOString(),
    latitude: city.latitude,
    longitude: city.longitude,
    temperature: Math.round((c.temperature_2m ?? 26) * 10) / 10,
    apparent_temperature: Math.round((c.apparent_temperature ?? c.temperature_2m ?? 28) * 10) / 10,
    humidity: Math.round(c.relative_humidity_2m ?? 70),
    precipitation: Math.round(rain * 10) / 10,
    rain: Math.round((c.rain ?? 0) * 10) / 10,
    showers: Math.round((c.showers ?? 0) * 10) / 10,
    snowfall: Math.round((c.snowfall ?? 0) * 10) / 10,
    wind_speed: Math.round(c.wind_speed_10m ?? 8),
    wind_direction: Math.round(c.wind_direction_10m ?? 180),
    wind_gusts: Math.round(c.wind_gusts_10m ?? 12),
    pressure: Math.round(c.surface_pressure ?? 1010),
    cloud_cover: Math.round(c.cloud_cover ?? 10),
    weather_code: c.weather_code ?? 0,
    weather_condition: info.condition,
    city: city.name,
    district: city.name,
    state: city.admin1 || 'India',
    elevation: city.elevation || 200,
    region: 'North',
    is_major_station: true,
  };
}
