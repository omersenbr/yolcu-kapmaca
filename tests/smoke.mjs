// Duman testi: oyunu açar, iki rolü kısa süre oynatır, konsol hatalarını ve ekran görüntülerini toplar.
// Kullanım: node tests/smoke.mjs [url] [çıktı klasörü]   (varsayılan: http://localhost:5173/ , test-results/)
import { createRequire } from 'module';
import { execSync } from 'child_process';
// Playwright projede kurulu değilse genel (global) kurulumdan alınır.
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(execSync('npm root -g').toString().trim() + '/playwright'); }
const { chromium } = pw;
import fs from 'fs';
const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || 'test-results';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.addInitScript(() => { localStorage.setItem('yk-name', 'Test Reis'); });
await page.goto(url);
await page.waitForSelector('#loading', { state: 'detached', timeout: 30000 }).catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/01-menu.png` });
for (const role of ['taxi', 'tag']) {
  await page.click(`#start .role[data-role="${role}"]`);
  await page.waitForTimeout(1500);
  const keys = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
  for (let i = 0; i < 24; i++) {
    // açılan panelleri ilk cevapla geç
    const panelOpen = await page.$eval('#comic', (el) => !el.hidden);
    if (panelOpen) { await page.keyboard.press('1'); await page.waitForTimeout(300); continue; }
    await page.keyboard.press(keys[i % 4]);
    await page.waitForTimeout(450);
  }
  await page.screenshot({ path: `${out}/02-${role}.png` });
  const hud = await page.$eval('.hud', (el) => el.innerText.replace(/\s+/g, ' '));
  console.log(role, 'HUD:', hud);
  // menüye dön
  await page.evaluate(() => { const end = document.getElementById('end'); if (!end.hidden) document.getElementById('swap').click(); });
  await page.click('#menuBtn').catch(() => {});
  await page.click('#menuBtn').catch(() => {});
  await page.waitForTimeout(900);
}
console.log(errors.length ? 'HATALAR:\n' + errors.join('\n') : 'Konsol hatası yok');
await browser.close();
process.exit(errors.length ? 1 : 0);
