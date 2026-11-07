// Serbest konuşma testi (dev sunucusu açıkken): polis sorgusunda yazarak cevap ver, anlaşılmayan cümle,
// hafif ve ağır küfür. Kullanım: node tests/talk.mjs [url] [çıktı klasörü]
import fs from 'fs';
import { pw } from './lib.mjs';

const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || 'test-results/talk';
fs.mkdirSync(out, { recursive: true });
const errors = [];
const check = (c, m) => { if (!c) errors.push('BEKLENTİ: ' + m); console.log((c ? '✓ ' : '✗ ') + m); };
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { localStorage.setItem('yk-name', 'Test Reis'); localStorage.setItem('yk-serbest', '1'); localStorage.setItem('yk-ses', '1'); localStorage.setItem('yk-diff', 'kolay'); });
await page.goto(url);
await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 30000 });
await page.click('#start .role[data-role="tag"]');
await page.waitForTimeout(1200);
const bubble = () => page.$eval('#bubble', (e) => e.textContent.replace(/\s+/g, ' '));
const say = async (txt) => { await page.fill('.freeform input', txt); await page.click('.freeform .send'); await page.waitForTimeout(400); };
async function police() {
  await page.evaluate(() => { const y = window.__yk; y.G.busy = true; y.G.paused = true; y.G.player.carry = null; y.tagScenes.tagVsPolice(false); });
  await page.waitForSelector('.freeform input', { timeout: 5000 });
}
await police();
check(true, 'sorguda yazı kutusu ve mikrofon var');
const q1 = await bubble();
await page.waitForTimeout(900); // sayfa çevirme bitsin
await page.screenshot({ path: `${out}/01-sorgu.png` });
await say('bugün hava çok güzel');
const hint = await page.$eval('.freeform small', (e) => e.textContent);
check(/Anlaşılmadı/.test(hint), `ilgisiz cümle: “${hint}”`);
check(/Doğru düzgün|Ne dedin/.test(await bubble()), 'polis “ne dedin?” diye tekrar sordu');
// ekrandaki bir seçeneği başka sözlerle söyle (dolgu kelimeleriyle)
const secenek = await page.$eval('#answers .ans span', (e) => e.textContent);
await say('valla memur bey ' + secenek.toLocaleLowerCase('tr').replace(/[.,!?]/g, '') + ' yani');
console.log('   seçenek: “' + secenek + '”');
const q2 = await bubble();
console.log('   ilk soru: ' + q1.slice(0, 90) + '\n   cevaptan sonra: ' + q2.slice(0, 90));
check(q2 !== q1, 'serbest cevap bir seçeneğe eşlendi, sorgu ilerledi');
// hafif küfür: tepki, sorgu sürer
for (let i = 0; i < 6 && !(await page.$('.freeform input')); i++) { await page.keyboard.press('1'); await page.waitForTimeout(400); }
if (await page.$('.freeform input')) {
  await say('salak mısın sen');
  check(/Ağzını topla/.test(await bubble()), 'hafif küfür: “Ağzını topla!”');
  await page.screenshot({ path: `${out}/02-hafif-kufur.png` });
} else check(false, 'hafif küfür için soru kalmadı');
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
for (let i = 0; i < 6 && !(await page.$('.freeform input')); i++) { await page.keyboard.press('1'); await page.waitForTimeout(400); }
const money0 = await page.evaluate(() => window.__yk.G.money);
if (await page.$('.freeform input')) {
  await say('siktir git');
  check(/hakaret/.test(await bubble()), 'ağır küfür: polis “memura hakaret” dedi');
  const money1 = await page.evaluate(() => window.__yk.G.money);
  check(money0 - money1 === 2000, `memura hakaret cezası ₺${money0 - money1}`);
  check(/−₺2000/.test(await page.$eval('#money', (e) => e.textContent)), 'ceza bilgi şeridinde görünüyor');
  await page.screenshot({ path: `${out}/03-agir-kufur.png` });
} else check(false, 'ağır küfür için soru kalmadı');
console.log(errors.length ? '\nHATALAR:\n' + errors.join('\n') : '\nSerbest konuşma tarayıcı testi geçti');
await browser.close();
process.exit(errors.length ? 1 : 0);
