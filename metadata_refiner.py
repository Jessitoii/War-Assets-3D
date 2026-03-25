import json
import os
import asyncio
import httpx
import time
import re
from tqdm import tqdm
from dotenv import load_dotenv
from groq import Groq
import orjson
import sys
import mwparserfromhell

load_dotenv()

# --- CONFIG ---
JSON_PATH = "./mobile/assets/data/military-assets.json"
OUTPUT_PATH = "./mobile/assets/data/military-assets-v29.json"
LOG_FILE = "processed_assets.log"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("ERROR: GROQ_API_KEY missing.")
    exit(1)

client = Groq(api_key=GROQ_API_KEY)
MODEL_QUEUE = ["llama-3.3-70b-versatile", "qwen-qwq-32b", "llama-3.1-70b-versatile"]
current_model_idx = 0

# Rate Limit Ayarları
REQUESTS_PER_MINUTE = 15  # Güvenli sınır
SECONDS_PER_REQUEST = 60 / REQUESTS_PER_MINUTE
WIKI_CONCURRENCY = 5


def get_processed_ids():
    if not os.path.exists(LOG_FILE):
        return set()
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        return set(line.strip() for line in f if line.strip())


def log_processed_id(asset_id):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{asset_id}\n")


def generate_slug(name):
    return re.sub(r"[^a-z0-9]+", "-", str(name).lower()).strip("-")


# --- PHASE 1: WIKIPEDIA (Grok'un önerdiği Parser ile) ---
async def fetch_wiki(session, asset, semaphore):
    async with semaphore:
        wiki_url = asset.get("wikiUrl", "")
        if not wiki_url or "wikipedia.org" not in wiki_url:
            return asset

        title = wiki_url.split("/wiki/")[-1].split("#")[0]
        params = {
            "action": "query",
            "titles": title,
            "prop": "revisions|extracts",  # 'extracts' ekledik
            "exintro": True,  # Sadece giriş (intro) kısmını al
            "explaintext": True,  # HTML değil, temiz metin al
            "rvprop": "content",
            "format": "json",
            "redirects": 1,
        }

        try:
            resp = await session.get(
                "https://en.wikipedia.org/w/api.php",
                params=params,
                timeout=20,
                headers={
                    "User-Agent": "WarAsset3D_FinalTest/5.0 (alpercanzerr1600@gmail.com)"
                },
            )
            data = resp.json()
            page = next(iter(data.get("query", {}).get("pages", {}).values()))

            if "missing" in page:
                return asset

            # 1. Giriş Metni (Özet)
            summary = page.get("extract", "")[:1200]  # İlk 1200 karakter yeterli

            # 2. Teknik Şablonlar (Parser ile)
            full_content = page.get("revisions", [{}])[0].get("*", "")
            wikicode = mwparserfromhell.parse(full_content)
            tech_payload = [
                str(t)
                for t in wikicode.filter_templates()
                if any(
                    k in str(t.name).lower()
                    for k in ["infobox", "specs", "performance", "armament", "engine"]
                )
            ]

            # 3. Paketleme
            asset["_wiki_content"] = (
                f"SUMMARY / DESCRIPTION:\n{summary}\n\nTECHNICAL DATA BLOCKS:\n"
                + "\n".join(tech_payload)
            )

        except Exception:
            pass
        return asset


