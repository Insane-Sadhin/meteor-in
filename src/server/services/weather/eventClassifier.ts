import type { NormalizedWeather, WeatherEvent } from './weatherTypes.ts';
import { getCityById } from '../../data/cities.ts';

export class EventClassifier {
  static classifyObservation(obs: NormalizedWeather): WeatherEvent[] {
    const events: WeatherEvent[] = [];
    const city = getCityById(obs.locationId);
    const locationName = city ? `${city.city}, ${city.state}` : `Station ${obs.locationId}`;
    const state = city?.state || 'India';
    const isHillStation = (city?.elevation || 0) > 1200;

    // 1. Heavy Rain Detection
    const rainIntensity = Math.max(obs.precipitation, obs.rain, obs.showers);
    if (rainIntensity >= 15.0) {
      let severity: WeatherEvent['severity'] = 'MODERATE';
      let confidence = 0.78;

      if (rainIntensity >= 65.0) {
        severity = 'EXTREME';
        confidence = 0.95;
      } else if (rainIntensity >= 35.0) {
        severity = 'SEVERE';
        confidence = 0.91;
      } else if (rainIntensity >= 20.0) {
        severity = 'HIGH';
        confidence = 0.85;
      }

      events.push({
        eventType: 'Heavy Rain',
        locationId: obs.locationId,
        locationName,
        state,
        latitude: obs.latitude,
        longitude: obs.longitude,
        detectedAt: new Date().toISOString(),
        severity,
        confidence,
        source: 'SYSTEM DETECTION',
        status: 'ACTIVE',
        summary: `Automated detection: ${severity.toLowerCase()} rainfall intensity of ${rainIntensity.toFixed(1)} mm/h at ${locationName}`,
        rationale: `Precipitation threshold exceeded (${rainIntensity.toFixed(1)} mm/h) + high rainfall intensity sensor response + saturated atmospheric column (RH ${obs.humidity}%)`,
        affectedRadiusKm: 25.0,
        metadata: { precipitation: rainIntensity, humidity: obs.humidity },
      });
    }

    // 2. Thunderstorm Detection
    const isThunderstormCode = [95, 96, 99].includes(obs.weatherCode);
    const isConvectiveGale = rainIntensity >= 10.0 && obs.windSpeed >= 35.0;

    if (isThunderstormCode || isConvectiveGale) {
      const hasHail = obs.weatherCode === 96 || obs.weatherCode === 99;
      const severity: WeatherEvent['severity'] = hasHail ? 'SEVERE' : (obs.windSpeed > 50 ? 'HIGH' : 'MODERATE');
      const confidence = isThunderstormCode ? (hasHail ? 0.94 : 0.88) : 0.79;

      events.push({
        eventType: 'Thunderstorm',
        locationId: obs.locationId,
        locationName,
        state,
        latitude: obs.latitude,
        longitude: obs.longitude,
        detectedAt: new Date().toISOString(),
        severity,
        confidence,
        source: 'SYSTEM DETECTION',
        status: 'ACTIVE',
        summary: `Automated detection: Thunderstorm activity with ${hasHail ? 'hail risks' : 'gusty squalls'} at ${locationName}`,
        rationale: isThunderstormCode
          ? `WMO Convective classification code ${obs.weatherCode} matched + electrical squall signature + wind speed of ${obs.windSpeed.toFixed(0)} km/h`
          : `High rainfall intensity (${rainIntensity.toFixed(1)} mm/h) coupled with sudden convective wind surge (${obs.windSpeed.toFixed(0)} km/h)`,
        affectedRadiusKm: 35.0,
        metadata: { weatherCode: obs.weatherCode, windSpeed: obs.windSpeed, hasHail },
      });
    }

    // 3. Flood Risk Detection
    if (rainIntensity >= 30.0 || (rainIntensity >= 20.0 && obs.humidity >= 92 && obs.pressure < 1005)) {
      const severity: WeatherEvent['severity'] = rainIntensity >= 50.0 ? 'SEVERE' : 'HIGH';
      const confidence = 0.82;

      events.push({
        eventType: 'Flood Risk',
        locationId: obs.locationId,
        locationName,
        state,
        latitude: obs.latitude,
        longitude: obs.longitude,
        detectedAt: new Date().toISOString(),
        severity,
        confidence,
        source: 'SYSTEM DETECTION',
        status: 'ACTIVE',
        summary: `Automated detection: Urban waterlogging and flash flood risk identified around ${locationName}`,
        rationale: `Sustained high precipitation rate (${rainIntensity.toFixed(1)} mm/h) + low barometric pressure (${obs.pressure.toFixed(1)} hPa) exceeding local hydrological absorption capacity`,
        affectedRadiusKm: 20.0,
        metadata: { precipitation: rainIntensity, pressure: obs.pressure },
      });
    }

    // 4. Heatwave Detection
    const heatwaveThreshold = isHillStation ? 30.0 : 40.0;
    if (obs.temperature >= heatwaveThreshold) {
      const diff = obs.temperature - heatwaveThreshold;
      let severity: WeatherEvent['severity'] = 'MODERATE';
      let confidence = 0.84;

      if (diff >= 5.0) {
        severity = 'EXTREME';
        confidence = 0.94;
      } else if (diff >= 3.0) {
        severity = 'SEVERE';
        confidence = 0.90;
      } else if (diff >= 1.5) {
        severity = 'HIGH';
        confidence = 0.86;
      }

      events.push({
        eventType: 'Heatwave',
        locationId: obs.locationId,
        locationName,
        state,
        latitude: obs.latitude,
        longitude: obs.longitude,
        detectedAt: new Date().toISOString(),
        severity,
        confidence,
        source: 'SYSTEM DETECTION',
        status: 'ACTIVE',
        summary: `Automated detection: ${severity.toLowerCase()} heatwave condition at ${locationName} (${obs.temperature.toFixed(1)}°C)`,
        rationale: `Ambient dry-bulb temperature (${obs.temperature.toFixed(1)}°C) exceeds regional meteorological threshold of ${heatwaveThreshold}°C + apparent heat index ${obs.apparentTemperature?.toFixed(1) || obs.temperature.toFixed(1)}°C`,
        affectedRadiusKm: 50.0,
        metadata: { temperature: obs.temperature, apparentTemperature: obs.apparentTemperature, threshold: heatwaveThreshold },
      });
    }

    // 5. Fog Detection
    const isFogCode = [45, 48].includes(obs.weatherCode);
    const isFogConditions = obs.humidity >= 95 && obs.windSpeed <= 8.0 && obs.cloudCover >= 70;

    if (isFogCode || isFogConditions) {
      const severity: WeatherEvent['severity'] = (isFogCode && obs.humidity > 97) ? 'HIGH' : 'MODERATE';
      const confidence = isFogCode ? 0.89 : 0.77;

      events.push({
        eventType: 'Fog',
        locationId: obs.locationId,
        locationName,
        state,
        latitude: obs.latitude,
        longitude: obs.longitude,
        detectedAt: new Date().toISOString(),
        severity,
        confidence,
        source: 'SYSTEM DETECTION',
        status: 'ACTIVE',
        summary: `Automated detection: Low-visibility dense fog conditions over ${locationName}`,
        rationale: `Near-saturated boundary humidity (${obs.humidity}%) combined with stagnant wind velocity (${obs.windSpeed.toFixed(1)} km/h) causing surface moisture condensation`,
        affectedRadiusKm: 30.0,
        metadata: { humidity: obs.humidity, windSpeed: obs.windSpeed, weatherCode: obs.weatherCode },
      });
    }

    // 6. Strong Wind Detection
    const peakWind = Math.max(obs.windSpeed, obs.windGusts || 0);
    if (obs.windSpeed >= 40.0 || (obs.windGusts && obs.windGusts >= 55.0)) {
      const severity: WeatherEvent['severity'] = peakWind >= 75.0 ? 'EXTREME' : (peakWind >= 55.0 ? 'HIGH' : 'MODERATE');
      const confidence = 0.87;

      events.push({
        eventType: 'Strong Wind',
        locationId: obs.locationId,
        locationName,
        state,
        latitude: obs.latitude,
        longitude: obs.longitude,
        detectedAt: new Date().toISOString(),
        severity,
        confidence,
        source: 'SYSTEM DETECTION',
        status: 'ACTIVE',
        summary: `Automated detection: Strong surface winds and gale gusts reaching ${peakWind.toFixed(0)} km/h at ${locationName}`,
        rationale: `Sustained wind velocity (${obs.windSpeed.toFixed(0)} km/h) and peak gusts (${(obs.windGusts || obs.windSpeed).toFixed(0)} km/h) exceed operational safety thresholds`,
        affectedRadiusKm: 40.0,
        metadata: { windSpeed: obs.windSpeed, windGusts: obs.windGusts, direction: obs.windDirection },
      });
    }

    return events;
  }
}
