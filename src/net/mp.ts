/* ================= ÇOK OYUNCULU İSTEMCİ (ilk adım: ortak oturum) =================
   Sunucu: server/index.mjs. Her istemci trafiği kendisi simüle eder; burada yalnızca gerçek oyuncular
   (konum, rol, ekip, durum) gönderilip alınır. Ekip: kariyerdeki taksi durağı ya da Tag mahallesi.
   Sorgudaki arkadaş haritada donar ve simgeyle görünür; kavgadakinin üstünde duman ve “PAT! KÜT!”.
   Aynı ekipten yakındaki biri “Yardıma git” ile kavgaya müttefik olarak katılır. */
import { $ } from '../core/dom';
import { DLG, ECO } from '../sim/content';
import { G } from '../sim/state';
import { load, save } from '../sim/storage';
import { T } from '../sim/util';
import { toast } from '../ui/hud';

export interface Remote {
  id: number;
  ad: string;
  rol: 'taxi' | 'tag';
  ekip: string;
  x: number;
  y: number;
  dir: [number, number];
  durum: 'surus' | 'sorgu' | 'kavga';
  spr: string;
  /** ekranda yumuşak hareket için çizim konumu */
  dx: number;
  dy: number;
}

const M = () => DLG.cokOyunculu;
export const remotes = new Map<number, Remote>();
let ws: WebSocket | null = null,
  myId = 0,
  sendIv = 0,
  helpIv = 0,
  offered = 0;

export const mpEnabled = () => load('yk-mp', '0') === '1';
export const mpUrl = () => load('yk-mp-url', '') || `ws://${location.hostname || 'localhost'}:${ECO.cokOyunculu.port}`;
export function setMp(on: boolean, url?: string) {
  save('yk-mp', on ? '1' : '0');
  if (url !== undefined) save('yk-mp-url', url.trim());
}
export const mpConnected = () => !!ws && ws.readyState === 1;

/** oyuncunun o anki durumu: karikatür paneli açıksa sorgu ya da kavga */
function myStatus(): Remote['durum'] {
  if ($('comic').hidden) return 'surus';
  return $('panel').classList.contains('fight') ? 'kavga' : 'sorgu';
}

/** vardiya başında bağlan (kariyer): ekip = durak ya da mahalle */
export function mpStart(ad: string) {
  mpStop();
  if (!mpEnabled() || !G || !G.career) return;
  const rol = G.role,
    ekip = rol === 'taxi' ? G.stand && G.stand.name : G.home && G.home.name;
  try {
    ws = new WebSocket(mpUrl());
  } catch (e) {
    toast(M().baglanamadi, true);
    return;
  }
  ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', ad, rol, ekip }));
  ws.onerror = () => toast(M().baglanamadi, true);
  ws.onclose = () => {
    remotes.clear();
    clearInterval(sendIv);
    clearInterval(helpIv);
  };
  ws.onmessage = (ev) => onMsg(JSON.parse(ev.data));
  sendIv = window.setInterval(sendState, 1000 / ECO.cokOyunculu.gonderimHz);
  helpIv = window.setInterval(checkHelp, 500);
}
export function mpStop() {
  if (ws) {
    ws.onclose = null;
    ws.close();
  }
  ws = null;
  remotes.clear();
  clearInterval(sendIv);
  clearInterval(helpIv);
  $('mpHelp').hidden = true;
}

function sendState() {
  if (!mpConnected() || !G || G.over) return;
  const P = G.player;
  ws.send(JSON.stringify({ t: 'state', x: P.x, y: P.y, dir: P.dir || [0, -1], durum: myStatus(), spr: P.spr || '' }));
}

function onMsg(m) {
  const s = M();
  if (m.t === 'welcome') {
    myId = m.id;
    remotes.clear();
    for (const o of m.oyuncular) upsert(o);
    toast(T(s.baglandi, { n: m.oyuncular.length }));
  } else if (m.t === 'full') toast(T(s.ekipDolu, { ekip: m.ekip }), true);
  else if (m.t === 'join') {
    upsert(m.oyuncu);
    toast(T(s.katildi, { ad: m.oyuncu.ad, ekip: m.oyuncu.ekip }));
  } else if (m.t === 'leave') remotes.delete(m.id);
  else if (m.t === 'states') for (const o of m.liste) if (o.id !== myId) upsert(o);
  else if (m.t === 'helped') {
    // bir arkadaş yardıma geldi: kavgada müttefik olur
    if (G) G.mpAlly = m.ad;
    toast(T(s.yardimaGeldi, { ad: m.ad }));
  } else if (m.t === 'helpOk') toast(s.yardimaGittin);
}
function upsert(o) {
  const r = remotes.get(o.id);
  if (r) Object.assign(r, o);
  else remotes.set(o.id, { ...o, dx: o.x, dy: o.y });
}

/** yakında sorgu ya da kavgadaki ekip arkadaşı var mı: “Yardıma git” düğmesi */
function checkHelp() {
  const b = $('mpHelp');
  if (!G || G.over || G.busy || !mpConnected()) {
    b.hidden = true;
    return;
  }
  const P = G.player,
    ekip = G.role === 'taxi' ? G.stand && G.stand.name : G.home && G.home.name;
  const f = [...remotes.values()].find(
    (r) => r.rol === G.role && r.ekip === ekip && r.durum !== 'surus' && Math.abs(r.x - P.x) + Math.abs(r.y - P.y) <= ECO.cokOyunculu.yardimMesafe,
  );
  if (!f) {
    b.hidden = true;
    offered = 0;
    return;
  }
  if (offered !== f.id) {
    offered = f.id;
    b.textContent = T(M().yardimDugme, { ad: f.ad });
    b.dataset.id = String(f.id);
    b.hidden = false;
  }
}
export function initMp() {
  $('mpHelp').addEventListener('click', () => {
    const b = $('mpHelp');
    if (mpConnected()) ws.send(JSON.stringify({ t: 'help', hedef: +b.dataset.id }));
    b.hidden = true;
  });
}
/** çizim: uzak oyuncuların konumunu yumuşat */
export function smoothRemotes(dt: number) {
  const k = Math.min(1, dt * 10);
  for (const r of remotes.values()) {
    r.dx += (r.x - r.dx) * k;
    r.dy += (r.y - r.dy) * k;
  }
}