SYSTEM_PROMPT = """You are a Technical Intelligence Analyst specialized in military hardware. 
Your only task is to parse raw Wikipedia Wikitext (infobox templates, specifications sections, etc.) and output **strictly valid JSON** according to the schema below. Never add explanations, never add extra text outside the JSON.

### STRICT EXTRACTION RULES:
1. Extract ONLY information that exists in the provided Wikitext. Never guess, estimate, or use prior knowledge (Zero-Guess Policy).
2. Prioritize template parameters: |length m=, |span=, |wingspan m=, |range km=, |max speed km/h=, |max takeoff weight=, |engine=, |crew=, |armament= etc.
3. Units:
   - For "specs" (English): Keep original units as they appear (e.g. "200 mi (320 km)", "20,000 ft").
   - For translations (tr, ru, ar, zh): Convert EVERYTHING to pure metric (km, m, kg, km/h). Use reasonable rounding. Example: 20,000 ft → 6,096 m or approx 6.1 km.

### OUTPUT SCHEMA (EXACT STRUCTURE - NO DEVIATION):
{
  "country": "Full English country name or null",
  "countryCode": "ISO 3166-1 alpha-3 code (e.g. RUS, USA, TUR, CHN) or null",
  "specs": {
    "length": "value with unit if available",
    "wingspan": "...",
    "range": "...",
    "max_speed": "...",
    "empty_weight": "...",
    "engine": "...",
    // any other technical parameters found
  },
  "short_specs": {
    "range": "max 12 chars, e.g. '1.2k km', 'M0.85'",
    "speed": "...",
    "payload": "..."
    // keep only the most important 3-5 keys
  },
  "full_dossier": "Exactly 2-3 dense, technical sentences in English.",
  "translations": {
    "tr": {
      "full_dossier": "Tamamen Türkçe, doğal teknik açıklama (2-3 cümle)",
      "short_specs": { "range": "...", "speed": "...", "payload": "..." }
    },
    "ru": { ... same structure ... },
    "ar": { ... },
    "zh": { ... }
  }
}

NARRATIVE SYNTHESIS: The 'full_dossier' must not be a dry list of specs. You must blend the technical data (e.g., engine model, wingspan) with the context from the Summary (e.g., project history, strategic role). Create a professional military-grade description that explains WHY these specs matter for this specific asset.

### ADDITIONAL RULES:
- If a value does not exist in the wikitext → put null (do not invent).
- In translations, do NOT leave any English words/sentences. Make it sound natural in the target language.
- Do not output any key whose value is null in ALL languages/sections to keep the JSON clean.
- Return ONLY the JSON object. No markdown, no ```json, no extra text.
"""


def call_groq(asset_name, wiki_text):
    global current_model_idx

    user_prompt = f"Asset Name: {asset_name}\n\nContent:\n{wiki_text}"

    for _ in range(3):  # Retry logic
        try:
            response = client.chat.completions.create(
                model=MODEL_QUEUE[current_model_idx],
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            if "429" in str(e):
                print(f"Rate limited. Waiting...")
                time.sleep(30)
                continue
            print(f"LLM Error: {e}")
            return None
    return None


# --- PHASE 3: PROCESSOR ---


async def main():
    if not os.path.exists(JSON_PATH):
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        all_assets = json.load(f)

    processed_ids = get_processed_ids()
    v27_map = {}
    if os.path.exists(OUTPUT_PATH):
        try:
            with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
                v27_map = {a["id"]: a for a in json.load(f)}
        except:
            pass

    targets = [
        a
        for a in all_assets
        if (a.get("id") or generate_slug(a["name"])) not in processed_ids
    ]
    print(f"Starting Pipeline: {len(targets)} assets to process.")

    # Phase 1: Wiki Fetch (Async)
    semaphore = asyncio.Semaphore(WIKI_CONCURRENCY)
    async with httpx.AsyncClient(headers={"User-Agent": "WarAssetsBot/1.0"}) as session:
        tasks = [fetch_wiki(session, a, semaphore) for a in targets]
        assets_ready = []
        for f in tqdm(
            asyncio.as_completed(tasks), total=len(tasks), desc="Fetching Wiki"
        ):
            res = await f
            assets_ready.append(res)

    # Phase 2: LLM Enrichment (Sequential)
    enriched_count = 0
    pbar = tqdm(assets_ready, desc="Enriching with AI")

    for asset in pbar:
        name = asset["name"]
        wiki_text = asset.get("_wiki_content", "")
        if not wiki_text:
            continue

        time.sleep(SECONDS_PER_REQUEST)  # Rate limit respect

        intel = call_groq(name, wiki_text)
        if intel:
            asset_id = asset.get("id") or generate_slug(name)

            # Merge logic - keeps your metadata, adds AI data
            enriched = {
                **asset,
                "id": asset_id,
                "country": intel.get("country"),
                "countryCode": intel.get("countryCode"),
                "specs": intel.get("specs"),
                "short_specs": intel.get("short_specs"),
                "full_dossier": intel.get("full_dossier"),
                "translations": intel.get("translations"),
            }
            # Remove helper key
            enriched.pop("_wiki_content", None)

            v27_map[asset_id] = enriched
            log_processed_id(asset_id)
            enriched_count += 1

            # Batch save every 5 items to prevent data loss
            if enriched_count % 1 == 0:
                with open(OUTPUT_PATH, "wb") as f:
                    f.write(
                        orjson.dumps(list(v27_map.values()), option=orjson.OPT_INDENT_2)
                    )

    # Final Save
    with open(OUTPUT_PATH, "wb") as f:
        f.write(orjson.dumps(list(v27_map.values()), option=orjson.OPT_INDENT_2))

    print(f"Done! Enriched {enriched_count} assets.")


if __name__ == "__main__":
    asyncio.run(main())
