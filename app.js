'use strict';

const CAROUSEL_CITIES = [
  'Yaoundé',
  'Douala',
  'Paris',
  'New York',
  'Tokyo',
  'Le Caire',
  'Nairobi',
  'Berlin',
  'Montréal',
  'Dakar',
  'Sydney',
  'Mumbai',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function themeFromWeather(data) {
  if (!data) return 'neutral';
  const main = (data.raw_main || data.main || '').toLowerCase();
  const id = data.weather_id ?? 0;
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'fog';
  if (main === 'clear') return 'clear';
  if (main === 'clouds') return 'clouds';
  return 'neutral';
}

const jokeTemplates = [
  (c, d) =>
    `À ${c}, avec ${d.temp} °C, même le café refuse de chauffer — il est déjà à température ambiante.`,
  (c, d) =>
    `Si ${c} était une série, l'épisode du jour s'appellerait : « ${d.description} » · suspense garanti.`,
  (c, d) =>
    `Astuce styliste : à ${c}, le vent à ${d.wind_kmh} km/h décide de ta coiffure avant toi.`,
  (c, d) =>
    `À ${c}, l'humidité à ${d.humidity} % · parfait pour jouer à « devine si c'est de la sueur ou de la pluie ».`,
  (c, d) =>
    `Météo philosophique : ${c} te rappelle que ${d.description} — et que le parapluie est un accessoire de caractère.`,
];

function randomJoke(city, data) {
  const fn = jokeTemplates[Math.floor(Math.random() * jokeTemplates.length)];
  return fn(city, data);
}

const els = {
  carousel: document.getElementById('carousel'),
  detail: document.getElementById('detail'),
  activeCityLabel: document.getElementById('active-city-label'),
  bgLayer: document.getElementById('bg-layer'),
  jokeBanner: document.getElementById('joke-banner'),
  jokeText: document.getElementById('joke-text'),
  toastHost: document.getElementById('toast-host'),
  fabChat: document.getElementById('fab-chat'),
  fabGeo: document.getElementById('fab-geo'),
  chatBackdrop: document.getElementById('chat-backdrop'),
  chatPanel: document.getElementById('chat-panel'),
  chatClose: document.getElementById('chat-close'),
  chatMessages: document.getElementById('chat-messages'),
  chatForm: document.getElementById('chat-form'),
  chatCity: document.getElementById('chat-city'),
  chatMsg: document.getElementById('chat-msg'),
};

const state = {
  order: shuffle(CAROUSEL_CITIES),
  byCity: new Map(),
  activeIndex: 0,
  rotateTimer: null,
  jokeTimer: null,
  wikiCache: new Map(),
};

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error || res.statusText || 'Erreur réseau';
    throw new Error(msg);
  }
  return body;
}

async function loadWeather(city) {
  return fetchJson(`/api/weather?q=${encodeURIComponent(city)}`);
}

async function loadWeatherGeo(lat, lon) {
  return fetchJson(`/api/weather/geo?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
}

function showToast(text, ttl = 4200) {
  els.toastHost.textContent = '';
  const n = document.createElement('div');
  n.className = 'toast';
  n.textContent = text;
  els.toastHost.appendChild(n);
  setTimeout(() => {
    n.remove();
  }, ttl);
}

function applyVisualTheme(data) {
  const t = themeFromWeather(data);
  document.body.dataset.theme = t;
}

async function fetchCityBackground(city) {
  if (state.wikiCache.has(city)) return state.wikiCache.get(city);
  const urls = [
    `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(city)}&prop=pageimages&format=json&origin=*&pithumbsize=1600`,
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(city)}&prop=pageimages&format=json&origin=*&pithumbsize=1600`,
  ];
  let thumb = null;
  for (const u of urls) {
    try {
      const res = await fetch(u);
      const data = await res.json();
      const pages = data.query?.pages;
      if (!pages) continue;
      const page = Object.values(pages)[0];
      if (page && page.thumbnail && page.thumbnail.source) {
        thumb = page.thumbnail.source;
        break;
      }
    } catch {
      /* ignore */
    }
  }
  state.wikiCache.set(city, thumb);
  return thumb;
}

async function updateBackgroundForCity(city, data) {
  const thumb = await fetchCityBackground(city);
  if (thumb) {
    els.bgLayer.style.backgroundImage = `url("${thumb}")`;
  } else {
    els.bgLayer.style.backgroundImage = '';
    els.bgLayer.style.background = 'linear-gradient(160deg, rgba(15,23,42,0.9), rgba(30,41,59,0.95))';
  }
  applyVisualTheme(data);
}

