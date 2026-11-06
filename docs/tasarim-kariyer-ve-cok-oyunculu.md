# Kariyer, ekonomi ve çok oyunculu mod — tasarım

Durum: taslak. Kullanıcının kararları **kalın** yazıldı; geri kalanı öneridir ve oynanarak ayarlanacaktır.
Sayıların hepsi ilk tahmindir. Kodda değil, `data/ekonomi.json` dosyasında duracak.

## 1. Temel fikir

Sıfır sermayeyle, başkasının aracında başlarsın. Her gün kazandığının bir kısmını başkasına bırakırsın. Merdiveni tırmandıkça sen başkalarından pay alan taraf olursun. Bu “alttan başlayıp patron olma” döngüsü (tycoon oyunları, *Taxi Life*, *Drug Wars*, *Cash Inc.* benzeri) oyuncuyu her gün geri getirir. Bir sonraki basamak her zaman görünür ve ulaşılabilir olmalı.

## 2. Para birimleri

| | Nasıl kazanılır | Nerede harcanır |
| --- | --- | --- |
| **TL** | **Yolculardan.** Taksimetre, pazarlık, bahşiş | Plaka kirası, plaka, araç, durak, benzin, cezalar, bakım |
| **Dolar** | **Gerçek parayla; bazı turistleri dolandırarak; TL’yi döviz bürosunda çevirerek** | Süsler, boya, durak tabelası, mahalle bayrağı, avukat/torpil, hızlandırmalar |

**Döviz bürosu (öneri):**
- Kur her oyun günü biraz oynar (örnek: 1 $ = ₺34–38), alış ve satış arasında %5 makas var. Ucuzken dolar biriktirmek küçük bir “borsa” zevki verir.
- Gazete manşeti olayları kuru sallar (“Kur uçtu!”). Gazete başlığı görseli zaten var.
- Makas, TL’nin oyundan çıkıp gittiği bir yer. Enflasyonu frenler.

**Turistten dolar:** Fahiş fiyat dolandırıcılığı başarılı olursa bazı turistler dolarla öder. Risk de büyük: şikayet, vlogcu turistin canlı yayını. Bu, dolar kazanmanın oyun içi ve riskli yolu olur.

**Kazanmak için ödeme (pay-to-win) sınırı (öneri):** Plaka, durak ve araç **yalnızca TL ile** alınsın. Gerçek parayla alınan dolar görünüşe, kolaylığa ve “son şans”a gitsin. Aksi hâlde durak savaşları cüzdan savaşına döner ve çok oyunculu mod bozulur. Dolar dolaylı yoldan TL’ye çevrilebilir, ama günlük sınırla.

## 3. Taksici kariyeri

**Gerçek rakamlar** (sayılar `data/ekonomi.json` içinde):
- Vardiya: şoför 12 saat için **₺3 000** öder, kalanı şoförün. **Plakayı kendi aracınla kiralayan da hep ₺3 000 öder**; aylık karşılığı ~**₺80 000**.
- Taksi plakası satın alma: **₺11,6–12,2 milyon** (Kasım 2026 bayi fiyatları; kullanıcının ilk tahmini 7–8 milyondu, piyasa yükselmiş). Aylık kira piyasada ₺67–80 bin.
- Günlük brüt kazanç: hafta içi **₺10 000’e kadar**, cuma, cumartesi ve pazar **₺10 000’in üstü**.

| Basamak | Durum | Para akışı |
| --- | --- | --- |
| 1. **Şoför** | **Araç ve plaka patronun** | **₺3 000/vardiya, kalanı senin.** İlk 3 gün çırak indirimi: ₺1 500. |
| 2. **Kendi aracı + kiralık plaka** | Önce eski bir taksi alırsın | **Kira yine ₺3 000.** Fark araçta: **eski araçta yolcular homurdanır, şikayet ihtimali artar** (×1,5). Yeni araç şikayeti azaltır, bahşişi artırır. |
| 3. **Plaka sahibi** | **Plaka satın alırsın** (~₺12 M) | Öneri: hisseli plaka (1/8, 1/4, 1/2). İstanbul’da gerçekten var, ara hedef olur. Plaka değeri piyasayla oynar. |
| 4. Filo | Birden çok plaka | Plakaları NPC şoförlere ya da **arkadaşlarına** verirsin; artık ₺3 000’ü alan sensin. |
| 5. **Durak sahibi / Plaka Ağası** | Durak satın alırsın | Duraktaki herkesten aidat, bölge kontrolü, sezon sıralaması. |

