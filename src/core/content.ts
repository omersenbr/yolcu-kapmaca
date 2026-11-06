// <auto-imports>
// </auto-imports>
/* Oyun verileri çalışma anında yüklenir: data/harita.json, data/dialoglar.json, assets/manifest.json.
   Kod metin içermez; bütün diyaloglar DLG’den gelir. */
export let MAPDATA = null,
  DLG = null,
  MANIFEST = null;
export function setContent(map, dlg, manifest) {
  MAPDATA = map;
  DLG = dlg;
  MANIFEST = manifest;
}
