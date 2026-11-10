// Client-side access to the Radio Browser API and local favorites storage.
// Runs entirely in the app (browser, Android APK, Windows EXE) without the
// FastAPI/MongoDB backend, so the packaged apps work standalone.

const SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
];

const FAVORITES_KEY = "radioweb.favorites";

const toStation = (s) => ({
  id: s.stationuuid || "",
  name: (s.name || "Unknown Station").trim(),
  url: s.url_resolved || s.url || "",
  homepage: s.homepage || "",
  favicon: s.favicon || "",
  country: s.country || "",
  language: s.language || "",
  tags: s.tags || "",
  votes: s.votes || 0,
});

const request = async (path) => {
  let lastError;
  for (const server of SERVERS) {
    try {
      const res = await fetch(`${server}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.map(toStation).filter((s) => s.id && s.url);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};

export const getPopularStations = (limit = 100) =>
  request(`/json/stations/topvote/${limit}?hidebroken=true`);

export const searchStations = (query, limit = 50) =>
  request(
    `/json/stations/search?name=${encodeURIComponent(query)}` +
      `&limit=${limit}&hidebroken=true&order=votes&reverse=true`
  );

export const loadFavorites = () => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveFavorites = (favorites) => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // storage unavailable: favorites stay in memory for this session
  }
};
