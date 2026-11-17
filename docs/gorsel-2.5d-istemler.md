# 2.5D görseller: hazır Gemini istemleri (2. sürüm)

İlk turdaki çizimler fazla "kalıp" çıktı: tek sayfada 16 nesne istendi ve stil referansı yoktu. Bu sürümde:

- **Sayfa başına 4 nesne (2×2):** her nesneye daha çok özen düşer.
- **Stil referansı:** her Gemini sohbetinin başında bir kez `docs/gorsel/stil-referans.png` eklenir; eski 2D çizimlerimizden derlendi.
- **Karikatür talimatı:** biraz eğri büğrü, abartılı, mizahi ayrıntılı.
- **Simge yapılar aslına sadık:** her yapının gerçekte nasıl olduğu yazılı ve "gerçekte olmayanı ekleme" uyarısı var.

## Nasıl kullanılır

1. Yeni bir Gemini sohbeti aç.
2. **İlk mesaj:** `stil-referans.png` görselini ekle, altına **0. Stil mesajı** kutusunu yapıştır, gönder. Gemini "anladım" der; bir şey çizmesine gerek yok.
3. Aynı sohbette sırayla 1, 2, 3… kutularını gönder. Her kutu bir görsel üretir.
4. Görselleri indirip Claude'a yükle; numarasını da yaz (örneğin "5. istem").
5. Gemini hakkın biterse kaldığın numarayı not et, ertesi gün yeni sohbette yine 0 ile başla.

Bir simge yapı gerçeğine benzemezse yalnızca onu yeniden iste. O sefer o yapının gerçek bir fotoğrafını da ekleyip "bu fotoğraftaki binayı çiz" demek en garanti yoldur.

## 0. Stil mesajı (her sohbetin ilk mesajı, stil-referans.png ile)

```
This image is the style reference for a mobile game set in Istanbul. Every picture I ask for in this chat
must look like it was drawn by the same artist: a Turkish satirical comic magazine cartoonist (Uykusuz /
LeMan tradition). Bold, slightly wobbly hand-inked black outlines, flat colours from a limited palette,
halftone dots and hatching for shading (no gradients), a slight misregistered-print feel, a little
crooked and exaggerated, with small humorous everyday details. No 3D render look, no glossy surfaces,
no text, no letters, no logos, no club crests, no brand names.
Camera for every picture: classic 2:1 isometric game view, 45 degrees from the side and about 30 degrees
from above, the same angle in every picture. Light from the upper left. Plain flat light-grey background
(#D9D9D9), no ground under the objects, no cast shadow on the background, every object fully inside the
frame with a margin, objects never touching each other.
Just reply "ready"; I will send the requests one by one.
```

## Simge yapılar (önce bunlar; oyunda hâlâ eksikler)

Her simge yapı kendi düz arsasının (kaidesinin) üstünde durur. Arsanın uzun kenarı sol alttan sağ üste uzanır.

### 1. Stadyumlar

```
A 2x2 sheet of 4 isometric landmark sprites, each on its own flat rectangular base plot, in this order
(top left, top right, bottom left, bottom right). Draw each one as the REAL stadium looks today; do not
add towers, domes, arches or columns that the real building does not have.
1. Rams Park (Galatasaray, Istanbul): a modern enclosed rectangular stadium. One continuous sweeping
   roof covers all four stands, with an opening only above the pitch. The outside is wrapped in smooth
   light grey and silver cladding. A large concrete arch carries the west stand. Seats red and yellow.
   Rows of solar panels on the roof. No towers.
2. Şükrü Saracoğlu Stadium (Fenerbahçe, Kadıköy): a compact rectangular stadium squeezed into a dense
   city block. Four steep stands close to the pitch, all covered by one flat steel roof on thin steel
   trusses. Plain concrete and glass outer walls. Seats yellow and navy blue. No towers, no corner
   towers, no arches, no domes.
3. Tüpraş Stadium (Beşiktaş), on the Bosphorus shore: an oval stadium whose outer wall is a ring of
   tall stone-coloured arches and columns, like a modern Colosseum with Ottoman details. Two small
   square historic stone towers from the old İnönü Stadium stand at one side. A light oval steel roof
   covers the stands. Seats black and white.
4. Başakşehir Fatih Terim Stadium: a compact modern stadium (about 17,000 seats). The facade is clad
   in white and light grey triangular panels, some translucent. A membrane roof made of triangular
   facets covers all stands. Seats orange and navy blue. No towers.
```

### 2. Olimpiyat stadı ve konser alanları

