// Sahne testi (geliştirme sunucusu gerekir: npm run dev): sorgu paneli, cevaplar ve dövüş mini oyunu.
import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(execSync('npm root -g').toString().trim() + '/playwright'); }
const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || 'test-results';
fs.mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('yk-name', 'Test Reis'));
await page.goto(url);
await page.waitForSelector('#loading', { state: 'detached' });
await page.click('#start .role[data-role="tag"]');
await page.waitForTimeout(1200);
// Tag'ci taksicilere yakalandı: sorgu → (gerekirse) dövüş
page.evaluate(() => { const y = window.__yk; y.G.busy = true; y.G.paused = true; y.tagScenes.tagVsTaxi(2); });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/10-sorgu.png` });
for (let i = 0; i < 40; i++) {
  if (await page.$eval('#comic', (e) => e.hidden)) break;
  const punch = await page.$('.ans.punch');
  if (punch) { for (let k = 0; k < 30; k++) await punch.click().catch(() => {}); await page.screenshot({ path: `${out}/11-dovus.png` }); await page.waitForTimeout(7500); continue; }
  await page.keyboard.press('1');
  await page.waitForTimeout(500);
}
await page.screenshot({ path: `${out}/12-sonuc.png` });
// yolculuk içi olay kartı (kariyer mekaniği): ilk seçeneği seç, panel kapanmalı
await page.evaluate(() => { const y = window.__yk; if (!document.getElementById('comic').hidden) return; y.G.busy = true; y.G.paused = true;
  const p = y.G.pax.find((q) => q.state === 'wait'); y.rideEvents.rideEvent(p); });
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/13-olay-karti.png` });
const olay = await page.$eval('#panel', (e) => e.innerText.replace(/\s+/g, ' '));
console.log('olay kartı: ' + olay.slice(0, 120));
if (!/Yolculukta/.test(olay)) errors.push('olay kartı açılmadı');
await page.keyboard.press('1');
await page.waitForTimeout(500);
await page.keyboard.press('1');
await page.waitForTimeout(800);
if (!(await page.$eval('#comic', (e) => e.hidden))) errors.push('olay kartı kapanmadı');
console.log(errors.length ? 'HATALAR:\n' + errors.join('\n') : 'Konsol hatası yok');
await browser.close();
process.exit(errors.length ? 1 : 0);
