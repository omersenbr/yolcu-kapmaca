// Kariyer akışı testi (dev sunucusu açıkken): kariyer ekranı, günlük ödül, vardiya, gün sonu dökümü, araç alma, kalıcı kayıt.
// Kullanım: node tests/career.mjs [url] [çıktı klasörü]
import fs from 'fs';
import { pw, fakeClock } from './lib.mjs';

const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || 'test-results/career';
fs.mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(fakeClock);
await page.addInitScript(() => {
  if (!sessionStorage.getItem('yk-test')) {
    localStorage.clear();
    localStorage.setItem('yk-name', 'Test Reis');
    sessionStorage.setItem('yk-test', '1');
  }
});
await page.goto(url);
await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 30000 });
await page.waitForTimeout(1500);
const check = (cond, msg) => { if (!cond) errors.push('BEKLENTİ: ' + msg); console.log((cond ? '✓ ' : '✗ ') + msg); };

await page.click('#modeSel button[data-m="kariyer"]');
check(await page.$eval('#start .role.tag', (b) => !b.disabled), 'kariyer modunda Tag düğmesi de açık (rol değiştirilebilir)');
await page.click('#start .role[data-role="taxi"]');
await page.waitForTimeout(400);
check(await page.$eval('#sh-career', (e) => !e.hidden), 'kariyer ekranı açıldı');
const kasa0 = await page.$eval('.cstats b', (e) => e.textContent);
check(/₺225/.test(kasa0), `ilk gün ödülü kasada (${kasa0})`);
await page.screenshot({ path: `${out}/01-kariyer.png` });

// vardiya: sanal saatle sonuna kadar oynat (paneller ilk cevapla geçilir)
await page.evaluate(() => window.__fake.start(5));
await page.waitForTimeout(150);
await page.evaluate(() => window.__fake.step(1, 1000));
await page.click('#careerBody button[data-act="taxi:gunduz"]');
const hud = await page.evaluate(() => document.getElementById('time').textContent);
check(hud === '05:00', `vardiya 05:00’te başladı (${hud})`);
const playShift = () => page.evaluate(async () => {
  const F = window.__fake;
  for (let f = 1; f < 20000; f++) {
    if (!document.getElementById('end').hidden) return f;
    const comic = document.getElementById('comic');
    if (!comic.hidden) { if (f % 6 === 0) { const b = document.querySelector('#answers button'); if (b) b.click(); } }
    else if (f % 40 === 0) window.dispatchEvent(new KeyboardEvent('keydown', { key: ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][(f / 40) % 4] }));
    F.step(1, 1000 / 30);
    if (f % 30 === 0) await F.realFrame();
  }
  return -1;
});
const frames = await playShift();
check(frames > 0 && frames < 9000, `vardiya ~4 dakikada bitti (${frames} kare ≈ ${(frames / 30 / 60).toFixed(1)} dk)`);
await page.evaluate(() => window.__fake.step(40, 1000 / 30)); // sayfa çevirme animasyonu bitsin
await page.screenshot({ path: `${out}/02-vardiya-sonu.png` });
const endTxt = await page.$eval('#end .card', (e) => e.innerText.replace(/\s+/g, ' '));
check(/Vardiya bitti/.test(endTxt) && /Vardiya ücreti \/ kira: −₺1\.500/.test(endTxt), 'gün sonu dökümünde çırak vardiya ücreti ₺1.500');
console.log('   ' + endTxt.slice(0, 200));

// kariyere dön, kasaya para koyup araç al, kaydın kalıcılığını dene
await page.click('#swap');
await page.waitForTimeout(400);
check(await page.$eval('#sh-career', (e) => !e.hidden), 'kariyere dönüldü');
await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('yk-kariyer')); c.kasa = 2000000; localStorage.setItem('yk-kariyer', JSON.stringify(c)); });
await page.reload();
await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 30000 });
await page.waitForTimeout(800);
await page.click('#start .role[data-role="taxi"]');
await page.waitForTimeout(400);
await page.click('#careerBody button[data-act="eski"]');
await page.waitForTimeout(300);
const c = await page.evaluate(() => JSON.parse(localStorage.getItem('yk-kariyer')));
check(c.araclar.length === 1 && c.kasa === 1550000 && c.vardiya === 1, `eski taksi alındı ve kayıt kalıcı (araç ${c.araclar.length}, kasa ₺${c.kasa}, vardiya ${c.vardiya})`);
const fee = await page.$eval('#cs-taxi + .csec p', (e) => e.textContent);
check(/Kendi aracın/.test(fee) && /eski/.test(fee), `kendi araçla vardiya ücreti ve eski araç uyarısı (${fee.slice(0, 80)})`);
await page.screenshot({ path: `${out}/03-garaj.png` });

