// <auto-imports>
import { assetUrl } from '../core/assets';
import { MANIFEST } from '../core/content';
import { esc, reduce } from '../core/util';
import type { Look } from '../core/types';
// </auto-imports>
/* ================= KARAKTER PORTRELERİ (karikatür paneli) =================
   Çizimler assets/characters ve assets/passengers altında; çizimi olmayan karakterler için SVG yüz. */
export const CHARS = () => MANIFEST.characters;
export const CMOOD = {
  taksici: {
    angry: 'angry',
    smile: 'smile',
    nervous: 'nervous',
    hurt: 'nervous',
    shock: 'nervous',
    neutral: 'neutral',
  },
  tag: { angry: 'fake', smile: 'smile', nervous: 'nervous', hurt: 'hurt', shock: 'nervous', neutral: 'neutral' },
  polis: { angry: 'angry', smile: 'smile', nervous: 'shock', hurt: 'neutral', shock: 'shock', neutral: 'neutral' },
  durakci: { angry: 'angry', smile: 'smile', nervous: 'shock', hurt: 'angry', shock: 'shock', neutral: 'neutral' },
  gizli: { angry: 'angry', shock: 'angry' },
  avukat: { nervous: 'nervous', shock: 'nervous', angry: 'nervous' },
  vlog: { angry: 'angry', shock: 'angry' },
};
export function charImg(k: string, mood: string, o?: Look) {
  const set = CHARS()[k];
  if (!set) return '';
  const m = (CMOOD[k] || {})[mood],
    url = assetUrl(set[m] || set.neutral || set.smile || Object.values(set)[0]);
  return `<div class="pimg" role="img" aria-label="${esc((o && o.name) || { taksici: 'Taksici', tag: 'Tag’ci', polis: 'Polis', durakci: 'Durakçı', gizli: 'Yolcu', avukat: 'Avukat', patron: 'Büyük abi', vlog: 'Turist' }[k] || k)}" style="background-image:url(${url});background-size:cover;background-position:center">${o && o.weapon ? `<span class="pw">${weaponSVG(o.weapon, false)}</span>` : ''}</div>`;
}
export function face(o: Look, mood?: string) {
  if (o) {
    const k = o.sting ? 'gizli' : o.vlog && o.fem && !o.prof ? 'vlog' : o.art;
    if (k && CHARS()[k]) return charImg(k, mood, o);
  }
  if (o && o.prof && MANIFEST.passengers.portraits[o.prof]) {
    const i = o.pidx || 0;
    return `<div class="pimg" role="img" aria-label="${esc(o.name || 'Yolcu')}" style="background-image:url(${assetUrl(MANIFEST.passengers.portraits[o.prof])});background-position:${((i % 4) * 100) / 3}% ${(Math.floor(i / 4) * 100) / 3}%"></div>`;
  }
  const S = 'stroke="#111" stroke-width="3" stroke-linejoin="round"';
  let back = '',
    front = '',
    hat = '',
    extra = '',
    extraCam = '';
  if (o.hair === 'long') back = `<path d="M27,60 Q25,20 60,20 Q95,20 93,60 L97,106 L23,106Z" fill="${o.hc}" ${S}/>`;
  if (o.hair === 'scarf')
    back = `<path d="M21,64 Q19,13 60,13 Q101,13 99,64 Q101,98 84,110 L36,110 Q19,98 21,64Z" fill="${o.hc}" ${S}/>`;
  if (o.hair === 'bun') back = `<circle cx="60" cy="22" r="12" fill="${o.hc}" ${S}/>`;
  const body =
    `<path d="M12,122 Q14,96 40,92 L80,92 Q106,96 108,122Z" fill="${o.shirt}" ${S}/>` +
    (o.hat === 'police'
      ? `<path d="M44,94 L60,108 L76,94" fill="none" stroke="#fff" stroke-width="3"/><circle cx="88" cy="106" r="5" fill="#ffd166" ${S} stroke-width="2"/>`
      : '');
  const neck = `<rect x="50" y="82" width="20" height="16" fill="${o.skin}" ${S}/>`;
  const ears =
    o.hair === 'scarf'
      ? ''
      : `<ellipse cx="29" cy="64" rx="5" ry="8" fill="${o.skin}" ${S}/><ellipse cx="91" cy="64" rx="5" ry="8" fill="${o.skin}" ${S}/>`;
  const head = `<ellipse cx="60" cy="60" rx="31" ry="35" fill="${o.skin}" ${S}/>`;
  if (o.hair === 'short' || o.hair === 'long' || o.hair === 'bun')
    front = `<path d="M29,57 Q27,23 60,23 Q93,23 91,57 Q86,38 68,38 Q58,47 46,40 Q34,43 29,57Z" fill="${o.hc}" ${S}/>`;
  if (o.hair === 'scarf')
    front = `<path d="M27,60 Q27,21 60,21 Q93,21 93,60 Q85,34 60,34 Q35,34 27,60Z" fill="${o.hc}" ${S}/>`;
  if (o.hair === 'cap')
    front = `<path d="M28,52 Q29,21 60,21 Q91,21 92,52Z" fill="${o.hc}" ${S}/><path d="M58,49 L101,52 Q99,59 58,56Z" fill="${o.hc}" ${S}/>`;
  if (o.hair === 'bald')
    front = `<path d="M30,58 Q28,46 32,40 M90,58 Q92,46 88,40" fill="none" stroke="${o.hc}" stroke-width="5" stroke-linecap="round"/>`;
  if (o.hat === 'kasket')
    hat = `<path d="M26,53 Q26,23 60,21 Q94,23 95,48 L26,53Z" fill="#6b6257" ${S}/><path d="M56,50 Q86,44 106,54 Q84,59 56,57Z" fill="#4f483f" ${S}/>`;
  if (o.hat === 'sunhat')
    hat = `<ellipse cx="60" cy="34" rx="46" ry="10" fill="#e9c46a" ${S}/><path d="M36,34 Q38,12 60,12 Q82,12 84,34Z" fill="#f4d58d" ${S}/><path d="M37,28 Q60,32 83,28" fill="none" stroke="#c1121f" stroke-width="4"/>`;
  if (o.cam)
    extraCam = `<path d="M40,94 L60,110 L80,94" fill="none" stroke="#222" stroke-width="3"/><rect x="50" y="104" width="20" height="13" rx="3" fill="#333" ${S} stroke-width="2"/><circle cx="60" cy="110" r="4" fill="#8ecae6"/>`;
  if (o.hat === 'police')
    hat = `<path d="M25,47 L30,23 Q60,12 90,23 L95,47Z" fill="#1d3557" ${S}/><rect x="23" y="44" width="74" height="9" rx="3" fill="#111"/><circle cx="60" cy="32" r="6.5" fill="#ffd166" ${S} stroke-width="2"/><path d="M30,53 Q60,64 90,53 L91,57 Q60,70 29,57Z" fill="#111"/>`;
  let brows = '',
    eyes = '',
    mouth = '';
  const eye = (cx, cy, r, dx, dy, pr) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" ${S} stroke-width="2.5"/><circle cx="${cx + dx}" cy="${cy + dy}" r="${pr}" fill="#111"/>`;
  if (mood === 'angry') {
    brows = `<path d="M37,49 L55,57 M83,49 L65,57" stroke="#111" stroke-width="5" stroke-linecap="round"/>`;
    eyes = eye(47, 63, 6, 1, 1, 3) + eye(73, 63, 6, -1, 1, 3);
    mouth = `<path d="M48,86 Q60,80 72,86 L70,93 Q60,89 50,93Z" fill="#5a1414" ${S} stroke-width="2.5"/>`;
    extra += `<g transform="translate(88,30)" stroke="#d62828" stroke-width="4" stroke-linecap="round" fill="none"><path d="M-9,-2 Q-2,-2 -2,-9 M9,-2 Q2,-2 2,-9 M-9,2 Q-2,2 -2,9 M9,2 Q2,2 2,9"/></g>`;
  } else if (mood === 'nervous') {
    brows = `<path d="M38,54 L54,47 M82,54 L66,47" stroke="#111" stroke-width="4" stroke-linecap="round"/>`;
    eyes = eye(47, 63, 6, 3, 0, 2.6) + eye(73, 63, 6, 3, 0, 2.6);
    mouth = `<path d="M46,89 q3.5,-4 7,0 t7,0 t7,0 t7,0" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/>`;
    extra += `<path d="M93,38 Q100,49 93,54 Q86,49 93,38Z" fill="#7cc8ff" ${S} stroke-width="2"/>`;
  } else if (mood === 'shock') {
    brows = `<path d="M38,46 Q46,41 55,46 M65,46 Q74,41 82,46" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/>`;
    eyes = eye(47, 63, 8, 0, 0, 2.2) + eye(73, 63, 8, 0, 0, 2.2);
    mouth = `<ellipse cx="60" cy="88" rx="6" ry="8" fill="#5a1414" ${S} stroke-width="2.5"/>`;
  } else if (mood === 'smile') {
    brows = `<path d="M39,50 Q46,46 55,49 M65,49 Q74,46 81,50" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/>`;
    eyes = eye(47, 63, 6, 0, 0, 3) + eye(73, 63, 6, 0, 0, 3);
    mouth = `<path d="M47,84 Q60,97 73,84" fill="#fff" ${S} stroke-width="2.5"/>`;
  } else if (mood === 'hurt') {
    brows = `<path d="M38,53 L54,49 M82,53 L66,49" stroke="#111" stroke-width="4" stroke-linecap="round"/>`;
    eyes =
      `<path d="M41,60 L53,66 M41,66 L53,60" stroke="#111" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="73" cy="64" rx="9" ry="8" fill="#6a4c93" opacity=".75"/>` +
      eye(73, 63, 5, 0, 0, 2.4);
    mouth = `<path d="M50,90 Q60,84 70,90" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/>`;
    extra += `<path d="M78,28 l3,6 6,1 -5,4 1,6 -5,-3 -5,3 1,-6 -5,-4 6,-1Z" fill="#ffd166" ${S} stroke-width="1.5"/>`;
  } else {
    brows = `<path d="M38,51 L55,51 M65,51 L82,51" stroke="#111" stroke-width="4.5" stroke-linecap="round"/>`;
    eyes = eye(47, 63, 6, 0, 1, 3) + eye(73, 63, 6, 0, 1, 3);
    mouth = `<path d="M50,88 L70,88" stroke="#111" stroke-width="3.5" stroke-linecap="round"/>`;
  }
  const nose = `<path d="M60,65 Q55,75 61,77" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"/>`;
  const stache = o.stache
    ? `<path d="M41,81 Q50,71 60,77 Q70,71 79,81 Q70,88 60,83 Q50,88 41,81Z" fill="#2a211b" ${S} stroke-width="2"/>`
    : '';
  const phone = o.vlog
    ? `<g transform="translate(96,84) rotate(10)"><rect x="-10" y="-16" width="20" height="31" rx="4" fill="#222" ${S} stroke-width="2"/><rect x="-8" y="-12" width="16" height="7" rx="2" fill="#e63946"/><text x="0" y="-6.5" font-size="6" fill="#fff" text-anchor="middle" font-family="sans-serif" font-weight="700">CANLI</text></g>`
    : o.rec
      ? `<circle cx="94" cy="104" r="8" fill="${o.skin}" ${S} stroke-width="2"/><g transform="translate(96,86) rotate(10)"><rect x="-9" y="-15" width="18" height="29" rx="4" fill="#222" ${S} stroke-width="2"/><circle cx="0" cy="-7" r="4" fill="#e63946"/></g>`
      : '';
  const held = o.weapon ? weaponSVG(o.weapon, true) : '';
  return `<svg class="f" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${back}${body}${extraCam}${neck}${ears}${head}${front}${hat}${brows}${eyes}${nose}${stache}${mouth}${extra}${phone}${held}</svg>`;
}
export function weaponSVG(id, inHand) {
  const art = MANIFEST.items.weapons[id] ? assetUrl(MANIFEST.items.weapons[id]) : '';
  if (art) {
    if (inHand)
      return `<image href="${art}" x="74" y="34" width="46" height="74" preserveAspectRatio="xMidYMid meet"/>`;
    return `<img class="wi" alt="" src="${art}" style="height:28px;width:28px;object-fit:contain;vertical-align:-8px">`;
  }
  const S = 'stroke="#111" stroke-width="2.5" stroke-linejoin="round"';
  let g = '';
  if (id === 'bat')
    g = `<path d="M-4,40 L4,40 L7,-38 Q0,-48 -7,-38 Z" fill="#d9a066" ${S}/><rect x="-5.5" y="40" width="11" height="6" rx="2" fill="#5a3a1a" ${S}/><path d="M-3,20 L3,20 M-3,26 L3,26" stroke="#111" stroke-width="1.5"/>`;
  else if (id === 'haydar')
    g = `<rect x="-6" y="-44" width="12" height="92" rx="3" fill="#8b5a2b" ${S}/><path d="M-2,-36 L-2,-10 M2,-4 L2,22 M-2,28 L-2,42" stroke="#5a3a1a" stroke-width="1.5"/>`;
  else if (id === 'gloves')
    g = `<path d="M-14,-10 Q-16,-26 0,-26 Q16,-26 14,-6 Q14,8 0,10 Q-14,8 -14,-10Z" fill="#e03131" ${S}/><rect x="-10" y="8" width="20" height="10" rx="3" fill="#fff" ${S}/>`;
  else if (id === 'tespih')
    g = `<g fill="#1c7ed6" ${S} stroke-width="1.5">${Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * Math.PI * 2;
      return `<circle cx="${(Math.cos(a) * 14).toFixed(1)}" cy="${(Math.sin(a) * 14 - 6).toFixed(1)}" r="4"/>`;
    }).join(
      '',
    )}</g><path d="M0,8 L0,22" stroke="#111" stroke-width="2"/><circle cx="0" cy="25" r="4" fill="#ffd43b" ${S} stroke-width="1.5"/>`;
  if (inHand)
    return `<g transform="translate(100,62) rotate(${id === 'bat' || id === 'haydar' ? 18 : 0}) scale(.8)">${g}</g><circle cx="${id === 'bat' || id === 'haydar' ? 94 : 100}" cy="98" r="8" fill="#d9a27a" stroke="#111" stroke-width="2.5"/>`;
  return `<svg class="wi" viewBox="-24 -50 48 100" width="14" height="26" aria-hidden="true" style="vertical-align:-6px">${g}</svg>`;
}
export const wIcon = (id) => (id && id !== 'none' ? weaponSVG(id, false) : '');
export function burstSVG() {
  const C = [
    [110, 112, 48],
    [170, 92, 56],
    [226, 120, 44],
    [150, 142, 46],
    [88, 72, 30],
    [240, 70, 30],
    [60, 130, 26],
  ];
  return `<svg class="burst${reduce ? '' : ' shake'}" viewBox="0 0 320 210" xmlns="http://www.w3.org/2000/svg">
  <g stroke="#111" stroke-width="7" stroke-linecap="round"><line x1="58" y1="118" x2="22" y2="152"/><line x1="264" y1="100" x2="298" y2="76"/><line x1="200" y1="176" x2="214" y2="204"/><line x1="120" y1="60" x2="104" y2="22"/></g>
  <g fill="#f1c9a5" stroke="#111" stroke-width="3"><circle cx="22" cy="152" r="11"/><circle cx="298" cy="76" r="11"/><circle cx="104" cy="22" r="10"/></g>
  <ellipse cx="216" cy="203" rx="13" ry="6" fill="#222"/>
  <g fill="#fff" stroke="#111" stroke-width="5">${C.map((c) => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}"/>`).join('')}</g>
  <g fill="#fff">${C.map((c) => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2] - 2.5}"/>`).join('')}</g>
  <g fill="#ffd166" stroke="#111" stroke-width="2"><path d="M60,26 l5,10 11,2 -8,7 2,11 -10,-5 -10,5 2,-11 -8,-7 11,-2Z"/><path d="M262,22 l4,8 9,1 -6,6 1,9 -8,-4 -8,4 1,-9 -6,-6 9,-1Z"/><path d="M290,150 l4,8 9,1 -6,6 1,9 -8,-4 -8,4 1,-9 -6,-6 9,-1Z"/></g>
  <g font-family="Bangers,'Archivo Black',sans-serif" stroke="#111" stroke-width="2.5" paint-order="stroke">
   <text x="98" y="78" font-size="40" fill="#e63946" transform="rotate(-14 98 78)">PAT!</text>
   <text x="200" y="182" font-size="38" fill="#f77f00" transform="rotate(10 200 182)">KÜT!</text>
   <text x="142" y="132" font-size="54" fill="#d62828" transform="rotate(-4 142 132)">ÇAT!</text>
  </g></svg>`;
}
