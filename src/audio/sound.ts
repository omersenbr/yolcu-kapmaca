// <auto-imports>
// </auto-imports>
/* ================= SES =================
   Prototipte ses yoktu. Bu modül ileride efekt ve müzik için tek giriş noktası olacak;
   şimdilik çağrılar sessizce yutulur. */
export let muted = false;
export function setMuted(v) {
  muted = !!v;
}
export function sfx(name) {
  if (muted) return; /* ileride: assets/audio/<name> */
}
