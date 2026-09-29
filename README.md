<div align="center">

# 🌦️ METEOR-IN
### National Weather Data Intelligence Platform for India
**राष्ट्रीय मौसम आसूचना मंच**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B-brightgreen.svg)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PGlite%20%26%20Dedicated-336791.svg)](https://postgresql.org)
[![Open-Meteo](https://img.shields.io/badge/Primary%20Provider-Open--Meteo-0284c7.svg)](https://open-meteo.com)
[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel%20Edge-black.svg)](https://meteor-in.vercel.app)
[![Compliance](https://img.shields.io/badge/Audit-12%2F12%20Checks%20Passed-emerald.svg)](#verification-audit)

*A production-grade, real-time national meteorological data intelligence system ingesting, normalizing, classifying, and mapping live weather observations across all 28 Indian States and Union Territories.*

</div>

---

## 🌟 Key Highlights

- **Live External Ingestion (Not a Mock/Prototype)**: Continuously fetches live atmospheric telemetry across 51 major Indian observation stations using Open-Meteo batch API.
- **WMO-Standard Normalization**: Standardizes temperatures, dew point, relative humidity, wind vectors, barometric pressure, precipitation, and WMO synoptic weather codes (0–99).
- **Embedded PostgreSQL Timeseries**: Powered by PostgreSQL WASM (`PGlite`) locally with zero configuration required, and seamless fallback to remote dedicated PostgreSQL via `DATABASE_URL`.
- **Heuristic Automated Event Detection**: Real-time rule-based classifier for **Heavy Rain**, **Thunderstorms**, **Flood Risk**, **Heatwaves**, **Dense Fog**, and **Strong Winds**. Explicitly branded as `SYSTEM DETECTION` with confidence scores and physical sensor rationales.
- **Citizen Ground-Truth Verification**: Automated Haversine distance and temporal correlation comparing crowdsourced incident reports against physical station observations (e.g. 18.2 mm/hr rain within 2.3 km = 88% Correlated).
- **Duplicate Detection**: Token Jaccard text similarity and spatio-temporal proximity windows to flag duplicate reports with admin merge support.
- **Zero-Reload Live GIS Interface**: Real-time Server-Sent Events (SSE) stream (`/api/realtime/stream`) pushing live observations, newly verified reports, and alerts directly to an interactive Leaflet map.

---

## 🏛️ System Architecture

```
                  ┌────────────────────────────────────────────────────────┐
                  │                   LIVE DATA INGESTION                  │
                  │   Open-Meteo (Primary) • OpenAQ • OpenWeather • IMD    │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │           VALIDATION & NORMALIZATION PIPELINE          │
                  │   WMO Code Interpretation • Coordinate Verification    │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │            AUTOMATED EVENT DETECTION ENGINE            │
                  │   Heavy Rain • Thunderstorm • Flood • Heatwave • Fog   │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                 POSTGRESQL TIMESERIES                  │
                  │  Observations • Events • Citizen Reports • Audit Logs  │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                        ┌─────────────────────┴─────────────────────┐
                        ▼                                           ▼
         ┌─────────────────────────────┐             ┌─────────────────────────────┐
         │     SERVER-SENT EVENTS      │             │       REST API ENGINE       │
         │     /api/realtime/stream    │             │   /api/weather • /api/reports│
         └──────────────┬──────────────┘             └──────────────┬──────────────┘
                        │                                           │
                        └─────────────────────┬─────────────────────┘
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │              GIS OPERATIONS INTELLIGENCE               │
                  │  Leaflet Tactical Map • KPI Telemetry • Admin Console  │
                  └────────────────────────────────────────────────────────┘
```

---

## 🗺️ Coverage: 51 National Observation Stations

Full geographic representation across all Indian geographic zones:

- **NCR & North**: Delhi (NCT), Noida, Gurugram, Chandigarh, Dehradun, Shimla, Srinagar, Jammu, Leh, Amritsar.
- **Central & UP**: Lucknow, Kanpur, Varanasi, Prayagraj, Agra, Meerut, Bhopal, Indore, Raipur.
- **West**: Mumbai, Pune, Ahmedabad, Surat, Jaipur, Jodhpur, Panaji (Goa), Daman.
- **South**: Bengaluru, Chennai, Hyderabad, Thiruvananthapuram, Kochi, Visakhapatnam, Vijayawada, Coimbatore, Madurai, Puducherry.
- **East**: Kolkata, Patna, Bhubaneswar, Ranchi.
- **North-East (All 8 Sister States)**: Guwahati (Assam), Shillong (Meghalaya), Gangtok (Sikkim), Itanagar (Arunachal Pradesh), Kohima (Nagaland), Imphal (Manipur), Agartala (Tripura), Aizawl (Mizoram).
- **Island UTs**: Port Blair (Andaman & Nicobar), Kavaratti (Lakshadweep).

---

## 🚀 Quick Start

### Prerequisites
- Node.js v20+ or v24+
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/Insane-Sadhin/meteor-in.git
cd meteor-in
npm install
```

### 2. Environment Configuration (Optional)
```bash
cp .env.example .env
```
*Note: Open-Meteo runs out of the box with zero API keys required. OpenAQ and OpenWeather keys can be added optionally.*

### 3. Run the Platform
```bash
# Production server & unified dashboard
npm start

# Development mode (Vite HMR)
npm run dev
```
Open **http://localhost:3001** in your browser.

### 4. Run the 12-Point Automated Compliance Audit
```bash
npm test
```

---

## 🧪 Verification Audit (`npm test`)

The platform includes a built-in automated 12-point operational audit verifying:

1. **Backend Health**: HTTP service startup & `/api/ping`.
2. **Open-Meteo Integration**: Batch coordinates live ingestion.
3. **PostgreSQL Persistence**: Schema tables and records storage.
4. **Dashboard Delivery**: Real-time observations delivery.
5. **Geospatial Integrity**: Real Indian coordinates accuracy.
6. **Timestamp Fidelity**: Strict separation of `observed_at` and `ingested_at`.
7. **System Detection**: Automated classification with explainable rationale.
8. **Ground-Truth Verification**: Geospatial distance and physical correlation.
9. **Duplicate Detection**: Token Jaccard similarity and spatio-temporal proximity.
10. **Data Source Registry**: Real statuses (ONLINE, CONFIG_REQUIRED, NOT_CONNECTED).
11. **Security & Key Isolation**: Complete backend isolation of credentials.
12. **Authentic Telemetry**: Genuine system metrics (memory, latency, database health).

---

## 🛡️ License

This project is licensed under the MIT License.
Developed for real-time national meteorological data intelligence and early warning operations in India.
