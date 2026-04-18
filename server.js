"use strict";

require("dotenv").config();
const express = require("express");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const OW_KEY = process.env.OPENWEATHER_API_KEY;

const app = express();
app.use(express.json());

function msToKmh(ms) {
  return Math.round(ms * 3.6 * 10) / 10;
}

function buildAdvice(payload) {
  const main = (payload.weather?.[0]?.main || "").toLowerCase();
  const desc = (payload.weather?.[0]?.description || "").toLowerCase();
  const id = payload.weather?.[0]?.id || 0;
  const temp = payload.main?.temp ?? 0;
  const windMs = payload.wind?.speed ?? 0;
  const windKmh = msToKmh(windMs);

  const tips = [];

  const rainLike =
    main.includes('rain') ||
    main.includes('drizzle') ||
    main.includes('thunderstorm') ||
    (id >= 200 && id < 600);
  if (rainLike) {
    tips.push('Prends ton parapluie, il va pleuvoir — ou au minimum un coupe-vent.');
  }

  if (temp > 35) {
    tips.push('Forte chaleur — hydrate-toi et évite le soleil entre 12h et 15h.');
  } else if (temp < 15) {
    tips.push('Il fait frais — prévois une veste ou une couche en plus.');
  }

  if (windKmh > 50) {
    tips.push('Vent fort — fais attention en extérieur et évite les zones très dégagées.');
  }

  if (
    main === "clear" ||
    id === 800 ||
    desc.includes('dégagé') ||
    desc.includes('clear')
  ) {
    tips.push('Belle journée, profites-en !');
  }

  const fogLike =
    main.includes('mist') ||
    main.includes('fog') ||
    main.includes('haze') ||
    (id >= 701 && id <= 762);
  if (fogLike) {
    tips.push('Visibilité réduite — sois prudent sur la route.');
  }

  if (tips.length === 0) {
    tips.push('Conditions changeantes — garde une couche légère à portée de main.');
  }

  return [...new Set(tips)];
}

function normalizeWeatherResponse(payload) {
  const w = payload.weather?.[0];
  const windKmh = msToKmh(payload.wind?.speed ?? 0);
  const advice = buildAdvice(payload);
  return {
    city: payload.name,
    country: payload.sys?.country || '',
    temp: payload.main?.temp,
    feels_like: payload.main?.feels_like,
    humidity: payload.main?.humidity,
    pressure: payload.main?.pressure,
    wind_ms: payload.wind?.speed,
    wind_kmh: windKmh,
    description: w?.description || '',
    main: w?.main || '',
    weather_id: w?.id,
    icon: w?.icon || '02d',
    coord: payload.coord,
    advice,
    raw_main: w?.main,
  };
}

async function fetchOpenWeather(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.cod || `HTTP ${res.status}`;
    const err = new Error(typeof msg === 'string' ? msg : 'Erreur API météo');
    err.status = res.status === 404 ? 404 : 502;
    throw err;
  }
  return data;
}

function requireApiKey(res) {
  if (!OW_KEY || OW_KEY === 'votre_cle_api_ici') {
    res.status(503).json({
      error:
        'Clé OpenWeatherMap manquante. Copiez .env.example vers .env et renseignez OPENWEATHER_API_KEY.',
    });
    return false;
  }
  return true;
}

app.get('/api/weather', async (req, res) => {
  if (!requireApiKey(res)) return;
  const q = (req.query.q || '').trim();
  if (!q) {
    res.status(400).json({ error: 'Paramètre q (ville) requis.' });
    return;
  }
  const lang = req.query.lang === 'en' ? 'en' : 'fr';
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&appid=${OW_KEY}&units=metric&lang=${lang}`;
  try {
    const data = await fetchOpenWeather(url);
    res.json(normalizeWeatherResponse(data));
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message || 'Impossible de récupérer la météo.' });
  }
});

app.get('/api/weather/geo', async (req, res) => {
  if (!requireApiKey(res)) return;
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    res.status(400).json({ error: 'lat et lon valides requis.' });
    return;
  }
  const lang = req.query.lang === 'en' ? 'en' : 'fr';
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OW_KEY}&units=metric&lang=${lang}`;
  try {
    const data = await fetchOpenWeather(url);
    res.json(normalizeWeatherResponse(data));
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message || 'Impossible de récupérer la météo.' });
  }
});

function extractCityFromMessage(text) {
  const t = (text || '').trim();
  const patterns = [
    /(?:météo|meteo|weather)\s+(?:à|a|pour|de|in|at)\s+(.+)/i,
    /(?:à|a|pour|in|at)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-]{1,80})/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return '';
}

app.post('/api/chat', async (req, res) => {
  if (!requireApiKey(res)) return;
  const cityDirect = (req.body?.city || '').trim();
  const message = (req.body?.message || '').trim();
  const city = cityDirect || extractCityFromMessage(message);
  if (!city) {
    res.status(400).json({
      error:
        'Indique une ville (champ ville) ou une phrase du type « météo à Yaoundé ».',
    });
    return;
  }
  const lang = req.body?.lang === 'en' ? 'en' : 'fr';
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OW_KEY}&units=metric&lang=${lang}`;
  try {
    const data = await fetchOpenWeather(url);
    const n = normalizeWeatherResponse(data);
    const summary =
      lang === 'en'
        ? `${n.city}: ${n.temp}°C, ${n.description}. Wind ${n.wind_kmh} km/h, humidity ${n.humidity}%.`
        : `${n.city} : ${n.temp} °C, ${n.description}. Vent ${n.wind_kmh} km/h, humidité ${n.humidity} %.`;
    const reply =
      lang === 'en'
        ? `Here's what I found — ${summary} Tips: ${n.advice.join(' ')}`
        : `Voici ce que je peux te dire — ${summary} Conseils : ${n.advice.join(' ')}`;
    const imageUrl = `https://openweathermap.org/img/wn/${n.icon}@4x.png`;
    res.json({
      ...n,
      reply,
      imageUrl,
    });
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message || 'Impossible de récupérer la météo.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`WeatherBot → http://localhost:${PORT}`);
});
