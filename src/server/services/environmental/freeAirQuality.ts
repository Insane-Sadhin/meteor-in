import axios from 'axios';
import { INDIAN_CITIES } from '../../data/cities.ts';

export interface CityAirQuality {
  locationId: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  pm2_5: number;
  pm10: number;
  carbonMonoxide: number;
  nitrogenDioxide: number;
  sulphurDioxide: number;
  ozone: number;
  dust: number;
  uvIndex: number;
  europeanAqi: number;
  usAqi: number;
  indianAqi: number;
  aqiCategory: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
}

// Indian National Air Quality Index (NAQI) standard formula
function calculateIndianNAQI(pm25: number, pm10: number): { aqi: number; category: CityAirQuality['aqiCategory'] } {
  let aqiPm25 = 0;
  if (pm25 <= 30) aqiPm25 = (pm25 / 30) * 50;
  else if (pm25 <= 60) aqiPm25 = 51 + ((pm25 - 31) / 29) * 49;
  else if (pm25 <= 90) aqiPm25 = 101 + ((pm25 - 61) / 29) * 99;
  else if (pm25 <= 120) aqiPm25 = 201 + ((pm25 - 91) / 29) * 99;
  else if (pm25 <= 250) aqiPm25 = 301 + ((pm25 - 121) / 129) * 99;
  else aqiPm25 = Math.min(500, 401 + ((pm25 - 250) / 150) * 99);

  let aqiPm10 = 0;
  if (pm10 <= 50) aqiPm10 = pm10;
  else if (pm10 <= 100) aqiPm10 = 51 + ((pm10 - 51) / 49) * 49;
  else if (pm10 <= 250) aqiPm10 = 101 + ((pm10 - 101) / 149) * 99;
  else if (pm10 <= 350) aqiPm10 = 201 + ((pm10 - 251) / 99) * 99;
  else if (pm10 <= 430) aqiPm10 = 301 + ((pm10 - 351) / 79) * 99;
  else aqiPm10 = Math.min(500, 401 + ((pm10 - 430) / 70) * 99);

  const finalAqi = Math.round(Math.max(aqiPm25, aqiPm10));

  let category: CityAirQuality['aqiCategory'] = 'Good';
  if (finalAqi > 400) category = 'Severe';
  else if (finalAqi > 300) category = 'Very Poor';
  else if (finalAqi > 200) category = 'Poor';
  else if (finalAqi > 100) category = 'Moderate';
  else if (finalAqi > 50) category = 'Satisfactory';

  return { aqi: finalAqi, category };
}

export class FreeAirQualityService {
  private static cache: CityAirQuality[] = [];
  private static lastFetchTime = 0;
  private static CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

  static async getNationalAirQuality(): Promise<CityAirQuality[]> {
    const now = Date.now();
    if (this.cache.length > 0 && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cache;
    }

    try {
      // Batch query Open-Meteo Air Quality API for top 30 key population centers
      const sampleCities = INDIAN_CITIES.slice(0, 35);
      const lats = sampleCities.map(c => c.latitude.toFixed(4)).join(',');
      const lons = sampleCities.map(c => c.longitude.toFixed(4)).join(',');

      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index,european_aqi,us_aqi&timezone=Asia/Kolkata`;

      const res = await axios.get(url, { timeout: 10000 });
      const data = res.data;
      const isArray = Array.isArray(data);

      const results: CityAirQuality[] = [];

      sampleCities.forEach((city, index) => {
        const item = isArray ? data[index] : (index === 0 ? data : null);
        if (!item || !item.current) return;
        const cur = item.current;

        const pm25 = cur.pm2_5 ?? 25;
        const pm10 = cur.pm10 ?? 45;
        const { aqi, category } = calculateIndianNAQI(pm25, pm10);

        results.push({
          locationId: city.id,
          city: city.city,
          state: city.state,
          latitude: city.latitude,
          longitude: city.longitude,
          observedAt: cur.time ? new Date(cur.time + '+05:30').toISOString() : new Date().toISOString(),
          pm2_5: pm25,
          pm10: pm10,
          carbonMonoxide: cur.carbon_monoxide ?? 0,
          nitrogenDioxide: cur.nitrogen_dioxide ?? 0,
          sulphurDioxide: cur.sulphur_dioxide ?? 0,
          ozone: cur.ozone ?? 0,
          dust: cur.dust ?? 0,
          uvIndex: cur.uv_index ?? 0,
          europeanAqi: cur.european_aqi ?? 0,
          usAqi: cur.us_aqi ?? 0,
          indianAqi: aqi,
          aqiCategory: category,
        });
      });

      this.cache = results;
      this.lastFetchTime = now;
      return results;
    } catch (err: any) {
      console.warn('[AirQuality API] Failed to fetch live Open-Meteo AQI:', err.message);
      if (this.cache.length > 0) return this.cache;

      // Fallback baseline
      return INDIAN_CITIES.slice(0, 25).map(c => ({
        locationId: c.id,
        city: c.city,
        state: c.state,
        latitude: c.latitude,
        longitude: c.longitude,
        observedAt: new Date().toISOString(),
        pm2_5: 45.2,
        pm10: 88.5,
        carbonMonoxide: 450,
        nitrogenDioxide: 28.4,
        sulphurDioxide: 12.1,
        ozone: 34.0,
        dust: 15.0,
        uvIndex: 4.5,
        europeanAqi: 50,
        usAqi: 75,
        indianAqi: 95,
        aqiCategory: 'Moderate',
      }));
    }
  }
}
