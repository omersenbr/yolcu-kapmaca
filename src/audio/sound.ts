/* ================= SES: kısa efektler (tarayıcının ses motoruyla sentezlenir, dosya yok) =================
   Ödül/ceza anları, para, korna. Ayar: yk-efekt (Profil → Konuşma ve ses). İlk dokunuşta ses motoru açılır
   (tarayıcılar kullanıcı etkileşimi olmadan ses çalmaya izin vermez). */
import { load, save } from '../sim/storage';

export let muted = load('yk-efekt', '1') !== '1';
export function setMuted(v: boolean) {
  muted = !!v;
  save('yk-efekt', muted ? '0' : '1');
}
let ac: AudioContext | null = null;
function audio(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ac) {
      const A = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!A) return null;
      ac = new A();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch (e) {
    return null;
  }
}
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => audio(), { once: true });

/** tek nota: dalga, frekans (başlangıç → bitiş), süre, ses */
function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, at = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at,
    o = a.createOscillator(),
    g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
/** kısa gürültü patlaması (damga, yumruk) */
function thud(vol: number, at = 0) {
  const a = audio();
  if (!a) return;
  const n = Math.floor(a.sampleRate * 0.12),
    b = a.createBuffer(1, n, a.sampleRate),
    d = b.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    d[i] = ((s / 0x7fffffff) * 2 - 1) * (1 - i / n) ** 3;
  }
  const src = a.createBufferSource(),
    g = a.createGain(),
    f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 700;
  g.gain.value = vol;
  src.buffer = b;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + at);
}
export function sfx(name: string) {
  if (muted) return;
  switch (name) {
    case 'para': // yazar kasa “çın”
      tone('triangle', 1320, 1320, 0.09, 0.12);
      tone('triangle', 1760, 1760, 0.16, 0.1, 0.06);
      break;
    case 'iyi': // damga + yükselen iki nota
      thud(0.35);
      tone('square', 523, 523, 0.1, 0.06, 0.05);
      tone('square', 784, 784, 0.16, 0.06, 0.14);
      break;
    case 'kotu': // damga + düşen vızıltı
      thud(0.45);
      tone('sawtooth', 220, 110, 0.32, 0.07, 0.03);
      break;
    case 'korna':
      tone('square', 392, 392, 0.12, 0.05);
      tone('square', 330, 330, 0.18, 0.05, 0.13);
      break;
    case 'geri': // geri sayım tık
      tone('square', 660, 660, 0.08, 0.06);
      break;
    case 'basla':
      tone('square', 990, 990, 0.25, 0.07);
      break;
  }
}
