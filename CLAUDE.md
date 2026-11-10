# Yolcu Kapmaca — Claude Code proje talimatı

Bu dosya projeyi devralan Claude için. Proje claude.ai sohbetinde tek dosyalık bir HTML prototip olarak geliştirildi; şimdi gerçek bir mobil oyun projesine dönüştürülecek. Kullanıcıyla Türkçe konuş. Oyunun bütün metinleri Türkçe.

## Oyun nedir

İstanbul’da geçen, mizah dergisi tarzında bir mobil oyun. Oyuncu iki rolden birini seçer:

- **Taksici:** Yolcu alır, kısa mesafeyi bahaneyle geçiştirir, yolu uzatıp taksimetreyi şişirebilir ama şikayet yer. Başka durakların bölgesinde durakçılar onu sıkıştırır. Yolcu taşıyan Tag araçlarını yakalayıp sorgular; kavgaya karışırsa polise yakalanıp hapse düşebilir.
- **Tag’ci (uygulama ile yolcu taşıyan sürücü):** Taksicilerin gözü önünde yolcu almamaya, polise ve görünmez sivil çevirmelere yakalanmamaya çalışır. Araç bağlanırsa her şey sıfırlanır.

Gerçek marka adları kullanılmaz (kurgusal “Tag”). Oyun ve karakterler kurgusaldır.

## Prototip (referans uygulama)

`prototip/yolcu-kapmaca.html` her şeyin çalışan hâlidir: tek dosya, saf JavaScript ve canvas, içine JSON veri ve base64 görseller gömülü. Yeni projede davranışları buradan birebir taşı; dosya yapısını taşıma.

Prototipteki ana sistemler:

- **Harita:** 220×208 karelik ızgara (`data/harita.json`). Her satır bir string; karakterler: `~` su, `A` otoyol şeridi, `e` otoyol kenarı (sürülmez, görsel), `K` köprü, `q` köprü kenarı (görsel), `T` Avrasya Tüneli, `c` cadde, `s` sokak, `#` bina bloğu, `L` simge yapı alanı, `P` park, `F` orman, `H` havalimanı. Araçlar `A K T c s` karelerinde gider; bütün yollar tek kare genişliğinde (geniş yollar sadece görsel olarak geniş). Yol ağı tek parça, çıkmaz yok; bu kural bozulmamalı. JSON’da ayrıca semt kutuları, simge yer koordinatları, simge yapı alanları, otoyol segmentleri, köprüler, havalimanları ve tünel yolu var.
- **Hareket:** Araçlar kareden kareye akıcı gider; oyuncu parmağını kaydırarak yön verir, kavşaktan önce verilen yön kavşakta uygulanır. Serbest fizikli sürüş denendi ve reddedildi; bu “Pac-Man” mantığı korunacak. Hız çarpanları: otoyol/köprü/tünel 1,35, cadde 1,12, sokak 1. Nitro 2,2 sn, 9 sn bekleme; nitro açıkken radardan geçmek ₺300 ceza (90 sabit radar). Köprü ve tünel geçiş ücretleri var.
- **Yapay zekâ:** Oyuncuya yakın araçlar A* ile hedef seçer; 46 kareden uzaktakiler ucuz rastgele dolaşır. Sayılar alan oranında: Tag rolünde 280 taksi, 120 Tag, 140 polis; taksici rolünde 240 Tag, 120 taksi, 140 polis; 100 sivil çevirme.
- **Yolcular:** Bekleyen yolcu sınırı normal 280, yoğun saat 480, gece 160. Otoyolda yolcu çıkmaz. Yolcu profili semte ve olaya göre seçilir (aşağıda). Etkinlik dalgaları: maç çıkışı (stadyuma göre taraftar renkleri), konser, uçak, vapur, otobüs vb.
- **Sorgu sistemi:** Olaylarda karikatür paneli açılır; sorular, süreli cevaplar, şüphe göstergesi. Bütün metinler `data/dialoglar.json` içinde; değişkenler `{semt}`, `{yolcu}`, `{ab}`, `{torpil}` gibi. Kod metin içermesin, her şey bu dosyadan gelsin.
- **Dövüş:** VUR’a hızlı basılan mini oyun + şans çarkı. Kavga eşyaları şansa eklenir: tespih +%4, boks eldiveni +%6, beyzbol sopası +%10, Haydar +%16. Rakipte beyzbol sopası (−%8) ya da Haydar (−%12) olabilir; Haydar’lı rakip kazanınca “Haydari geceler, hayırlı geceler!” der.
- **Tag seviyeleri:** Teslim edilen yolcu sayısıyla 5 seviye (0, 8, 20, 38, 60): emektar hatchback → kompakt sedan → yeni hatchback → kompakt SUV → siyah lüks sedan. Seviye arttıkça ücret (×1,0 → ×1,5), yolcu sabrı ve bahşiş ihtimali artar. Seviye kalıcı.
- **Gün süresi:** Kolay 10, Orta 8, Zor 6 dakika (05:00’ten başlayıp tam gün).
- **Reklamla son şans (simüle):** Tag’ci avukat arar, taksici torpil (“Sen benim kim olduğumu biliyor musun?”). Telsiz istihbaratı ve benzin kartı ödüllü reklam fikirleri.
- **Mağaza:** 16 araç süsü ve 4 kavga eşyası; şimdilik hepsi bedava, fiyatlar veri dosyasında.
- **Sıralama:** Şimdilik yerel (localStorage), rol başına ilk 10.
- **Sunum:** Sorgu paneli açılırken kamera olaya yaklaşır ve o kare panelin arka planı olur (“donmuş kare”). Ekran geçişlerinde ekranın kendisi sağ alt köşesinden kıvrılarak çevrilir (~0,68 sn, yaklaşık 40 kare). Ana ekran mobil oyun düzeninde: tam ekran kapak, profil rozeti, iki büyük rol düğmesi, alt menü, alttan açılan sayfalar.

