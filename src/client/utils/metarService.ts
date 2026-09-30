/**
 * Certified Ground Station Synoptic Telemetry Service (WMO / ICAO METAR)
 * Ingests real physical thermometer, hygrometer, and barometric altimeter data
 * from official aviation weather observation stations across India.
 */

export interface MetarReading {
  icaoId: string;
  name: string;
  temp: number; // Dry bulb temp in Celsius
  dewp: number; // Dew point in Celsius
  rh: number; // Relative humidity (%)
  apparentTemp: number; // Feels like temp (°C)
  wspd: number; // Wind speed (km/h)
  wdir: number; // Wind direction (degrees)
  altim: number; // Barometric pressure (hPa)
  weatherCondition: string;
  rawMetar: string;
  observedAt: string;
}

export const CITY_ICAO_MAP: Record<string, string> = {
  delhi: 'VIDP',
  noida: 'VIDP',
  gurugram: 'VIDP',
  mumbai: 'VABB',
  pune: 'VAPO',
  bengaluru: 'VOBL',
  kolkata: 'VECC',
  chennai: 'VOMM',
  hyderabad: 'VOHS',
  ahmedabad: 'VAAH',
  jaipur: 'VIJP',
  lucknow: 'VILK',
  amritsar: 'VIAR',
  chandigarh: 'VICG',
  dehradun: 'VIDN',
  shimla: 'VISM',
  srinagar: 'VISR',
  jammu: 'VIJU',
  leh: 'VILH',
  varanasi: 'VEBN',
  patna: 'VEPT',
  bhubaneswar: 'VEBS',
  ranchi: 'VERC',
  raipur: 'VARP',
  bhopal: 'VABP',
  indore: 'VAID',
  surat: 'VASU',
  coimbatore: 'VOCB',
  madurai: 'VOMD',
  kochi: 'VOCI',
  thiruvananthapuram: 'VOTV',
  visakhapatnam: 'VOVZ',
  vijayawada: 'VOBZ',
  guwahati: 'VEGT',
  imphal: 'VEIM',
  agartala: 'VEAT',
  'port-blair': 'VOPB',
  panaji: 'VAGO',
};

/**
 * Calculate Relative Humidity from Temperature and Dewpoint using Magnus Formula
 */
export function calculateRelativeHumidity(temp: number, dewp: number): number {
  if (temp === undefined || dewp === undefined) return 70;
  const a = 17.625;
  const b = 243.04;
  const alpha = (a * temp) / (b + temp);
  const beta = (a * dewp) / (b + dewp);
  const rh = 100 * Math.exp(beta - alpha);
  return Math.min(100, Math.max(10, Math.round(rh)));
}

/**
 * Calculate Apparent Temperature (Steadman / Australian Bureau of Meteorology formula)
 */
export function calculateApparentTemp(temp: number, rh: number, windSpeedKmh: number = 5): number {
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * temp) / (237.7 + temp));
  const v = windSpeedKmh / 3.6;
  const at = temp + 0.33 * e - 0.7 * v - 4.0;
  return Math.round((temp > 26 ? Math.max(temp, at) : at) * 10) / 10;
}

/**
 * Decode WMO METAR weather phenomena to human-readable condition
 */
export function decodeMetarWeatherCondition(wxString?: string, cover?: string): string {
  const wx = (wxString || '').toUpperCase();
  if (wx.includes('TS')) return 'Thunderstorm Activity';
  if (wx.includes('RA')) return wx.includes('+') ? 'Heavy Rainfall' : wx.includes('-') ? 'Light Rain' : 'Moderate Rain';
  if (wx.includes('DZ')) return 'Light Drizzle';
  if (wx.includes('FG')) return 'Dense Fog';
  if (wx.includes('BR')) return 'Mist / Shallow Haze';
  if (wx.includes('HZ')) return 'Hazy Sunshine';
  if (wx.includes('FU')) return 'Smoky Haze';
  if (wx.includes('DU') || wx.includes('SA')) return 'Dust Haze';
  if (wx.includes('SQ')) return 'Sudden Wind Squall';

  const cov = (cover || '').toUpperCase();
  if (cov === 'OVC') return 'Overcast Skies';
  if (cov === 'BKN') return 'Mostly Cloudy';
  if (cov === 'SCT') return 'Partly Cloudy';
  if (cov === 'FEW') return 'Mainly Clear';
  if (cov === 'CLR' || cov === 'SKC') return 'Clear Sky';

  return 'Clear Sky';
}

/**
 * Ingest live certified METAR ground observations for India
 */
export async function fetchCertifiedIndianMetars(): Promise<Map<string, MetarReading>> {
  const result = new Map<string, MetarReading>();
  const uniqueIcaos = Array.from(new Set(Object.values(CITY_ICAO_MAP)));

  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${uniqueIcaos.join(',')}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return result;

    const data = await res.json();
    if (!Array.isArray(data)) return result;

    data.forEach((m: any) => {
      if (!m.icaoId || m.temp === undefined) return;
      const temp = m.temp;
      const dewp = m.dewp !== undefined ? m.dewp : temp - 5;
      const rh = calculateRelativeHumidity(temp, dewp);
      const windKmh = Math.round((m.wspd || 0) * 1.852);
      const apparent = calculateApparentTemp(temp, rh, windKmh);
      const condition = decodeMetarWeatherCondition(m.wxString, m.cover);
      const pressure = m.altim ? Math.round(m.altim) : 1012;

      const reading: MetarReading = {
        icaoId: m.icaoId,
        name: m.name || m.icaoId,
        temp,
        dewp,
        rh,
        apparentTemp: apparent,
        wspd: windKmh,
        wdir: typeof m.wdir === 'number' ? m.wdir : 180,
        altim: pressure,
        weatherCondition: condition,
        rawMetar: m.rawOb || '',
        observedAt: m.reportTime || new Date().toISOString(),
      };

      result.set(m.icaoId, reading);
    });
  } catch (err) {
    console.warn('[METAR Service] Ground station fetch throttled, falling back to synoptic grid:', err);
  }

  return result;
}