```
A 2x2 sheet of 4 isometric landmark sprites, each on its own flat rectangular base plot, in this order.
Draw each one as the REAL place looks; do not invent extra buildings or towers.
1. Atatürk Olympic Stadium: a large oval stadium with a red running track around the pitch, stands
   partly sunk into the ground. Over the main west stand, a huge white steel roof shaped like a crescent
   moon floats above the seats, held up by two tall concrete pylons. A smaller roof covers the opposite
   stand. The two curved ends have no roof.
2. Harbiye Cemil Topuzlu Open-Air Theatre: a semicircular open-air amphitheatre. Stone stepped seating
   rows curve around a flat stage, a plain stage wall stands behind the stage, tall park trees all
   around. No roof.
3. KüçükÇiftlik Park: an open-air concert ground on a big lawn surrounded by trees. One big temporary
   concert stage with a black steel lighting truss and two speaker towers at one end, a few food stalls
   along the edges. No permanent building.
4. Volkswagen Arena (Maslak): a large plain box-shaped concert hall of exposed grey concrete with steel
   details and a flat steel-framed roof, a wide entrance canopy, a small plaza in front.
```

### 3. Zorlu, Taksim, otogar, gökdelenler

```
A 2x2 sheet of 4 isometric landmark sprites, each on its own flat rectangular base plot, in this order.
Draw each one as the REAL place looks; do not invent extra towers or domes.
1. Zorlu Center (with Zorlu PSM): a low wide shopping and arts complex whose roof is a wavy green
   landscaped park with walkways, and a few modern glass towers rising at its edges.
2. Taksim Square: a big open paved square. In the middle, the Republic Monument: a small stone monument
   with bronze statue groups on its sides. On one side, the Atatürk Cultural Center: a long low modern
   building with an all-glass front through which a huge red sphere is visible inside. On the other side,
   Taksim Mosque with one dome and two minarets. Trees of Gezi Park at one edge.
3. Esenler Bus Terminal: a very large multi-level concrete bus terminal built around a central yard,
   with many bus platforms and long-distance coaches parked side by side, a few small ticket booths.
4. Maslak business district: a cluster of five modern glass skyscrapers of different heights and
   shapes, close together.
```

### 4. Havalimanı ve tünel

```
A 1x2 sheet of 2 isometric landmark sprites, side by side, each on its own flat rectangular base plot.
Draw each one as the REAL place looks.
1. Istanbul Airport: a very long low terminal building with a huge flat roof dotted with rows of square
   skylights and glass facades, a few jet bridges with parked airliners. Next to it the control tower,
   about 90 m tall, shaped like a tulip: a smooth slender curved stem that widens into a rounded top.
2. Eurasia Tunnel entrance: a road going down into a concrete tunnel portal under a long arched
   steel-lattice canopy that covers the approach road; inside the single tube the road runs on two
   stacked decks (upper and lower). A row of toll gantries before the canopy.
```

## Binalar (daha karakterli yenileri)

Her tür için iki istem: aynı istemi iki kez gönder, ikincisinin başına "Another 4 different ones:" yaz. Böylece her türden 8 çeşit olur.

### 5–6. Mahalle evleri (tek katlı, gecekondu)

```
A 2x2 sheet of 4 different isometric building sprites, each on its own small square plot, same scale.
Each one: a small single-storey Istanbul neighbourhood house (gecekondu): ground floor only, patched
corrugated or tiled roof, a blue plastic water tank and a satellite dish on the roof, a tiny yard with a
low garden wall, a few potted plants or a vine, laundry on a line, maybe a sleeping cat or a plastic
chair. Each house a different colour and a little crooked.
```

### 7–8. Apartmanlar

```
A 2x2 sheet of 4 different isometric building sprites, each on its own square plot, same scale.
Each one: a 4 to 5 storey ordinary Istanbul apartment block with a flat roof and balconies: closed-in
glass balconies, air-conditioner units, satellite dishes, laundry lines, a corner grocery shop on the
ground floor with an awning (no text). Each one a different faded colour.
```

### 9–10. Kiremitli eski evler

```
A 2x2 sheet of 4 different isometric building sprites, each on its own square plot, same scale.
Each one: an old 2 to 3 storey Istanbul house with a red clay tile roof and a projecting bay window
(cumba), wooden shutters, a chimney, a vine or bougainvillea on the wall, slightly sagging and crooked.
Each one a different pastel colour.
```

### 11–12. Yalılar

```
A 2x2 sheet of 4 different isometric building sprites, each on its own square plot, same scale.
Each one: a 2 to 3 storey wooden Bosphorus waterside mansion (yalı): painted horizontal wood cladding,
wide eaves, tall windows in rows, a small boat landing on the water side. Colours: white, dusty
red (yalı red), pale yellow, pale blue.
```

### 13–14. Büyük bloklar

