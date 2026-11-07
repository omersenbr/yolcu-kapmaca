// Yolcu Kapmaca — çok oyunculu ilk adım: ortak oturum sunucusu (WebSocket)
//
// Her istemci trafiği (NPC’leri) kendisi simüle eder; sunucu gerçek oyuncuları taşır:
// konum, rol, ekip (taksi durağı / Tag mahallesi), durum (sürüş / sorgu / kavga) ve ekip yardımı.
// Ekip sınırı: bir durakta ya da mahallede en fazla 3 oyuncu.
//
// Kullanım: npm run server            (varsayılan port 8787; PORT ortam değişkeniyle değişir)
// İstemci:  oyunda Profil → “Çevrimiçi (deneme)” → sunucu adresi ws://<bilgisayarın IP’si>:8787
//
// Mesajlar (JSON):
//   istemci → sunucu: hello {ad, rol, ekip}  ·  state {x, y, dir, durum, spr}  ·  help {hedef}
//   sunucu → istemci: welcome {id, oyuncular}  ·  full {ekip}  ·  join/leave {oyuncu}
//                     states {liste}  ·  helped {kimden, ad}  ·  helpOk {hedef}
import { WebSocketServer } from 'ws';

const PORT = +(process.env.PORT || 8787);
const TEAM_MAX = 3; // aynı durak / mahalleden en fazla 3 kişi
const TICK_MS = 100; // durum yayını 10 Hz
const IDLE_MS = 15000; // sessiz kalan bağlantı düşer
const HELP_RANGE = 6; // yardım için en fazla 6 kare

const wss = new WebSocketServer({ port: PORT });
const players = new Map(); // id → { ws, id, ad, rol, ekip, x, y, dir, durum, spr, son }
let nextId = 1;

const send = (ws, m) => ws.readyState === 1 && ws.send(JSON.stringify(m));
const pub = (p) => ({ id: p.id, ad: p.ad, rol: p.rol, ekip: p.ekip, x: p.x, y: p.y, dir: p.dir, durum: p.durum, spr: p.spr });
const teamCount = (rol, ekip) => [...players.values()].filter((p) => p.rol === rol && p.ekip === ekip).length;
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').slice(0, n);

wss.on('connection', (ws) => {
  let me = null;
  ws.on('message', (raw) => {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (m.t === 'hello' && !me) {
      const rol = m.rol === 'tag' ? 'tag' : 'taxi',
        ekip = clean(m.ekip, 40);
      if (teamCount(rol, ekip) >= TEAM_MAX) return send(ws, { t: 'full', ekip });
      me = { ws, id: nextId++, ad: clean(m.ad, 16) || 'Adsız', rol, ekip, x: 0, y: 0, dir: [0, -1], durum: 'surus', spr: '', son: Date.now() };
      players.set(me.id, me);
      send(ws, { t: 'welcome', id: me.id, oyuncular: [...players.values()].filter((p) => p !== me).map(pub) });
      for (const p of players.values()) if (p !== me) send(p.ws, { t: 'join', oyuncu: pub(me) });
      console.log(`+ ${me.ad} (${rol}, ${ekip}) · ${players.size} oyuncu`);
      return;
    }
    if (!me) return;
    me.son = Date.now();
    if (m.t === 'state') {
      if (Number.isFinite(m.x) && Number.isFinite(m.y)) {
        me.x = m.x;
        me.y = m.y;
      }
      if (Array.isArray(m.dir)) me.dir = m.dir.slice(0, 2).map(Number);
      if (['surus', 'sorgu', 'kavga'].includes(m.durum)) me.durum = m.durum;
      me.spr = clean(m.spr, 12);
    } else if (m.t === 'help') {
      // ekip yardımı: yalnızca aynı ekipten, yakındaki ve sorgu/kavgadaki arkadaşa
      const h = players.get(m.hedef);
      if (!h || h === me || h.rol !== me.rol || h.ekip !== me.ekip || h.durum === 'surus') return;
      if (Math.abs(h.x - me.x) + Math.abs(h.y - me.y) > HELP_RANGE) return;
      send(h.ws, { t: 'helped', kimden: me.id, ad: me.ad });
      send(ws, { t: 'helpOk', hedef: h.id });
    }
  });
  ws.on('close', () => {
    if (!me) return;
    players.delete(me.id);
    for (const p of players.values()) send(p.ws, { t: 'leave', id: me.id });
    console.log(`- ${me.ad} · ${players.size} oyuncu`);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const p of players.values()) if (now - p.son > IDLE_MS) p.ws.terminate();
  if (!players.size) return;
  const liste = [...players.values()].map(pub);
  for (const p of players.values()) send(p.ws, { t: 'states', liste });
}, TICK_MS);

console.log(`Yolcu Kapmaca ortak oturum sunucusu: ws://0.0.0.0:${PORT}`);