## Görsel dil (kesin karar)

Ayrıntılar `docs/stil-rehberi.md` içinde. Özet: Türk mizah dergisi karikatürü (Uykusuz/LeMan geleneği) + düz renkli harita. Oyun nesneleri (araçlar, yolcular) mürekkep konturlu, çevre düz. Sınırlı palet, tram noktası, hafif baskı kayması. Yazı tipleri: başlık ve düğmeler Bangers, balon ve metinler Grandstander (Türkçe karakter desteği şart). Balonlarda abartılı eğiklik yok. Emoji kullanılmaz; her simge aynı çizgi dilinde çizilmiş olmalı. Oyun “yapay zekâ işi” gibi değil, gerçek bir oyun sanatçısının elinden çıkmış gibi görünmeli.

## Görseller

Hepsi `assets/` altında, açıklaması `assets/manifest.json` içinde. Kaynak çizimler Gemini ile üretildi, arka planları ayıklandı.

- `sprites/`: 4×4 atlaslar (hücre 160 px): apartman, kiremit, yalı, mahalle, blok (3×3 tam blok), ağaç, bahçe, sokak. Semte göre dağıtım: tarihi semtler kiremit ağırlıklı, merkez apartman, dış semtler mahalle evleri, Boğaz kıyısı yalılar. Evler bloğun boş alanına sığan en büyük boyutta (yaklaşık 1,5 kare), yola taşmaz.
- `landmarks/`: stadyumlar, konser alanları, camiler, saraylar, kuleler, köprüler, havalimanı terminali, tünel girişi. Her biri haritada kendi alanına (simge yapı alanı) sığdırılır, yola taşmaz. Köprü görsellerinde kulelerin arası Boğaz’a oturacak şekilde ölçeklenir.
- `cars/`: üstten araçlar (ön yukarı). `tag1`–`tag5` Tag seviyeleri, `taxi1-3`, `police1-2`, `sivil` (sivil polis; tavandaki mavi lambayı oyun çizer). Yolcu taşıyan aracın arka koltuğunda yolcunun başı çizilir.
- `passengers/`: 12 profil, her biri harita figürü ve portre atlası; cinsiyet tablosu manifest’te. Profil seçimi: turist → turist; maç → stadyuma göre gs/fb/bjk/bsk/milli; konser → konser; havalimanı/otogar → havalimanı; kampüs çevresi → öğrenci; Boğaz kıyısı → zengin; plaza semtleri → plaza; dış semtler → kenar mahalle. İsim ve hitap portrenin cinsiyetinden seçilir.
- `characters/`: ana karakterlerin ifadeleri: taksici, tag, polis, durakçı, gizli taksici, avukat, büyük abi (patron), vlogcu turist.
- `items/`: kavga eşyaları ve araç süsleri.
- `ui/`: kapak, bilgi şeridi, kart ve yuvarlak düğmeler, simgeler, damga, efektler, gazete başlığı.

Yeni görseller gelince kesme işini betikle yap: arka plan rengini köşelerden bul, nesneyi mürekkep çizgisinden ayır, iç boşlukları (tespih halkası, köprü halatları arası) saydam bırak, gölgeyi yarı saydam yap, Gemini’nin yazdığı yazı ve marka amblemlerini temizle.

## Proje yapısı (1. adım tamamlandı)

