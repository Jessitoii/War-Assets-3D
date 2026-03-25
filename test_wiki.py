import httpx
import asyncio
import mwparserfromhell
import json


async def debug_mining_v5(title):
    url = "https://en.wikipedia.org/w/api.php"
    headers = {"User-Agent": "WarAsset3D_FinalTest/5.0 (alpercanzerr1600@gmail.com)"}

    # Parametrelerde 'extracts' (özet) ve 'revisions' (ham içerik) beraber
    params = {
        "action": "query",
        "titles": title,
        "prop": "revisions|extracts",
        "exintro": True,  # Sadece giriş paragrafı
        "explaintext": True,  # Temiz metin formatı
        "rvprop": "content",  # Ham wikitext (şablonlar için)
        "format": "json",
        "redirects": 1,
    }

    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        print(f"--- [DEEP MINING V5] {title} ---")
        resp = await client.get(url, params=params)
        data = resp.json()
        page = next(iter(data["query"]["pages"].values()))

        if "missing" in page:
            print("❌ HATA: Sayfa bulunamadı.")
            return

        # 1. ÖZET METNİ (Summary)
        summary = page.get("extract", "ÖZET BULUNAMADI")

        # 2. TEKNİK ŞABLONLAR (Wikitext Mining)
        raw_content = page.get("revisions", [{}])[0].get("*", "")
        wikicode = mwparserfromhell.parse(raw_content)

        tech_payload = []
        for template in wikicode.filter_templates():
            name = str(template.name).lower().strip()
            if any(
                k in name
                for k in ["infobox", "specs", "performance", "armament", "engine"]
            ):
                tech_payload.append(str(template))

        # --- SONUÇLARI GÖSTER ---
        print("\n--- [A] SUMMARY (LLM'e Gidecek Bağlam) ---")
        print(summary[:600] + "..." if len(summary) > 600 else summary)

        print("\n--- [B] TEKNİK ŞABLONLAR (Rakamlar) ---")
        if not tech_payload:
            print("⚠️ UYARI: Teknik şablon bulunamadı!")
        else:
            for i, block in enumerate(tech_payload):
                print(f"\n[BLOK {i+1}]:\n{block[:300]}...")

        # --- DOĞRULUK KONTROLÜ ---
        print("\n--- [C] VERİ ANALİZİ ---")
        check_list = {
            "Giriş Metni Uzunluğu": f"{len(summary)} karakter",
            "Bulunan Şablon Sayısı": len(tech_payload),
            "Kanat Açıklığı Verisi": (
                "✅ VAR" if "|span" in str(tech_payload).lower() else "❌ YOK"
            ),
            "Motor Verisi": (
                "✅ VAR"
                if "eng1" in str(tech_payload).lower()
                or "engine" in str(tech_payload).lower()
                else "❌ YOK"
            ),
        }
        for label, val in check_list.items():
            print(f"{label:25}: {val}")


if __name__ == "__main__":
    # Test için EADS_Barracuda kullanıyoruz
    asyncio.run(debug_mining_v5("EADS_Barracuda"))
