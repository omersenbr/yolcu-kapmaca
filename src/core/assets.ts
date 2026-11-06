// <auto-imports>
// </auto-imports>
/* Görsel kaydı: assets/ altındaki bütün dosyalar Vite ile URL olarak paketlenir,
   manifest’teki yollarla ("assets/cars/tag1.webp") çağrılır. */
export const URLS = import.meta.glob('/assets/**/*.{webp,jpg,png}', { eager: true, query: '?url', import: 'default' });
export const IMGS = {};
export function assetUrl(path) {
  return URLS['/' + path] || '';
}
export function img(path) {
  let im = IMGS[path];
  if (!im) {
    im = new Image();
    im.decoding = 'async';
    im.src = assetUrl(path);
    IMGS[path] = im;
  }
  return im;
}
export const ready = (im) => im && im.complete && im.naturalWidth > 0;
/* manifest içindeki bütün dosya yollarını topla */
export function manifestFiles(m): string[] {
  const out = new Set<string>();
  const walk = (v) => {
    if (typeof v === 'string') {
      if (/^assets\/.+\.(webp|jpg|png)$/.test(v)) out.add(v);
    } else if (v && typeof v === 'object') for (const k in v) walk(v[k]);
  };
  walk(m);
  return [...out];
}
export function preload(paths: string[], onProgress?: (n: number, total: number) => void) {
  let n = 0;
  return Promise.all(
    paths.map(
      (p) =>
        new Promise<void>((res) => {
          const im = img(p);
          const done = () => {
            n++;
            if (onProgress) onProgress(n, paths.length);
            res();
          };
          if (im.complete) done();
          else {
            im.onload = done;
            im.onerror = () => {
              console.warn('Görsel yüklenemedi:', p);
              done();
            };
          }
        }),
    ),
  );
}
