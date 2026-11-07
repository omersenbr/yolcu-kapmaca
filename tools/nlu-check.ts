/* Serbest konuşma eşleme testi (Node): npm run test:nlu */
import fs from 'node:fs';
import { setContent } from '../src/sim/content';
import { bestOption, profanity } from '../src/sim/nlu';
import { chatReply, teamIn } from '../src/sim/chat';

const json = (p: string) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const D = json('data/dialoglar.json');
setContent(null, D, null, json('data/ekonomi.json'));
let fail = 0;
const ok = (c: boolean, m: string) => {
  if (!c) fail++;
  console.log(`${c ? '✓' : '✗'} ${m}`);
};
const start = D.tagPolice.withPax.nodes.start.opts;
const pick = (s: string, opts = start) => bestOption(s, opts).option?.t ?? '(anlaşılmadı)';
const cases: [string, string][] = [
  ['arkadaşım', 'Arkadaşım.'],
  ['kuzenimdir memur bey', 'Kuzenim.'],
  ['amcamın oğlu', 'Kuzenim.'],
  ['iş arkadaşım, aynı yöne gidiyorduk', 'İş arkadaşım, aynı yöne gidiyoruz.'],
  ['uygulamadan eşleştik ama para almıyorum', 'Uygulamada eşleştik ama para almıyorum.'],
];
for (const [s, want] of cases) {
  const got = pick(s);
  ok(got === want, `“${s}” → ${got}`);
}
ok(pick('bugün hava çok güzel') === '(anlaşılmadı)', 'ilgisiz cümle anlaşılmadı');
ok(profanity('siktir git') === 'agir', 'ağır küfür');
ok(profanity('Salak mısın sen') === 'hafif', 'hafif küfür');
ok(profanity('götürüyorum havalimanına') === null, '“götürüyorum” küfür sayılmaz');
ok(profanity('salam ekmek aldım') === null, '“salam” küfür sayılmaz');
// her sorgu düğümünün her seçeneği kendi metniyle kendini bulmalı
let self = 0,
  total = 0;
const walk = (x: any) => {
  if (Array.isArray(x)) return x.forEach(walk);
  if (x && typeof x === 'object') {
    if (Array.isArray(x.opts) && x.q) {
      const opts = x.opts.filter((o: any) => o.t);
      for (const o of opts) {
        total++;
        if (bestOption(o.t, opts).option === o) self++;
        else console.log(`  · kendini bulamadı: “${o.t}” → ${bestOption(o.t, opts).option?.t ?? '(yok)'}`);
      }
    }
    Object.values(x).forEach(walk);
  }
};
walk(D);
ok(self === total, `seçenek metni kendi seçeneğine eşlenir (${self}/${total})`);
// yolcuyla sohbet: her cümleye bir cevap, konu ve taraftar atışması
const pax = (prof: string) => ({ look: { prof, name: 'Ayşe', fem: true } }) as any;
const konu = (s: string, prof = 'plaza') => chatReply(s, pax(prof)).konu;
const chatCases: [string, string][] = [
  ['merhaba abla', 'selam'],
  ['nasılsınız', 'nasilsin'],
  ['trafik bugün berbat', 'trafik'],
  ['yağmur yağacak galiba', 'hava'],
  ['ne iş yapıyorsunuz', 'is'],
  ['müzik açayım mı', 'muzik'],
  ['kaç para tutar sence', 'para'],
  ['sana bir fıkra anlatayım', 'saka'],
  ['çok teşekkür ederim', 'iltifat'],
  ['nereye gidiyorduk', 'nereye'],
  ['dün akşam pizza yedim', 'dolgu'],
  ['asdfgh', 'dolgu'],
];
for (const [s, want] of chatCases) ok(konu(s) === want, `sohbet “${s}” → ${konu(s)}`);
ok(teamIn('ben fenerliyim') === 'fb', 'takım: “fenerliyim” → fb');
ok(konu('cimbom bugün kazandı mı', 'gs') === 'taraftar', 'GS taraftarına “cimbom” → aynı takım');
ok(konu('kartal yine uçtu', 'fb') === 'taraftar-rakip', 'FB taraftarına “kartal” → rakip');
{
  const p = pax('turist');
  const a = chatReply('teşekkürler', p), b = chatReply('teşekkür ederim', p);
  ok(a.puan > 0 && b.puan === 0, 'aynı konudan ikinci kez puan yok');
  ok(chatReply('siktir', p).kufur === 'agir', 'sohbette ağır küfür');
  ok(p.sohbet.puan >= -2, `sohbet puanı alt sınırda (${p.sohbet.puan})`);
}
console.log(fail ? `\n${fail} test başarısız` : '\nSerbest konuşma testleri geçti');
process.exit(fail ? 1 : 0);
