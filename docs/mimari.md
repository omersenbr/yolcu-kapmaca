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
| `core/` | `state` (G, zorluk, Tag seviyesi, saat/talep, süs/eşya, kullanıcı adı), `content` (DLG, harita, manifest), `assets` (görsel kaydı), `storage`, `util`, `types`, `dom` |
| `map/` | `grid` (ızgara, yol ağı, semt, durak bölgeleri, radarlar), `painter` (parçalı harita önbelleği, sprite yerleşimi, simge yapılar, mini harita tabanı) |
| `world/` | `game` (yeni gün, alma/indirme, ücret, kontrol noktası, nitro, sinematik), `movement` (kareden kareye hareket, yön kuyruğu), `pathfinding` (A*), `ai` (hedef, kaçış, kovalama, tanık), `passengers` (görünüş, profil, doğma, hedef), `events` (dalgalar, sivil çevirmeler), `update` (kare güncellemesi), `entities` |
| `dialog/` | `comic` (panel, balon, süreli cevaplar), `engine` (sorgu motoru, şablon değişkenleri), `portraits` (karakter görselleri, SVG yüzler), `tagScenes`, `taxiScenes`, `ads` (simüle reklam, avukat/torpil) |
| `fight/` | VUR mini oyunu + çark |
| `render/` | `view` (canvas, TS, kamera), `render` (kare çizimi, ışık, işaretler, mini harita), `cars`, `people` |
| `ui/` | `hud`, `menu` (ana ekran, mağaza, profil), `endscreen`, `leaderboard`, `pageflip` |
| `input/` | dokunma ve klavye |
| `audio/` | ses için iskelet (prototipte ses yoktu) |

Modüller arası paylaşılan değişkenler sahibi olan modülde `export let` olarak durur; diğer modüller okur, yazmak için setter kullanır (`setG`, `setDiff`, `setOrn` …).

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
- **Görseller:** zaten kayıplı WebP; yeniden sıkıştırmak yalnızca ~%1 kazandırıyor. Her karede çizilen araçlar tek atlasta (`assets/atlas/cars.webp`), yolcu figürleri ve ev/ağaç parçaları zaten 4×4 atlas.

Ölçüm (`tests/perf.mjs`, GPU’suz Chromium, 450 kare, taksici, aynı tohum):

| | ortalama | p95 | en kötü |
| --- | --- | --- | --- |
| Prototip | 13,1 ms | 19,6 ms | 55,4 ms |
| Yeni | 11,0 ms | 18,0 ms | 27,2 ms |

Bu sürelerin çoğu piksel boyama (raster); GPU’lu telefonda çok daha ucuzdur. JavaScript tarafı (güncelleme + çizim komutları) kare başına 1–2 ms.

## Telefonda test (4. adım)
- **Yerel ağ:** bilgisayarda `npm run dev`, telefonda terminalde yazan `Network:` adresi (aynı Wi-Fi).
- **GitHub Pages:** `.github/workflows/pages.yml`, `main`’e her gönderimde derleyip yayınlar. Bir kez Settings → Pages → Source: “GitHub Actions” seçilmeli. Adres: `https://<kullanıcı>.github.io/yolcu-kapmaca/`. Derleme göreli yollarla (`base: './'`) yapıldığı için alt dizinde çalışır.
