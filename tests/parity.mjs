// Prototiple eşitlik testi: prototip ve yeni sürüm aynı rastgelelik tohumu, aynı sanal saat
// ve aynı tuş dizisiyle oynatılır; belirli karelerde bilgi şeridi (HUD) ve harita görüntüsü karşılaştırılır.
//
// Kullanım (dev sunucusu açıkken):
//   node tests/parity.mjs [--frames 3000] [--every 150] [--seed 12345] [--roles taxi,tag] [--out test-results/parity]
//
// Nasıl çalışır: sayfaya enjekte edilen sahte saat requestAnimationFrame, setTimeout/setInterval ve
// performance.now’u sanal zamana bağlar; Math.random tohumlu bir üreteçle değiştirilir. Böylece iki sürüm
// aynı mantığı aynı sırayla çalıştırırsa bire bir aynı kareyi üretmek zorundadır.
import fs from 'fs';
import path from 'path';
import { pw, fakeClock } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FRAMES = +arg('frames', 3000), EVERY = +arg('every', 150), SEED = +arg('seed', 12345);
const ROLES = arg('roles', 'taxi,tag').split(',');
const OUT = arg('out', 'test-results/parity');
const NEW_URL = arg('url', 'http://localhost:5173/');
// Prototipin iç durumuna erişmek için test klasörüne kancalı bir kopyası yazılır (asıl dosyaya dokunulmaz).
fs.mkdirSync(OUT, { recursive: true });
const PROTO_COPY = path.resolve(OUT, 'prototip-kancali.html');
{
  const src = fs.readFileSync('prototip/yolcu-kapmaca.html', 'utf8');
  const hook = 'let G=null,want=null,wantT=-9,uid=0;';
  if (!src.includes(hook)) throw new Error('Prototipte kanca noktası bulunamadı');
  fs.writeFileSync(PROTO_COPY, src.replace(hook, hook + 'window.__yk={get G(){return G;}};'));
}
const PROTO_URL = 'file://' + PROTO_COPY;
const DT = 1000 / 30; // sanal kare süresi (ms)

/* her iki sayfada aynı sırayla uygulanan girdi: panel açıksa “1”, değilse belirli karelerde yön tuşu */
const KEYS = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'];
async function inputFor(page, f) {
  const panel = await page.$eval('#comic', (e) => !e.hidden);
  if (panel) { if (f % 6 === 0) await page.keyboard.press('1'); return; }
  if (f % 40 === 0) await page.keyboard.press(KEYS[(f / 40) % KEYS.length]);
  if (f % 400 === 200) await page.keyboard.press('n'); // ara sıra nitro
}
// bilinçli fark: yeni sürümde emoji yok (stil kuralı); karşılaştırmada emojiler yok sayılır
const noEmoji = (x) => x.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]\uFE0F?\s?/gu, '');
const snapRaw = (page) => page.evaluate(() => ({
  hud: document.querySelector('.hud').innerText.replace(/\s+/g, ' ').trim(),
  panel: document.getElementById('comic').hidden ? '' : document.getElementById('panel').innerText.replace(/\s+/g, ' ').trim().slice(0, 160),
  end: document.getElementById('end').hidden ? '' : document.getElementById('endTitle').textContent,
  img: document.getElementById('cv').toDataURL('image/png'),
}));
const snap = async (page) => { const x = await snapRaw(page); x.hud = noEmoji(x.hud); x.panel = noEmoji(x.panel); return x; };

/* oyun durumunun özeti: kare kare karşılaştırılır, ilk ayrışma ayrıntılı raporlanır */
const digest = (page) => page.evaluate(() => {
  const G = window.__yk && window.__yk.G;
  if (!G) return null;
  const r = (v) => Math.round(v * 1000) / 1000;
  return {
    rng: window.__fake.n, clock: r(G.clock), time: r(G.time), money: G.money, pax: G.pax.length,
    player: [r(G.player.x), r(G.player.y), G.player.dir && G.player.dir.join(','), G.player.carry && G.player.carry.look.name],
    ents: G.ents.map((e) => [e.kind, r(e.x), r(e.y), e.dir ? e.dir.join(',') : '-', e.chase ? 1 : 0, e.spr || '']),
  };
});
function compareDigest(a, b) {
  if (!a || !b) return a === b ? null : 'durum yok';
  for (const k of ['rng', 'clock', 'time', 'money', 'pax']) if (a[k] !== b[k]) return `${k}: prototip ${a[k]} / yeni ${b[k]}`;
  if (JSON.stringify(a.player) !== JSON.stringify(b.player)) return `oyuncu: ${JSON.stringify(a.player)} / ${JSON.stringify(b.player)}`;
  if (a.ents.length !== b.ents.length) return `araç sayısı ${a.ents.length} / ${b.ents.length}`;
  for (let i = 0; i < a.ents.length; i++) if (JSON.stringify(a.ents[i]) !== JSON.stringify(b.ents[i])) return `araç #${i}: ${JSON.stringify(a.ents[i])} / ${JSON.stringify(b.ents[i])}`;
  return null;
}

