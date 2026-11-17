# 2.5D görseller: ne çizilecek, nasıl istenecek

> Kopyala-yapıştır hazır istemler: `docs/gorsel-2.5d-istemler.md`. Bu belge genel planı anlatır.

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

Referans görsel yüklemek gerekmez: 11 aracın hepsi tek sayfada, yazıyla tarif edilerek istenir. Araçlar haritada dört yöne gider; izometrik görünümde bu iki sayfa eder (önden ve arkadan), diğer iki yön aynalanır. Yani toplam **iki istem, iki görsel**.

Önden sayfası:

```
A sheet of 11 different isometric car sprites for a city game, arranged in a grid of 4 columns and
3 rows (last cell empty), evenly spaced, none touching or overlapping, all the same scale.
Every car is seen from the SAME angle, front-left: it points towards the lower right of the image,
its front and left side are visible, the roof is visible from above.
The cars, in reading order:
1. Yellow Istanbul taxi sedan, small yellow roof sign (no text), black-yellow checker stripe along the side.
2. Yellow Istanbul taxi sedan, slightly different body, same roof sign and checker stripe.
3. Yellow taxi minivan (boxy people carrier), roof sign, checker stripe.
4. White police sedan with blue stripes along the sides and a red-blue light bar on the roof.
5. White police sedan, slightly different body, blue side stripes, red-blue roof light bar.
6. Plain black unmarked sedan, no roof equipment.
7. Old worn beige hatchback, faded paint, a little rust.
8. Indigo-blue compact sedan.
9. Teal-green modern hatchback with a dark glass roof.
10. Steel-blue compact SUV with a sunroof.
11. Black luxury sedan, long and low, with a sunroof.
[ortak kısım]
```

Arkadan sayfası: aynı istem, yalnızca açı cümlesi değişir:

```
Every car is seen from the SAME angle, rear-left: it drives away towards the upper right of the image,
its rear and left side are visible, the roof is visible from above.
```

İki sayfayı aynı sohbette art arda iste (“now the same 11 cars, same order, same colours, seen from the rear-left”); böylece önden ve arkadan çizimler aynı araç gibi durur. Sayfadaki sıra oyundaki adlara karşılık gelir: 1–3 `taxi1`–`taxi3`, 4–5 `police1`–`police2`, 6 `sivil`, 7–11 `tag1`–`tag5`; kesip adlandırmayı betik yapar.

Sayfada araçlar birbirine karışırsa ya da sayı tutmazsa iki sayfaya böl: taksiler ve polisler (1–6), Tag araçları (7–11).

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
