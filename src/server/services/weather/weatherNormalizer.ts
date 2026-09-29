// WMO Weather interpretation codes (WW)
// https://open-meteo.com/en/docs
export const WMO_CODE_MAP: Record<number, { condition: string; category: string; icon: string }> = {
  0: { condition: 'Clear sky', category: 'Clear', icon: 'Sun' },
  1: { condition: 'Mainly clear', category: 'Clear', icon: 'SunMedium' },
  2: { condition: 'Partly cloudy', category: 'Clouds', icon: 'CloudSun' },
  3: { condition: 'Overcast', category: 'Clouds', icon: 'Cloud' },
  45: { condition: 'Fog', category: 'Fog', icon: 'CloudFog' },
  48: { condition: 'Depositing rime fog', category: 'Fog', icon: 'CloudFog' },
  51: { condition: 'Drizzle: Light intensity', category: 'Drizzle', icon: 'CloudDrizzle' },
  53: { condition: 'Drizzle: Moderate intensity', category: 'Drizzle', icon: 'CloudDrizzle' },
  55: { condition: 'Drizzle: Dense intensity', category: 'Drizzle', icon: 'CloudRain' },
  56: { condition: 'Freezing Drizzle: Light', category: 'Freezing Drizzle', icon: 'CloudSnow' },
  57: { condition: 'Freezing Drizzle: Dense', category: 'Freezing Drizzle', icon: 'CloudSnow' },
  61: { condition: 'Rain: Slight intensity', category: 'Rain', icon: 'CloudRain' },
  63: { condition: 'Rain: Moderate intensity', category: 'Rain', icon: 'CloudRain' },
  65: { condition: 'Rain: Heavy intensity', category: 'Heavy Rain', icon: 'CloudRainWind' },
  66: { condition: 'Freezing Rain: Light', category: 'Freezing Rain', icon: 'CloudSnow' },
  67: { condition: 'Freezing Rain: Heavy', category: 'Freezing Rain', icon: 'CloudSnow' },
  71: { condition: 'Snow fall: Slight intensity', category: 'Snow', icon: 'CloudSnow' },
  73: { condition: 'Snow fall: Moderate intensity', category: 'Snow', icon: 'CloudSnow' },
  75: { condition: 'Snow fall: Heavy intensity', category: 'Heavy Snow', icon: 'CloudSnow' },
  77: { condition: 'Snow grains', category: 'Snow', icon: 'CloudSnow' },
  80: { condition: 'Rain showers: Slight', category: 'Showers', icon: 'CloudRain' },
  81: { condition: 'Rain showers: Moderate', category: 'Showers', icon: 'CloudRain' },
  82: { condition: 'Rain showers: Violent', category: 'Violent Rain', icon: 'CloudRainWind' },
  85: { condition: 'Snow showers: Slight', category: 'Snow', icon: 'CloudSnow' },
  86: { condition: 'Snow showers: Heavy', category: 'Snow', icon: 'CloudSnow' },
  95: { condition: 'Thunderstorm: Slight or moderate', category: 'Thunderstorm', icon: 'CloudLightning' },
  96: { condition: 'Thunderstorm with slight hail', category: 'Severe Thunderstorm', icon: 'CloudLightning' },
  99: { condition: 'Thunderstorm with heavy hail', category: 'Severe Thunderstorm', icon: 'CloudLightning' }
};

export function interpretWeatherCode(code: number): { condition: string; category: string; icon: string } {
  return WMO_CODE_MAP[code] || {
    condition: `Weather code ${code}`,
    category: 'Unknown',
    icon: 'Cloud'
  };
}

export function calculateAQIIndex(pm25?: number, pm10?: number): number | undefined {
  if (pm25 === undefined && pm10 === undefined) return undefined;

  // Indian National Air Quality Index (NAQI) Breakpoints for PM2.5 (24-hr avg in µg/m³)
  // Good: 0-30, Satisfactory: 31-60, Moderate: 61-90, Poor: 91-120, Very Poor: 121-250, Severe: 250+
  if (pm25 !== undefined) {
    if (pm25 <= 30) return Math.round((pm25 / 30) * 50);
    if (pm25 <= 60) return Math.round(51 + ((pm25 - 31) / 29) * 49);
    if (pm25 <= 90) return Math.round(101 + ((pm25 - 61) / 29) * 99);
    if (pm25 <= 120) return Math.round(201 + ((pm25 - 91) / 29) * 99);
    if (pm25 <= 250) return Math.round(301 + ((pm25 - 121) / 129) * 99);
    return Math.min(500, Math.round(401 + ((pm25 - 250) / 150) * 99));
  }

  if (pm10 !== undefined) {
    if (pm10 <= 50) return Math.round(pm10);
    if (pm10 <= 100) return Math.round(51 + ((pm10 - 51) / 49) * 49);
    if (pm10 <= 250) return Math.round(101 + ((pm10 - 101) / 149) * 99);
    return Math.min(500, Math.round(201 + ((pm10 - 251) / 150) * 199));
  }

  return undefined;
}
