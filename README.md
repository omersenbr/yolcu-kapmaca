# Yolcu Kapmaca — devir paketi

Bu klasör, claude.ai’de geliştirilen prototipi Claude Code’da gerçek bir mobil oyun projesine dönüştürmek için hazırlandı.

## Başlarken
1. Bilgisayarına Node.js (LTS) ve Claude Code’u kur (masaüstü uygulaması ya da terminal).
2. Bu klasörü bir yere aç ve Claude Code’u bu klasörde başlat.
3. İlk mesaj olarak şunu yaz: “CLAUDE.md’yi oku ve 1. adımla başla: projeyi kur ve prototipi modüllere bölerek taşı.”

Claude Code proje bilgisini `CLAUDE.md` dosyasından okur; her şeyi baştan anlatmana gerek yok.

## İçerik
- `CLAUDE.md`: oyunun kuralları, kararlar, görsel dil, yapılacaklar.
- `prototip/yolcu-kapmaca.html`: çalışan son prototip; tarayıcıda açılabilir.
- `data/`: diyaloglar ve İstanbul haritası (JSON).
- `assets/`: bütün görseller ayrı dosyalar olarak ve `manifest.json`.
- `docs/stil-rehberi.md`: görsel kurallar.

## claude.ai’deki bağlantılar
- Oyun (prototip): https://claude.ai/artifact/NE1FUXF9qMBDnQiYmDRWqc
- Görsel üretim promptları: https://claude.ai/artifact/L8dj66dK1nVsLW9ghkADxD
- Diyalog senaryoları: https://claude.ai/artifact/ANeyt3BXahoy7ghYFwzUPw

## Yeni görseller
Gemini’den aldığın görselleri `assets/incoming/` gibi bir klasöre at ve Claude Code’a “incoming klasöründeki görselleri kesip oyuna ekle” de; yükleme sınırı yok.
