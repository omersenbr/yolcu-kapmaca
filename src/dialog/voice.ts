/* ================= SES: konuşmayı yazıya (tarayıcının ses tanıması), yazıyı sese (tarayıcının sesi) =================
   Ücretsiz: Web Speech API. Ses tanıma Android Chrome’da Türkçe çalışır (internet ister);
   desteklenmeyen tarayıcıda yazarak cevap verilir. Ayarlar: yk-serbest, yk-ses. */
import { load, save } from '../sim/storage';

export const freeformOn = () => load('yk-serbest', '1') === '1';
export const voiceOn = () => load('yk-ses', '1') === '1';
export function setFreeform(on: boolean) {
  save('yk-serbest', on ? '1' : '0');
}
export function setVoice(on: boolean) {
  save('yk-ses', on ? '1' : '0');
  if (!on) stopSpeaking();
}

/* ---- konuşmayı yazıya ---- */
const SR =
  typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
export const canListen = () => !!SR;
let rec: any = null;
/** dinle: ara sonuçlar onPartial’a, son cümle onFinal’a; hata olursa onError(kod) */
export function listen(onPartial: (t: string) => void, onFinal: (t: string) => void, onError: (code: string) => void) {
  stopListening();
  if (!SR) return onError('yok');
  rec = new SR();
  rec.lang = 'tr-TR';
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.onresult = (ev) => {
    let txt = '',
      fin = false;
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      txt += ev.results[i][0].transcript;
      if (ev.results[i].isFinal) fin = true;
    }
    if (fin) onFinal(txt.trim());
    else onPartial(txt);
  };
  rec.onerror = (ev) =>
    onError(ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? 'izin' : ev.error || 'hata');
  rec.onend = () => (rec = null);
  try {
    rec.start();
  } catch (e) {
    onError('hata');
  }
}
export function stopListening() {
  if (rec)
    try {
      rec.abort();
    } catch (e) {
      /* zaten durmuş */
    }
  rec = null;
}

/* ---- yazıyı sese ---- */
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
/** konuşanın adından ses tonu: polis tok, taksici/durakçı kalın, yolcu biraz ince */
function voiceFor(who: string) {
  const w = who.toLocaleLowerCase('tr');
  if (/polis|komiser|amir/.test(w)) return { pitch: 0.8, rate: 1.0 };
  if (/taksici|durakçı|meslektaş|abi/.test(w)) return { pitch: 0.65, rate: 0.95 };
  return { pitch: 1.15, rate: 1.05 };
}
export function speak(who: string, text: string) {
  if (!synth || !voiceOn() || !text || /^(sen|çark)$/i.test(who)) return;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'tr-TR';
  const tr = synth.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('tr'));
  if (tr) u.voice = tr;
  Object.assign(u, voiceFor(who));
  synth.speak(u);
}
export function stopSpeaking() {
  if (synth) synth.cancel();
}
