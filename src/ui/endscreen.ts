// <auto-imports>
import { $ } from '../core/dom';
import { DF, G, UNAME } from '../sim/state';
import { load, save } from '../sim/storage';
import { esc } from '../sim/util';
import { face } from '../dialog/portraits';
import { addLB, renderLB } from './leaderboard';
import { pageTurn } from './pageflip';
import { LOOK } from '../sim/passengers';
// </auto-imports>
/* ================= GÜN SONU: gazete manşeti, rekor, sıralama ================= */
export function endGame(why) {
  pageTurn();
  $('nitroBtn').hidden = true;
  $('adbtns').hidden = true;
  $('adOv').hidden = true;
  if (G.over) return;
  G.over = true;
  $('comic').hidden = true;
  let final = G.money;
  const titles = {
    time: 'Gün bitti',
    baglandi: 'Aracın bağlandı',
    hapis: 'Hapse düştün',
    ruhsat: 'Ruhsatın iptal edildi',
  };
  let msg;
  if (why === 'time')
    msg = G.role === 'taxi' ? 'Taksimetreyi kapattın. Bugünkü kazanç:' : 'Uygulamayı kapattın. Bugünkü kazanç:';
  else if (why === 'baglandi') {
    msg = `Araç otoparkta, ceza kesildi. Kasadaki ${G.money < 0 ? '−₺' : '₺'}${Math.abs(G.money)} da gitti, her şey sıfırlandı.`;
    final = 0;
  } else if (why === 'ruhsat') {
    msg =
      'Turistin canlı yayını viral oldu. Fahiş ücret ve dolandırıcılıktan ruhsat iptal, araç bağlandı. Kazancın da cezaya gitti.';
    final = 0;
  } else msg = 'Taksimetre durdu, vardiya nezarette bitti. Yakalanmadan önceki kazanç:';
  const key = 'yk-best-' + G.role;
  let best = 0;
  best = parseInt(load(key, '0'), 10) || 0;
  if (final > best) save(key, final);
  $('endTitle').textContent = titles[why];
  $('endWhy').textContent = msg;
  $('endMoney').textContent = (final < 0 ? '−₺' : '₺') + Math.abs(final);
  $('endBest').textContent = (final > best ? 'Yeni rekor!' : 'Rekorun: ₺' + best) + ` (${DF().label})`;
  const fd = $('founder'),
    rank = addLB(G.role, final);
  if (rank === 1 && final > 0) {
    fd.innerHTML =
      G.role === 'tag'
        ? face({ skin: '#f1c9a5', hair: 'short', hc: '#3b2a1e', shirt: '#4f5bd5' }, 'smile') +
          `<span>Sıralamada birincisin! Yeni Tag Başkanı: ${esc(UNAME)}. Tag’in kurucusu seninle gurur duyuyor!</span>`
        : face(LOOK.taxi1, 'smile') +
          `<span>Sıralamada birincisin! İstanbul Taksiciler Odası seni başkan seçti: ${esc(UNAME)}.</span>`;
    fd.hidden = false;
  } else if (rank) {
    fd.innerHTML =
      face(G.role === 'tag' ? LOOK.tag : LOOK.taxi1, 'smile') +
      `<span>${G.role === 'tag' ? 'Tag’ciler' : 'Taksiciler'} sıralamasında ${rank}. oldun.</span>`;
    fd.hidden = false;
  } else fd.hidden = true;
  renderLB($('lbEnd'));
  $('end').hidden = false;
}