**Hafta:** oyun günleri haftanın günlerini takip eder (Pazartesi → Pazar). **Cuma, cumartesi ve pazar en yoğun günler**: daha çok yolcu, daha uzun yolculuk, gece hayatı. Ücretler ve yolcu yoğunluğu, ortalama bir şoför bu hedeflere ulaşacak şekilde ayarlanacak (bugünkü taksimetre bir oyun gününde ₺3 000’ü zor çıkarıyor).

**Tempo sorunu (karar bekliyor):** gerçek rakamlarla bir şoför haftada ~₺40 000 net biriktirir. Tam plaka (₺12 M) ~300 oyun haftası, yani ~280 saat oynanış eder. Seçenekler bir sonraki bölümde.

## 4. Tag’ci kariyeri

Tag seviyeleri (emektar hatchback → siyah lüks sedan) zaten var. Kariyerde seviye artık **sahip olunan araçla** belirlenir.

| Basamak | Durum | Para akışı (ilk tahmin) |
| --- | --- | --- |
| 1. **Arkadaşının aracı** | **Arkadaşa ve Tag sistemine pay** | Öneri: %25 arkadaşa, **daha cüzi** %10 Tag’e. |
| 2. **İlk kendi araban** | **Eski, çok yakar** | Yalnızca %10 Tag payı, ama benzin ×1,6 ve ara sıra arıza. |
| 3. **Daha yeni ve pahalı arabalar** | Seviye 3–5 | Bugünkü kurallar: ücret ×1,0 → ×1,5, sabır ve bahşiş artar. Benzin azalır. |
| 4. **Arkadaşlarını çalıştırmak** | Filo | Araçlarını mahalledeki oyunculara ya da NPC’lere verirsin, pay alırsın. |

## 5. Eğlenceyi artıran öneriler (benzer oyunlardan)

- **Vardiya kararı:** her gün başında küçük bir seçim yapılır, sonucunu gün belirler. Örnek: yüzde mi, sabit kira mı? Hangi araç? Avukat sigortası alınsın mı?
- **Çevrimdışı kazanç:** plaka ve araç kiraları oyuncu yokken de birikir; geri gelince “Yokken ₺8 400 birikti” ekranı.
- **Gazete manşeti:** gün sonu ekranı (zaten var) kur, durak el değiştirmesi ve sezon liderini de yazar.
- **Sezon (haftalık):** semt kontrolü puanı sıfırlanır, mülkler kalır. Sezon sonunda süs ve rozet ödülleri.
- **Sert ceza ama kalıcı kayıp yok:** tek oyunculu modda “araç bağlandı → her şey sıfır” kalsın. Kariyerde araç otoparka çekilir; ceza ödenir ya da birkaç gün o araç kullanılamaz. Haftalar süren ilerleme tek bir sivil çevirmede silinirse oyuncu küser.
- **Kademeli açılan özellikler:** döviz bürosu, plaka piyasası, durak satın alma, telsizle ekip yardımı. Hepsi ilk günden açık olmaz, basamaklar ilerledikçe açılır. Yeni oyuncu boğulmaz.

## 6. Durak ve mahalle (çok oyunculu)

- **Taksi durağı:** **aynı duraktan birden çok arkadaş bağlanır.** Kapasite durağın plaka sayısıyla artar. Kazanç bireysel; durak sahibi aidat alır. Durak kasası, bakım ve savunma için ayrı tutulur.
- **Tag mahallesi:** **aynı mantık.** CLAUDE.md’ye göre bir mahallede en fazla 3 kişi olur, ekip komşu mahallelere yayılır.
- **Bölge bakım maliyeti:** her durak ve mahalle günlük bakım ister. Ödenmezse önce itibar düşer, sonra durak **açık artırmaya** düşer. Bu, büyüyen ekibi frenler ve yeni ekiplere kapı açar.

### Durak el değiştirmesi

**Kural: durak her zaman parayla alınır. Savaş ve diplomasi yalnızca fiyatı değiştirir; sadece savaşarak durak alınamaz.**

| Yol | Fiyata etkisi (öneri) |
| --- | --- |
| Para | Liste fiyatı: durağın günlük gelirinin ~60 katı. |
| **Savaş** | Rakip bölgede kazanılan her durakçı kavgası durağın itibarını düşürür. Fiyat en fazla %40 iner. İtibar zamanla toparlanır; savaş sürekli sürdürülmeli. |
| **Diplomasi** | Teklif ve karşı teklif. İyi ilişki ya da ittifak %20’ye kadar indirim veya taksitle ödeme sağlar. NPC sahiplerin bir ruh hâli olur (ödenmemiş borç, eski kavgalar). |
| Açık artırma | Bakımı ödenmeyen durak en yüksek teklife gider. |

Oyuncunun durağı onun rızası olmadan satılmaz. Tek istisna, bakım ödenmezse düşülen açık artırmadır.

