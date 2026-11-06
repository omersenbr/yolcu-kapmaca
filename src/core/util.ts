// <auto-imports>
// </auto-imports>
/* Küçük yardımcılar */
export const hsh = (c, r) => {
  let h = (c * 73856093) ^ (r * 19349663);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const rnd = (a) => a[Math.floor(Math.random() * a.length)];
export const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/* Diyalog şablonu: "{semt}" gibi değişkenleri doldurur */
export const T = (s, v) =>
  String(s).replace(/\{([^{}]+)\}/g, (m, k) => (v && v[k] !== undefined && v[k] !== null ? v[k] : m));
export function mixHex(a, b, k) {
  const p = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const A = p(a),
    B = p(b);
  return (
    '#' +
    A.map((v, i) =>
      Math.round(v + (B[i] - v) * k)
        .toString(16)
        .padStart(2, '0'),
    ).join('')
  );
}
