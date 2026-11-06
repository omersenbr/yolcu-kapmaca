# Mimari

Vite + TypeScript, render düz canvas (prototipteki gibi). Davranışlar `prototip/yolcu-kapmaca.html` ile birebir; kod modüllere bölündü.

## Çalıştırma
```
npm install
npm run dev        # http://localhost:5173 (yerel ağdan telefonla da açılır)
npm run build      # dist/ (tip denetimi + paket)
npm test           # dev sunucusu açıkken: duman testi + sahne testi (Playwright)
npm run test:parity  # prototiple kare kare eşitlik (tohumlu rastgelelik + sanal saat)
npm run test:perf    # kare süresi ölçümü; --proto ile prototip, --cpu 4 ile telefon benzetimi, --profile ile sıcak noktalar
python3 scripts/build_atlas.py  # araç atlası (assets/atlas/cars.webp) ve manifest’teki atlas koordinatları
```

## Yükleme sırası (`src/main.ts`)
1. `data/harita.json`, `data/dialoglar.json`, `assets/manifest.json` çalışma anında `fetch` edilir.
2. `initGrid` (yol ağı, semtler, duraklar, radarlar), `initPathfinding` (A* dizileri).
3. Manifest’teki bütün görseller önceden yüklenir (yükleme çubuğu).
4. `initPainter`, `initHud`, `initMenu`, `initInput`, sonra oyun döngüsü.

Base64 gömme yok; görseller Vite ile ayrı dosya olarak paketlenir (`import.meta.glob`).

## Modüller (`src/`)
| Klasör | İçerik |
| --- | --- |
| `sim/` | **Saf oyun mantığı, ekrana hiç dokunmaz** (DOM tipleri olmadan derlenir; Node’da `npm run sim` ile koşar). `grid` (ızgara, yol ağı, semt, durak bölgeleri, radarlar), `state` (G, zorluk, Tag seviyesi, saat/talep), `game` (yeni gün, alma/indirme, ücret, kontrol noktası, nitro, sinematik), `movement`, `pathfinding` (A*), `ai`, `passengers`, `events`, `update`, `entities`, `content` (DLG, harita, manifest), `bus` (simülasyon → dış dünya olayları), `util`, `types`, `storage` |
| `core/` | tarayıcıya özgü: `assets` (görsel kaydı), `dom` |
| `map/` | `painter`: parçalı harita önbelleği, sprite yerleşimi, simge yapılar, mini harita tabanı |
| `dialog/` | `comic` (panel, balon, süreli cevaplar), `engine` (sorgu motoru), `portraits`, `tagScenes`, `taxiScenes`, `ads` |
| `fight/` | VUR mini oyunu + çark |
| `render/` | `view` (canvas, TS, kamera), `render`, `cars`, `people` |
| `ui/` | `bindings` (sim olaylarını arayüze bağlar), `hud`, `menu`, `endscreen`, `leaderboard`, `pageflip` |
| `input/` | dokunma ve klavye |
| `audio/` | ses için iskelet |

`tools/headless.ts`: simülasyonu tarayıcısız koşturan betik (ileride oyun sunucusunun çekirdeği).

### Simülasyon ile arayüz arasındaki sınır
- `sim/`, `sim/` dışından hiçbir şey import etmez. Kullanıcıya bir şey gösterilecekse `bus` üzerinden söyler: `toast`, `hud`, `frame`, `flash`, `radio`, `scene`, `end`.
- Sahneler (sorgu, dövüş) simülasyonda yalnızca ad ve argümanla anılır (`cinematic(x, y, süre, 'pickupDialog', yolcu)`). Arayüz bu adı diyalog fonksiyonuna bağlar. Sunucuda bu ad oyuncuya gönderilecek bir etkileşim olacak.
- Sinematik odağı (`G.focus`) kare koordinatında tutulur; piksele çizim tarafı çevirir.
- Diyaloglar hâlâ simülasyon durumunu doğrudan değiştiriyor (para, yolcu bindirme). Çok oyunculu aşamada bunlar sunucuya “cevap” olarak gidecek.

## Prototipten bilinçli farklar
- Görseller oyun başlamadan önce yüklendiği için prototipteki “görsel yüklenene kadar” yedek çizimler (düz çatı, basit stadyum/cami/köprü) kaldırıldı.
- Stil kuralı gereği emojiler kaldırıldı (telsiz etiketi `ui/i_radio` simgesiyle, sıralama başlıkları düz yazı).
- Yolcu cinsiyet tablosu koddan `assets/manifest.json`’a taşındı (zaten oradaydı).
- Yükleme ekranı eklendi.

## Performans (3. adım)
- **Harita:** 8×8 karelik parçalar halinde önbelleğe çizilir. Bir karede ~6 ms’lik parça çizim bütçesi var; boş kalan karelerde görüş alanının bir halka dışındaki parça önceden çizilir. Önbellek sınırı görüş alanına göre hesaplanır. Eskiden sabit 28 adet 16×16 parça tutuluyordu, bu DPR 2’de ~170 MB ediyordu; şimdi ~40 MB.
- **Görünmeyen nesneler çizilmez:** araçlar, yolcular, radarlar ve sivil çevirmeler görüş alanı dışında atlanır.
- **Güncelleme:** “bu Tag’i kim kovalıyor” sorusu karede bir kez kurulan eşlemeyle cevaplanır. Eskiden her Tag için bütün araç listesi taranıyordu (~130 bin karşılaştırma/kare).
- **Donmuş kare:** JPEG kodlaması `toBlob` ile arka planda yapılır, panel açılırken ana iş parçacığı kilitlenmez.
- **Görseller:** zaten kayıplı WebP; yeniden sıkıştırmak yalnızca ~%1 kazandırıyor. Her karede çizilen araçlar tek kayıpsız atlasta (`assets/atlas/cars.webp`, 251 KB; tekil dosyalarla piksel eşitliği için kayıpsız), yolcu figürleri ve ev/ağaç parçaları zaten 4×4 atlas.

Ölçüm (`tests/perf.mjs`, GPU’suz Chromium, 450 kare, taksici, aynı tohum):

| | ortalama | p95 | en kötü |
| --- | --- | --- | --- |
| Prototip | 13,1 ms | 19,6 ms | 55,4 ms |
| Yeni | 11,0 ms | 18,0 ms | 27,2 ms |

Bu sürelerin çoğu piksel boyama (raster); GPU’lu telefonda çok daha ucuzdur. JavaScript tarafı (güncelleme + çizim komutları) kare başına 1–2 ms.

## Telefonda test (4. adım)
- **Yerel ağ:** bilgisayarda `npm run dev`, telefonda terminalde yazan `Network:` adresi (aynı Wi-Fi).
- **GitHub Pages:** `.github/workflows/pages.yml`, `main`’e her gönderimde derleyip yayınlar. Bir kez Settings → Pages → Source: “GitHub Actions” seçilmeli. Adres: `https://<kullanıcı>.github.io/yolcu-kapmaca/`. Derleme göreli yollarla (`base: './'`) yapıldığı için alt dizinde çalışır.

Eşitlik notu: performans değişikliklerinden sonra oyun durumu prototiple her karede hâlâ birebir aynı. Görüntüde ekranın ~%0,2’si kadar, gözle görülmeyen fark kalıyor: araç kenarlarında atlas örneklemesi ve 8 karelik parça birleşim çizgilerinde ≤8/255 yoğunluk farkı.
