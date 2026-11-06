// <auto-imports>
// </auto-imports>
/* Yerel kayıt (localStorage). Anahtarlar prototiple aynı: yk-diff, yk-tagxp, yk-orn, yk-wpn, yk-name, yk-lb, yk-best-<rol> */
export function load(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : v;
  } catch (e) {
    return def;
  }
}
export function save(key, val) {
  try {
    localStorage.setItem(key, String(val));
  } catch (e) {}
}
