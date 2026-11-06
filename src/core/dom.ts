// <auto-imports>
// </auto-imports>
/** id ile DOM öğesi (prototipteki gibi esnek tipli) */
export const $ = (id: string): any => document.getElementById(id);

/** kullanıcı hareket azaltmayı seçtiyse animasyonlar kapalı */
export const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
