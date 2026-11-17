# 2.5D görseller: ne çizilecek, nasıl istenecek

2.5D görünüm şu an eldeki üstten görselleri kodda uyarlıyor (`src/render/iso.ts`). Bu belge, onların yerine geçecek gerçek 2.5D çizimlerin listesi ve Gemini istemleridir. Stil kuralları `docs/stil-rehberi.md` ile aynı kalır.

## Kamera (bütün çizimler için tek açı)

Kamera sabit olduğu için her nesne tek açıdan çizilir. Bütün görseller aynı açıyla çizilmek zorunda; yoksa şehir yamuk durur.

- **Açı:** klasik oyun izometrisi. Kamera 45° yandan, yaklaşık 30° yukarıdan bakar (yerdeki bir kare, eni boyunun iki katı olan bir eşkenar dörtgen görünür: “2:1 izometrik”).
- **Işık:** sol üstten. Sol ön yüz aydınlık, sağ ön yüz gölgede.
- Görseller geldiğinde oyundaki varsayılan eğim ve açı bu değerlere sabitlenir (şimdiki ayar biraz daha dik).

## Her istemin sonuna eklenecek ortak kısım

```
Style: Turkish satirical comic magazine illustration (Uykusuz / LeMan tradition). Bold black ink outline,
flat colours, limited palette, halftone dots or hatching for shading instead of gradients, slight
misregistered print feel. No gradients, no glow, no glass effects, no 3D render look, no text, no logos,
no brand names. Classic 2:1 isometric game view: camera 45 degrees from the side, about 30 degrees above.
Light from the upper left. Plain solid light-grey background (#D9D9D9), no ground, no shadow on the
background, object fully inside the frame with margin.
```

## 1. Araçlar (en önce; en çok göze batan bunlar)

11 araç: `taxi1`, `taxi2`, `taxi3`, `police1`, `police2`, `sivil`, `tag1`–`tag5`. Araçlar haritada dört yöne gider; izometrik görünümde bu iki çizim eder, diğer ikisi aynalanır:

- **önden** (araç sağ alta doğru bakar; ön ve sol yan görünür)
- **arkadan** (araç sağ üste doğru gider; arka ve sol yan görünür)

Toplam 22 çizim. Dosya adları: `taxi1_on.png`, `taxi1_arka.png`, …

Önden istemi (referans olarak aracın üstten çizimini ekle):

```
Isometric game sprite of the SAME car as in the reference image (same colour, same body type, same
roof details), seen from the front-left: the car points towards the lower right of the image, its front
and left side are visible, the roof is visible from above. Single car, centred.
[ortak kısım]
```

Arkadan istemi:

```
Isometric game sprite of the SAME car as in the reference image, seen from the rear-left: the car
drives away towards the upper right of the image, its rear and left side are visible, the roof is
visible from above. Single car, centred.
[ortak kısım]
```

Araca özel notlar: taksi sarı, tavanda taksi lambası (yazısız); polis beyaz-mavi, tavanda lamba çubuğu; `sivil` düz gri sedan, lambasız (lambayı oyun çizer); `tag1` emektar hatchback, `tag2` kompakt sedan, `tag3` yeni hatchback, `tag4` kompakt SUV, `tag5` siyah lüks sedan.

## 2. Binalar

Beş tür, her biri 4×4’lük bir sayfa (16 çeşit): `apartman`, `kiremit`, `mahalle`, `yali`, `blok`. Her bina kare bir arsaya oturur; arsanın köşeleri hücrenin sol, sağ, alt ve üst uçlarına gelir.

```
A 4x4 sheet of 16 different isometric building sprites for a city game, evenly spaced on a grid, each
building on its own square plot, none touching or overlapping. Each one: [TÜR TARİFİ]. Vary roofs,
colours, balconies, laundry lines, satellite dishes, water tanks, rooftop details.
[ortak kısım]
```

Tür tarifleri:

- `apartman`: 4–6 storey Istanbul apartment block with flat roof, balconies, air-conditioner units
- `kiremit`: 2–3 storey old Istanbul house with red clay tile roof, bay windows (cumba)
- `mahalle`: 1–2 storey modest neighbourhood house, patched roof, small yard
- `yali`: 2–3 storey wooden Bosphorus waterside mansion (yalı), painted wood, ornate eaves
- `blok`: large modern block filling a whole city block: office tower, residence or shopping centre, 8–15 storeys

## 3. Simge yapılar (26 adet, tek tek)

Her biri ayrı çizim; referans olarak yapının gerçek fotoğrafını ekle. Yapı, haritadaki dikdörtgen alanına oturacak; alanın en-boy oranı aşağıda (kare cinsinden).

```
Isometric game landmark sprite of [YAPI ADI], Istanbul, based on the reference photo. The whole building
with its base, standing on a rectangular plot [EN]x[BOY] tiles wide, plot edges parallel to the isometric
axes. Recognisable silhouette, simplified details.
[ortak kısım]
```

Öncelik sırası (oyuncunun en çok gördükleri önce): Galata Kulesi, Ayasofya, Sultanahmet Camii, Taksim Meydanı, Kız Kulesi, Dolmabahçe Sarayı, Topkapı Sarayı, Çamlıca Kulesi, Rumeli Hisarı, Maslak gökdelenleri, stadyumlar (Rams Park, Şükrü Saracoğlu, Tüpraş, Başakşehir, Atatürk Olimpiyat), konser alanları (Zorlu PSM, Volkswagen Arena, KüçükÇiftlik Park, Harbiye Açıkhava), Esenler Otogarı, Havalimanı terminali, Avrasya Tüneli girişi.

Köprüler (15 Temmuz, FSM, Yavuz Sultan Selim, Galata) en sona: yolun üstünden geçtikleri için kulelerin ve halatların ayrı katman olarak çizilmesi gerekir; alan ölçülerini ve katman tarifini o aşamada çıkaracağım.

Alan ölçülerini `data/harita.json` → `simge_alanlari` içinden okuyup her yapı için hazır istem listesi üretebilirim.

## 4. Ağaçlar

Tek sayfa, 4×4:

```
A 4x4 sheet of 16 different isometric tree sprites for a city game: plane trees, cypresses, pines,
Judas trees in pink bloom, small street trees. Each with trunk and crown, evenly spaced, none touching.
[ortak kısım]
```

## Değişmeyenler

- **Yolcular ve karakterler:** harita figürleri ve portreler olduğu gibi kullanılır.
- **Zemin:** yollar, şeritler, parklar, su ve semt adları kodla çizilir.
- **Bahçe ve sokak eşyaları:** yerde düz durur.
- **Arayüz:** kapak, düğmeler, simgeler, bilgi şeridi.

## Teslim

- PNG, en az 1024 px, düz açık gri arka plan (ayıklamayı betik yapar: `CLAUDE.md` → Görseller).
- Bir türün bütün çizimleri aynı sohbette, aynı istemle üretilirse çizgi kalınlığı ve renkler tutarlı kalır.
- Görseller `assets/` altına geldikçe oyuna bağlanır; gelmeyen türler kodda uyarlanmış hâliyle çalışmaya devam eder. Yani parça parça ilerlenebilir.