Vite + TypeScript + düz canvas. Kod `src/` altında modüllere bölündü; ayrıntı `docs/mimari.md`. `npm run dev` ile çalışır, `npm run build` tip denetimi yapar, `npm test` (dev sunucusu açıkken) Playwright ile oyunu otomatik oynatır. Prototip referans olarak `prototip/` altında duruyor. Oyun mantığı `src/sim/` altında ve ekrandan bağımsız (`npm run sim` ile Node’da koşar); kariyer ve çok oyunculu tasarım `docs/tasarim-kariyer-ve-cok-oyunculu.md` içinde. Tek oyunculu kariyer (taksici + Tag’ci, aynı kasayla rol değiştirilebilir) çalışıyor: `src/sim/career.ts` (kurallar), `src/ui/career.ts` (ekran), sayılar `data/ekonomi.json`, metinler `data/dialoglar.json` → `kariyer`. Kariyer mekanikleri (hava, günlük görevler, yolcu puanı, kombo, yolculuk içi olaylar, müdavimler) `src/sim/ridelife.ts`. Serbest konuşma (ücretsiz, yapay zekâ servisi yok): sorgularda yazılan/söylenen cevap en yakın seçeneğe eşlenir, uymazsa kaçamak sayılır; yolculukta “Konuş” ile yolcuyla düz sohbet (`src/sim/nlu.ts`, `src/sim/chat.ts`, `src/dialog/paxChat.ts`, metinler `dialoglar.json` → `sohbet`, `serbestSohbet`). Öğretilebilir sohbet: sohbet panelinde “Öğretme modu” açıkken yolcu bilmediği cümlenin cevabını sorar, oyuncunun söylediği cevap yerelde saklanır (`src/sim/learn.ts`, `yk-ogrenilen`); Profil → “Öğrettiklerim”den kopyalanan JSON `dialoglar.json` → `sohbet.ogrenilen` içine eklenince bütün oyunculara gider. Eller serbest: karakter sözünü bitirince mikrofon kendiliğinden açılır. 2.5D görünüm (varsayılan; Profil → Görünüm’den üstten görünüme dönülür, eğim/açı/yakınlık/kamera takibi ayarlanır): `src/render/iso.ts` eldeki üstten görselleri kodda uyarlar (harita parçaları yere serilir, çatı görselleri kutu binaların tepesine oturur, araç görselleri katmanlanır, insanlar dik durur), ayarlar `src/render/isoView.ts`; kamera aracı izlerken yön verme araca göredir. Eşitlik testi üstten görünümde koşar (`yk-gorunum=ustten`). `izometrik.html` ilk bağımsız denemedir. Çok oyunculu ilk adım (ortak oturum): `server/index.mjs` (`npm run server`), istemci `src/net/mp.ts`.

## Yapılacaklar (öncelik sırasıyla)

1. ~~**Projeyi kur:**~~ (yapıldı) Vite + TypeScript önerilir; render için Phaser 3 ya da düz canvas (prototip düz canvas ve iyi çalışıyor). Kodu modüllere böl: harita, hareket ve yol bulma, yapay zekâ, yolcular ve olaylar, sorgu sistemi, dövüş, arayüz, ses. Veriler `data/`, görseller `assets/` altından yüklensin; base64 gömme yok.
2. **Prototiple eşitlik:** (test hazır: `npm run test:parity`; taksici 3000, Tag’ci 900 kare birebir aynı; bot yolcu teslim etmediği için bazı sahneler henüz kapsanmadı) Önce bütün davranışları birebir taşı; tarayıcıda Playwright ile otomatik oynatıp ekran görüntüsüyle karşılaştır.
3. ~~**Performans:**~~ (yapıldı, `docs/mimari.md`) Harita parçalı önbellekle çizilsin; görünmeyen araç ve yolcular çizilmesin; görseller sıkıştırılmış atlaslar.
4. ~~**Telefonda test:**~~ (yapıldı: https://omersenbr.github.io/yolcu-kapmaca/, `main`’e gönderimde otomatik yayın)
5. **Capacitor ile Android (sonra iOS; iOS için Mac ve Xcode gerekir).**
6. **Ertelenen mekanikler** (ilk sürümleri kariyerde yapıldı; ayrıntılandırılacak): kariyer ve ilerleme, yolcu puan sistemi, günlük görevler, yolculuk içi olaylar, şehir ve hava olayları, sürüş kombosu, tekrar eden karakterler.
7. **Çok oyunculu** (ilk adım yapıldı: ortak oturum, ekip, yardım; sırada yetkili sunucu ve oyuncular arası etkileşim): Açık dünya (semt kontrolü: her semtte durak ve mahalle; taksiciler durakları para, savaş ya da diplomasiyle alır; Tag ekipleri aynı mahalleden en fazla 3 kişi, komşu mahallelere yayılır; bölge bakım maliyeti; kalıcı dünya için Firebase benzeri sunucu; haftalık sezon) ve hızlı maç modu Plaka Ağası (agar.io benzeri filo). Önce botlarla tek oyunculu denenecek.
8. **Para kazanma:** Ödüllü reklamlar (telsiz istihbaratı, benzin, avukat/torpil son şans), kozmetik satış (süsler, boya, durak tabelası, mahalle bayrağı). Önce Türkiye, sonra şehir paketleriyle yurt dışı.

## Bilinen notlar

- Kapak görselindeki Tag aracı çivit sedan değil, beyaz; ileride düzeltilmiş kapakla değiştirilecek.
- Gemini birden çok belirli karakter ve aracın bir arada olduğu sahnelerde tutarsız; sahneler için oyunun kendi “donmuş karesi” kullanılıyor. Gemini’ye sadece tek nesnelik işler ya da referans fotoğraflı, mantığı açıkça yazılmış olay görselleri verilmeli (kimin durdurduğu, kimin durdurulduğu, arabaların yönü).
- Görsel promptları ve diyalog senaryoları claude.ai’deki iki belgede duruyor (linkler README’de).
