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
await page.addInitScript(() => { localStorage.setItem('yk-name', 'Test Reis'); localStorage.setItem('yk-serbest', '1'); localStorage.setItem('yk-ses', '1'); localStorage.setItem('yk-diff', 'kolay'); localStorage.removeItem('yk-ogrenilen'); localStorage.setItem('yk-ogret', '0'); });
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
// sorgu rastgele erken bitebilir: soru kalmadıysa paneli geçip yeni bir sorgu başlat
async function soruBekle() {
  for (let i = 0; i < 8 && !(await page.$('.freeform input')); i++) { await page.keyboard.press('1'); await page.waitForTimeout(400); }
  if (await page.$('.freeform input')) return;
  for (let i = 0; i < 10 && (await page.$eval('#comic', (e) => !e.hidden)); i++) { await page.keyboard.press('1'); await page.waitForTimeout(400); }
  await page.evaluate(() => { const o = document.getElementById('adOv'); if (o) o.hidden = true; });
  await police();
}
await police();
check(true, 'sorguda yazı kutusu ve mikrofon var');
const q1 = await bubble();
await page.waitForTimeout(900); // sayfa çevirme bitsin
await page.screenshot({ path: `${out}/01-sorgu.png` });
const sus0 = await page.$eval('#meterBar', (e) => parseFloat(e.style.width));
await say('bugün hava çok güzel');
check(/Lafı dolandırma/.test(await bubble()), `ilgisiz cümle gönderildi, kaçamak sayıldı: “${(await bubble()).slice(0, 70)}”`);
const sus1 = await page.$eval('#meterBar', (e) => parseFloat(e.style.width));
check(sus1 > sus0, `kaçamak cevap şüpheyi artırdı (%${sus0} → %${sus1})`);
// ekrandaki bir seçeneği başka sözlerle söyle (dolgu kelimeleriyle)
const secenek = await page.$eval('#answers .ans span', (e) => e.textContent);
await say('valla memur bey ' + secenek.toLocaleLowerCase('tr').replace(/[.,!?]/g, '') + ' yani');
console.log('   seçenek: “' + secenek + '”');
const q2 = await bubble();
console.log('   ilk soru: ' + q1.slice(0, 90) + '\n   cevaptan sonra: ' + q2.slice(0, 90));
check(q2 !== q1, 'serbest cevap bir seçeneğe eşlendi, sorgu ilerledi');
// hafif küfür: tepki, sorgu sürer
await soruBekle();
if (await page.$('.freeform input')) {
  await say('salak mısın sen');
  check(/Ağzını topla/.test(await bubble()), 'hafif küfür: “Ağzını topla!”');
  await page.screenshot({ path: `${out}/02-hafif-kufur.png` });
} else check(false, 'hafif küfür için soru kalmadı');
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
await soruBekle();
const money0 = await page.evaluate(() => window.__yk.G.money);
if (await page.$('.freeform input')) {
  await say('siktir git');
  check(/hakaret/.test(await bubble()), 'ağır küfür: polis “memura hakaret” dedi');
  const money1 = await page.evaluate(() => window.__yk.G.money);
  check(money0 - money1 === 2000, `memura hakaret cezası ₺${money0 - money1}`);
  check(/−₺2000/.test(await page.$eval('#money', (e) => e.textContent)), 'ceza bilgi şeridinde görünüyor');
  await page.screenshot({ path: `${out}/03-agir-kufur.png` });
} else check(false, 'ağır küfür için soru kalmadı');
// yolcuyla sohbet: Konuş düğmesi, her cümleye cevap, taraftar atışması, ağır küfürde yolcu iner
await page.goto(url);
await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 30000 });
await page.click('#start .role[data-role="taxi"]');
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const G = window.__yk.G, p = G.pax.find((q) => q.state === 'wait');
  p.look.prof = 'gs';
  p.dest = 'Kadıköy';
  p.dx = Math.round(G.player.x); p.dy = Math.round(G.player.y) + 40;
  window.__yk.board(G.player, p);
});
await page.waitForTimeout(300);
check(await page.$eval('#talkBtn', (e) => !e.hidden), 'yolcu binince KONUŞ düğmesi çıktı');
await page.click('#talkBtn');
await page.waitForSelector('.freeform input', { timeout: 5000 });
await page.waitForTimeout(900);
const replies = [];
for (const t of ['merhaba', 'nasılsın', 'dün akşam pizza yedim', 'cimbom bugün nasıl oynadı', 'fenerbahçe şampiyon olur']) {
  await say(t);
  replies.push(await bubble());
  console.log(`   “${t}” → ${replies.at(-1).slice(0, 80)}`);
}
check(new Set(replies).size === replies.length && replies.every((r) => r.length > 4), 'her cümleye cevap geldi, hiçbiri geri çevrilmedi');
check(/taraftar|bize|yıkılmaz|Galatasaray/.test(replies[3]), 'GS taraftarı “cimbom”a sevindi');
check(/Fenerbahçe|anma|bulaşma/.test(replies[4]), 'GS taraftarı “Fenerbahçe”ye kızdı');
check(await page.evaluate(() => window.__yk.G.paused), 'sohbet sırasında oyun duraklı');
await page.screenshot({ path: `${out}/04-yolcu-sohbet.png` });
// öğretme modu: bilinmeyen cümlede yolcu cevabı sorar, öğretilen cevap sonra geri gelir
await page.click('.chatopts input'); // ilk kutu: öğretme modu
await say('bugün balığa çıkacağım');
check(/ne cevap vereyim/.test(await bubble()), 'öğretme modu: yolcu “buna ne cevap vereyim?” diye sordu');
await say('Rastgele {ab}, lüfer çıkarsa bana da getir.');
check(/öğrendim/.test(await bubble()), `öğrendi: ${(await bubble()).slice(0, 90)}`);
await say('balığa çıkacağım bugün');
check(/Rastgele ab(i|la), lüfer/.test(await bubble()), `benzer cümlede öğrettiğim cevabı verdi: ${(await bubble()).slice(0, 70)}`);
await page.click('.chattools button'); // bu cevabı değiştir
await say('Bu havada balık mı olur!');
await say('bugün balığa çıkacağım');
check(/Bu havada balık/.test(await bubble()), 'cevap değiştirildi');
const kayit = await page.evaluate(() => JSON.parse(localStorage.getItem('yk-ogrenilen')));
check(kayit.length === 1 && kayit[0].c === 'Bu havada balık mı olur!', `kayıt kalıcı (${JSON.stringify(kayit)})`);
await page.screenshot({ path: `${out}/05-ogretme.png` });
const m0 = await page.evaluate(() => window.__yk.G.money);
await say('siktir git');
await page.waitForTimeout(2600);
const st = await page.evaluate(() => ({ carry: !!window.__yk.G.player.carry, comic: !document.getElementById('comic').hidden, money: window.__yk.G.money }));
check(!st.carry && !st.comic && m0 - st.money === 400, `ağır küfür: yolcu indi, ₺${m0 - st.money} ceza`);
console.log(errors.length ? '\nHATALAR:\n' + errors.join('\n') : '\nSerbest konuşma tarayıcı testi geçti');
await browser.close();
process.exit(errors.length ? 1 : 0);