## 7. Oyuncular arası sorgu ve kavga

- **Sorgudaki oyuncular haritada donar.** Araçlarının üstünde bir sorgu simgesi görünür.
- **Kavgadakilerin üstünde duman bulutu ve “PAT! KÜT!” yazıları çıkar.** Bu çizim tek oyunculuda NPC kavgaları için zaten var.
- **Bu sırada ikisi de dokunulmazdır. Tek istisna: aynı duraktan ya da mahalleden biri sorguya katılıp arkadaşına yardım edebilir.** Öneri: yardım ilk birkaç saniye içinde, 6 karelik mesafeden katılabilir. Dövüşte “yardıma gelen meslektaş” bonusu zaten var. Yardım iki taraf için de geçerli: herkes kendi ekibinden yardım alabilir.
- **Akış:** taksici oyuncu Tag’ci oyuncuyu yakaladığında taksiciye `taxiCatchTag` soruları, Tag’ciye `tagVsTaxi` cevapları açılır. Süreli sırayla ilerler, sunucu hakemdir. Kavgada iki taraf da VUR’a basar, şans iki hızın oranından hesaplanır.

## 8. Tek oyunculu profil çok oyunculuya taşınmalı mı? (görüşüm)

**Kısmen.** Taşınsın:
- Kullanıcı adı ve görünüş.
- Süsler ve kavga eşyaları (zaten bedava ve kozmetik).
- Tek oyunculu rekorlara göre küçük ve sınırlı bir “hoş geldin” rozeti.

**Taşınmasın:** TL, dolar, Tag seviyesi ya da araçlar.
- Tek oyunculu ilerleme telefonda (yerel kayıtta) tutuluyor, kolayca değiştirilebilir. Taşınırsa çok oyunculu ekonomi ilk günden hileye açık olur.
- Ekonomiler de farklı. Tek oyunculuda para her gün sıfırdan başlıyor; kariyerde birikiyor.

Herkesin şoför olarak aynı çizgiden başlaması çok oyunculu modun adaletini korur.

## 9. Teknik çerçeve

- **Simülasyon ayrıldı** (`src/sim/`, ekrana bağımlılığı yok). Aynı kod Node’da koşuyor: `npm run sim`.
- **Ölçüm** (`tools/headless.ts`, tek çekirdek, kare başına): 511 araç 0,39 ms, 2 500 araç 1,2 ms, 5 500 araç 2,8 ms, 10 500 araç 4,7 ms. Saniyede 30 güncellemeyle 10 000 araçlık şehir tek çekirdeğin ~%14’ü.
- **Sunucu:** yetkili sunucu (Node + WebSocket, ör. Colyseus). Hareket, yolcular, para ve satın almalar sunucuda hesaplanır. Telefon yalnızca çevresindeki 30–40 kareyi alır. Izgara hareketi sayesinde yalnızca “kare değişti / yön değişti” olayları gönderilir; oyuncu başına saniyede birkaç KB.
- **Kalıcı veri:** Supabase ya da Firestore. Kasa, plakalar, duraklar, ekipler, sezon burada tutulur. Anlık araç senkronu için kullanılmaz.
- **İlk hedef:** şehir başına 1 000–1 500 NPC araç + 50–100 gerçek oyuncu.

## 10. Yol haritası

1. ~~Simülasyonu ekrandan ayır~~ (yapıldı; davranış eşitlik testiyle doğrulandı).
2. **Tek oyunculu kariyer:**
   - `data/ekonomi.json`; şoför → kiracı → plaka sahibi ve Tag merdiveni.
   - Döviz bürosu, kalıcı kasa.
   - Rakip duraklar ve mahalleler botların elinde.
   - Denge oynanarak ayarlanır.
3. **Sunucu ve kooperatif:** 3 arkadaş aynı duraktan ya da mahalleden; donma, simge ve ekip yardımı.
4. **Oyuncuya karşı oyuncu:** sorgu ve kavga, durak satın alma, savaş ve diplomasi indirimi, bakım ve açık artırma.
5. **Sezonlar, çevrimdışı kazanç, dolar mağazası.**

## Açık sorular

1. Şoför payı (%50), kira (₺2 500/gün), plaka (₺150 000) ve durak fiyatı oranları uygun mu? İlk oynanışta ayarlanacak.
2. Kariyer modu tek oyunculu “günlük” modun yerine mi geçecek, yanında mı duracak? Önerim: yanında; ana ekranda “Hızlı gün” ve “Kariyer”.
3. Kariyerde günler birbirine bağlı mı (her gün 8 dakika), yoksa oyuncu istediği kadar mı oynar? Önerim: gün yapısı kalsın, çünkü vardiya ve kira kararları gün başında verilir.