// rol değiştir: aynı kasayla Tag vardiyası (arkadaşının aracı)
await page.evaluate(() => window.__fake.start(9)); // sayfa yenilendi: sanal saati yeniden başlat
await page.waitForTimeout(150);
await page.evaluate(() => window.__fake.step(1, 1000));
await page.click('#careerBody button[data-act="tag:gece"]');
check(await page.evaluate(() => document.getElementById('time').textContent) === '17:00', 'Tag gece vardiyası 17:00’de başladı');
const tagFrames = await playShift();
check(tagFrames > 0, `Tag vardiyası bitti (${tagFrames} kare)`);
if (tagFrames < 0) console.log('   TAKILDI:', JSON.stringify(await page.evaluate(() => { const G = window.__yk.G; return { paused: G.paused, busy: G.busy, over: G.over, time: G.time, cine: !!G.cine, comic: !document.getElementById('comic').hidden, adOv: !document.getElementById('adOv').hidden, answers: [...document.querySelectorAll('#answers button')].map((b) => b.textContent), bubble: document.getElementById('bubble').textContent.slice(0, 80), cast: document.getElementById('cast').textContent.slice(0, 60) }; })));
await page.evaluate(() => window.__fake.step(40, 1000 / 30));
const tagEnd = await page.$eval('#end .card', (e) => e.innerText.replace(/\s+/g, ' '));
console.log('   ' + tagEnd.slice(0, 220));
{
  // pay ve komisyon pozitif kazançtan alınır; kazanç yoksa (zarar ya da bağlanma) satır çıkmaz
  const brutTxt = (tagEnd.match(/Vardiya kazancı: (−?)₺([\d.]+)/) || []).slice(1);
  const brut = brutTxt.length ? (brutTxt[0] ? -1 : 1) * +brutTxt[1].replace(/\./g, '') : 0;
  const ok = brut > 0 ? /Arkadaş payı/.test(tagEnd) && /Tag komisyonu/.test(tagEnd) : !/Arkadaş payı/.test(tagEnd) && (!/bağlandı/.test(tagEnd) || /Ceza: −₺90\.000/.test(tagEnd));
  check(ok, `Tag dökümü: kazanç ₺${brut} → ${brut > 0 ? 'arkadaş payı + Tag komisyonu' : 'pay yok'}${/bağlandı/.test(tagEnd) ? ', araç bağlandı (₺90 bin ceza)' : ''}`);
}
await page.screenshot({ path: `${out}/04-tag-sonu.png` });
await page.click('#swap');
await page.waitForTimeout(400);
const c2 = await page.evaluate(() => JSON.parse(localStorage.getItem('yk-kariyer')));
check(c2.vardiya === 2 && c2.gun === 1 && c2.son.rol === 'tag', `ortak takvim: 2 vardiya = 1 gün (vardiya ${c2.vardiya}, gün ${c2.gun})`);
check(Array.isArray(c2.tag.mahalle), 'Tag mahallesi kaydedildi');
await page.click('#careerBody button[data-act="buyTag:0"]');
await page.waitForTimeout(300);
const tagTxt = await page.$eval('#cs-tag', (e) => e.parentElement.innerText);
check(/Kendi aracın \(emektar bir hatchback\)/.test(tagTxt) && /benzin ×1,6/.test(tagTxt), 'Tag aracı alındı: arkadaş payı yok, eski araç çok yakar');
await page.evaluate(() => document.getElementById('cs-tag').scrollIntoView());
await page.screenshot({ path: `${out}/05-tag-garaj.png` });

console.log(errors.length ? '\nHATALAR:\n' + errors.join('\n') : '\nKariyer testi geçti');
await browser.close();
process.exit(errors.length ? 1 : 0);
