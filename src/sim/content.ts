// <auto-imports>
// </auto-imports>
/* Oyun verileri çalışma anında yüklenir: data/harita.json, data/dialoglar.json, assets/manifest.json.
   Kod metin içermez; bütün diyaloglar DLG’den gelir. */
export let MAPDATA = null,
  DLG = null,
  MANIFEST = null,
  /** kariyer ekonomisi: data/ekonomi.json */
  ECO = null;
export function setContent(map, dlg, manifest, eco?) {
  MAPDATA = map;
  DLG = dlg;
  MANIFEST = manifest;
  if (eco) ECO = eco;
}