```
A 2x2 sheet of 4 different isometric building sprites, each on its own square plot, same scale.
Each one fills a whole city block: a 10 to 15 storey office tower, a residence tower, a shopping mall,
a hospital. Rooftop machinery, a few rooftop gardens, ordinary Istanbul look rather than futuristic.
```

## Mevcut simge yapıların yenisi

Oyundaki 8 simge yapının daha aslına sadık hâli. Yine her yapı kendi düz arsasında; arsanın uzun kenarı sol alttan sağ üste.

### 15. Kuleler ve hisar

```
A 2x2 sheet of 4 isometric landmark sprites, each on its own flat base plot, in this order.
Draw each one as the REAL building looks today; do not add towers, domes or walls it does not have.
1. Galata Tower: a tall cylindrical medieval stone tower (about 67 m) with a pointed conical lead-grey
   roof; just below the roof a ring of arched windows with a narrow balcony around it. At its foot a
   small cobbled square and a few old narrow 3-4 storey Galata houses.
2. Maiden's Tower (Kız Kulesi): a tiny rocky islet in the sea with a low stone platform wall around it;
   on it a small white stone building and a slender stone tower with a lead-grey domed top and a
   flagpole. Sea water around the islet on the base plot.
3. Çamlıca Tower: a very tall slender white telecommunication tower (about 370 m) rising from a wooded
   hilltop; it flares out at the base, has glass-banded observation floors near the top and ends in a
   long antenna mast. Pine trees and a small plaza around its foot.
4. Rumeli Fortress (Rumeli Hisarı): a 15th-century stone fortress on a steep green slope going down to
   the Bosphorus shore: three big towers (round and polygonal, some with pointed grey roofs) and
   several small towers, joined by crenellated walls that climb the slope. Grass and trees inside the
   walls. No modern buildings.
```

### 16. Camiler ve saraylar

```
A 2x2 sheet of 4 isometric landmark sprites, each on its own flat base plot, in this order.
Draw each one as the REAL building looks today; do not add or remove minarets, domes or towers.
1. Hagia Sophia: a massive building with one huge shallow lead-grey central dome on a ring of small
   windows, two big half-domes on its sides, heavy sloping buttresses, ochre-pink plastered walls and
   exactly four minarets at the corners (one of them in red brick, the others white stone).
2. Blue Mosque (Sultanahmet Mosque): grey stone mosque with a big central lead-grey dome surrounded by
   cascading half-domes and small domes, exactly six slender pencil minarets (four at the corners of
   the mosque and two at the far corners of the courtyard), and a large courtyard ringed by an arcade
   of small domes.
3. Topkapı Palace: a palace complex of low buildings around green courtyards on a point above the sea:
   the Tower of Justice (a square stone tower with a tall pointed conical lead roof) beside the domed
   Imperial Council hall, the long palace kitchens with a row of tall chimneys, the Gate of Salutation
   with two octagonal towers with pointed roofs, many small lead domes and big old trees.
4. Dolmabahçe Palace: a long, low, white marble palace along the Bosphorus shore, with a richly
   carved European baroque facade, a wide central ceremonial hall in the middle with a big lead-grey
   roof dome, ornate waterfront gates and a quay with iron railings on the sea side, formal gardens on
   the land side. Do not add a clock tower on the palace.
```

### 17. Köprüler

Köprüler yolun üstünden geçtiği için oyuna bağlanmaları ayrı iş; şimdiden çizdirebilirsin.

```
A 2x2 sheet of 4 isometric bridge sprites in this order. Each bridge seen from the same isometric angle,
running from the lower left to the upper right, with a short piece of shore at both ends and no water
drawn under it (plain background). Draw each one as the REAL bridge looks.
1. 15 July Martyrs Bridge (first Bosphorus Bridge): a suspension bridge with two slender steel towers,
   each a simple portal of two legs joined at the top, two main cables, and diagonal zigzag hanger
   cables (not vertical) holding a six-lane deck.
2. Fatih Sultan Mehmet Bridge (second Bosphorus Bridge): a suspension bridge with two steel portal
   towers, two main cables and vertical hanger cables, an eight-lane deck.
3. Yavuz Sultan Selim Bridge (third Bosphorus Bridge): a very tall hybrid bridge with two A-shaped
   concrete towers; fans of straight stay cables run from the towers to the deck, and suspension cables
   with vertical hangers carry the middle of the span; a wide deck with road lanes and a rail track in
   the middle.
4. Galata Bridge (over the Golden Horn): a long low flat bridge on many short piers with a lifting
   middle section; the upper level carries a road with tram tracks and is lined with fishermen holding
   long rods over the railings; the lower level has a row of small fish restaurants under the road.
```

## Sonra

- **Araçlar ve ağaçlar:** şimdilik yeterli.
