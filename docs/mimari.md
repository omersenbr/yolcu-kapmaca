# Mimari

Vite + TypeScript, render düz canvas (prototipteki gibi). Davranışlar `prototip/yolcu-kapmaca.html` ile birebir; kod modüllere bölündü.

## Çalıştırma
```
npm install
npm run dev        # http://localhost:5173 (yerel ağdan telefonla da açılır)
npm run build      # dist/ (tip denetimi + paket)
npm test           # dev sunucusu açıkken: duman testi + sahne testi (Playwright)
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
