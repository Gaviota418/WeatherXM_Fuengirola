/* Service worker Buitenweer Fuengirola: app opent ook zonder netwerk.
   De weerdata zelf wordt NIET hier bewaard (dat doet de app: laatste data in het geheugen van de app). */
const VERSIE = "bw-1";
const BASIS = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icoon-180.png", "./icoon-192.png", "./icoon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSIE).then(c => c.addAll(BASIS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSIE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* weerdata, kaarttegels, radar en satelliet: altijd rechtstreeks van het net */
  if (url.hostname.indexOf("google") >= 0 && url.hostname.indexOf("fonts") < 0) return;
  if (url.hostname.indexOf("googleusercontent") >= 0) return;

  /* eigen bestanden: eerst het net (nieuwste versie), anders de bewaarde kopie */
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const k = r.clone(); caches.open(VERSIE).then(c => c.put(req, k)); }
      return r;
    }).catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
    return;
  }

  /* lettertypes en Leaflet: bewaarde kopie, op de achtergrond bijwerken */
  if (/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com/.test(url.hostname)) {
    e.respondWith(caches.open(VERSIE + "-lib").then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