const browser = await pw.chromium.launch();
const mk = async (url) => {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  await p.addInitScript(fakeClock);
  await p.addInitScript(() => { localStorage.setItem('yk-name', 'Test Reis'); localStorage.setItem('yk-diff', 'orta'); localStorage.setItem('yk-serbest', '0'); localStorage.setItem('yk-ses', '0'); });
  await p.goto(url);
  await p.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 30000 });
  await p.waitForTimeout(2500); // görseller ve yazı tipleri otursun
  return p;
};
const report = { seed: SEED, frames: FRAMES, roles: {} };
fs.mkdirSync(OUT, { recursive: true });

for (const role of ROLES) {
  const pages = { proto: await mk(PROTO_URL), yeni: await mk(NEW_URL) };
  for (const p of Object.values(pages)) {
    await p.evaluate((sd) => window.__fake.start(sd), SEED);
    await p.waitForTimeout(150); // gerçek rAF’taki son kare sanal kuyruğa geçsin
    await p.evaluate(() => window.__fake.step(1, 1000)); // ilk kare dt’sini sabitle
    await p.evaluate((sd) => window.__fake.reseed(sd), SEED);
    await p.click(`#start .role[data-role="${role}"]`);
  }
  const rows = [];
  let firstDiff = null, firstStateDiff = null;
  for (let f = 1; f <= FRAMES; f++) {
    for (const p of Object.values(pages)) { await inputFor(p, f); await p.evaluate((d) => window.__fake.step(1, d), DT); }
    if (!firstStateDiff) {
      const why = compareDigest(await digest(pages.proto), await digest(pages.yeni));
      if (why) { firstStateDiff = { f, why }; console.log(`${role}: durum ilk kez kare ${f}'de ayrıştı -> ${why}`); }
    }
    if (f % EVERY === 0 || f === FRAMES) {
      const a = await snap(pages.proto), b = await snap(pages.yeni);
      const same = a.hud === b.hud && a.panel === b.panel && a.end === b.end;
      const base = `${OUT}/${role}-${String(f).padStart(5, '0')}`;
      fs.writeFileSync(base + '-proto.png', Buffer.from(a.img.split(',')[1], 'base64'));
      fs.writeFileSync(base + '-yeni.png', Buffer.from(b.img.split(',')[1], 'base64'));
      rows.push({ f, same, proto: a.hud, yeni: b.hud, panelProto: a.panel, panelYeni: b.panel });
      if (!same && !firstDiff) firstDiff = f;
      console.log(`${role} kare ${f}: ${same ? 'aynı' : 'FARKLI'} | prototip: ${a.hud}${a.panel ? ' | panel: ' + a.panel.slice(0, 60) : ''}${same ? '' : '\n' + ' '.repeat(role.length + 12) + 'yeni:     ' + b.hud + (b.panel ? ' | panel: ' + b.panel.slice(0, 60) : '')}`);
      if (a.end || b.end) break;
    }
  }
  report.roles[role] = { firstDiff, firstStateDiff, rows, errors: { proto: pages.proto.errors, yeni: pages.yeni.errors } };
  for (const p of Object.values(pages)) await p.close();
}
fs.writeFileSync(`${OUT}/rapor.json`, JSON.stringify(report, null, 1));
await browser.close();
const bad = Object.values(report.roles).some((r) => r.firstDiff || r.firstStateDiff || r.errors.yeni.length);
console.log(bad ? 'SONUÇ: fark var (ayrıntı rapor.json)' : 'SONUÇ: oyun durumu her karede, bilgi şeridi ve paneller bütün kontrol karelerinde aynı');
process.exit(bad ? 1 : 0);