function renderCarousel() {
  els.carousel.textContent = '';
  state.order.forEach((city, idx) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `city-chip${idx === state.activeIndex ? ' active' : ''}`;
    chip.dataset.city = city;

    const label = document.createElement('span');
    label.className = 'chip-city';
    label.textContent = city;

    const meta = document.createElement('span');
    meta.className = 'chip-meta';

    const entry = state.byCity.get(city);
    if (entry?.loading) {
      meta.textContent = '…';
    } else if (entry?.error) {
      meta.textContent = 'Erreur';
      const err = document.createElement('span');
      err.className = 'chip-error';
      err.textContent = entry.error;
      chip.appendChild(label);
      chip.appendChild(meta);
      chip.appendChild(err);
      chip.addEventListener('click', () => {
        state.activeIndex = idx;
        refreshCarouselActive();
        renderDetail();
      });
      els.carousel.appendChild(chip);
      return;
    } else if (entry?.data) {
      meta.textContent = `${Math.round(entry.data.temp)} °C · ${entry.data.description}`;
    } else {
      meta.textContent = '—';
    }

    chip.appendChild(label);
    chip.appendChild(meta);
    chip.addEventListener('click', () => {
      state.activeIndex = idx;
      refreshCarouselActive();
      renderDetail();
    });
    els.carousel.appendChild(chip);
  });

  const activeChip = els.carousel.children[state.activeIndex];
  if (activeChip) {
    activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function refreshCarouselActive() {
  [...els.carousel.querySelectorAll('.city-chip')].forEach((el, idx) => {
    el.classList.toggle('active', idx === state.activeIndex);
  });
}

function renderDetail() {
  const city = state.order[state.activeIndex];
  els.activeCityLabel.textContent = city || '—';
  const entry = state.byCity.get(city);

  if (!entry || entry.loading) {
    els.detail.innerHTML = '<p class="loading-msg">Chargement de la météo…</p>';
    return;
  }
  if (entry.error) {
    els.detail.innerHTML = `<p class="error-msg">${entry.error}</p>`;
    return;
  }

  const d = entry.data;
  const iconUrl = `https://openweathermap.org/img/wn/${d.icon}@4x.png`;

  els.detail.innerHTML = `
    <div class="detail-top">
      <img class="detail-icon" src="${iconUrl}" alt="" width="96" height="96" />
      <div class="detail-main">
        <h3>${Math.round(d.temp)}°C</h3>
        <p class="desc">${d.description}</p>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><strong>Ressenti</strong>${Math.round(d.feels_like)} °C</div>
      <div class="stat"><strong>Humidité</strong>${d.humidity} %</div>
      <div class="stat"><strong>Vent</strong>${d.wind_kmh} km/h</div>
      <div class="stat"><strong>Pression</strong>${d.pressure} hPa</div>
    </div>
    <ul class="advice-list">
      ${d.advice.map((a) => `<li>${a}</li>`).join('')}
    </ul>
  `;

  updateBackgroundForCity(city, d);
}

async function bootstrapCity(city) {
  state.byCity.set(city, { loading: true });
  renderCarousel();
  try {
    const data = await loadWeather(city);
    state.byCity.set(city, { data });
  } catch (e) {
    state.byCity.set(city, { error: e.message || 'Impossible de charger la météo.' });
  }
  renderCarousel();
  if (city === state.order[state.activeIndex]) {
    renderDetail();
  }
}

async function loadAll() {
  els.detail.innerHTML = '<p class="loading-msg">Chargement des villes…</p>';
  await Promise.all(state.order.map((c) => bootstrapCity(c)));
  renderDetail();
  scheduleJokes();
}

function scheduleRotation() {
  if (state.rotateTimer) clearInterval(state.rotateTimer);
  state.rotateTimer = setInterval(() => {
    state.activeIndex = (state.activeIndex + 1) % state.order.length;
    refreshCarouselActive();
    renderDetail();
    const activeChip = els.carousel.children[state.activeIndex];
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, 9000);
}

function scheduleJokes() {
  if (state.jokeTimer) clearInterval(state.jokeTimer);
  const tick = () => {
    const city = state.order[state.activeIndex];
    const entry = state.byCity.get(city);
    if (!entry?.data) return;
    els.jokeText.textContent = randomJoke(city, entry.data);
    els.jokeBanner.hidden = false;
  };
  tick();
  state.jokeTimer = setInterval(tick, 26000 + Math.random() * 14000);
}

function openChat() {
  els.chatBackdrop.hidden = false;
  els.chatPanel.hidden = false;
  els.chatCity.focus();
}

function closeChat() {
  els.chatBackdrop.hidden = true;
  els.chatPanel.hidden = true;
}

function appendBubble(role, html) {
  const wrap = document.createElement('div');
  wrap.className = `bubble ${role}`;
  wrap.innerHTML = html;
  els.chatMessages.appendChild(wrap);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

els.fabChat.addEventListener('click', openChat);
els.chatClose.addEventListener('click', closeChat);
els.chatBackdrop.addEventListener('click', closeChat);

els.chatForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const city = els.chatCity.value.trim();
  const message = els.chatMsg.value.trim();
  if (!city && !message) return;

  const userLine = city && message ? `${city} — ${message}` : city || message;
  appendBubble('user', escapeHtml(userLine));

  try {
    const body = await fetchJson('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, message }),
    });
    const img = body.imageUrl
      ? `<img class="weather-chat-img" src="${body.imageUrl}" alt="" width="96" height="96" />`
      : '';
    appendBubble('bot', `<div>${escapeHtml(body.reply)}</div>${img}`);
  } catch (e) {
    appendBubble('bot', `<div>${escapeHtml(e.message)}</div>`);
  }

  els.chatCity.value = '';
  els.chatMsg.value = '';
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

els.fabGeo.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('La géolocalisation n’est pas disponible sur ce navigateur.');
    return;
  }
  showToast('Localisation en cours…', 2500);
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const data = await loadWeatherGeo(pos.coords.latitude, pos.coords.longitude);
        showToast(`Position : ${data.city} (${Math.round(data.temp)} °C)`);
        const name = data.city;
        if (!state.order.includes(name)) {
          state.order.unshift(name);
          state.activeIndex = 0;
        } else {
          state.activeIndex = state.order.indexOf(name);
        }
        state.byCity.set(name, { data });
        renderCarousel();
        renderDetail();
      } catch (e) {
        showToast(e.message || 'Erreur météo pour ta position.');
      }
    },
    () => showToast('Impossible d’obtenir ta position (permission refusée ?).'),
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 },
  );
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') closeChat();
});

loadAll().then(() => {
  scheduleRotation();
});
