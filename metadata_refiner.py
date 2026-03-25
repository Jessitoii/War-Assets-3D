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
from cerebras.cloud.sdk import Cerebras
import ollama 

load_dotenv()

# --- CONFIG ---
JSON_PATH = "./mobile/assets/data/military-assets.json"
OUTPUT_PATH = "./mobile/assets/data/military-assets-v29.json"
LOG_FILE = "processed_assets.log"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
MODE = "GROQ"

if MODE == "GROQ":
    print("Using Groq")
    if not GROQ_API_KEY:
        print("ERROR: GROQ_API_KEY missing.")
        exit(1)

    client = Groq(api_key=GROQ_API_KEY)
elif MODE == "CEREBRAS":
    print("Using Cerebras")
    if not CEREBRAS_API_KEY:
        print("ERROR: CEREBRAS_API_KEY missing.")
        exit(1)
    client = Cerebras(api_key=CEREBRAS_API_KEY)
elif MODE == "OLLAMA":
    print("Using Ollama")
    client = ollama.Client()

if MODE == "GROQ":
    MODEL_QUEUE = ["llama-3.3-70b-versatile", "qwen-qwq-32b", "llama-3.1-70b-versatile"]
    current_model_idx = 0
elif MODE == "CEREBRAS":
    MODEL_QUEUE = ["qwen-3-235b-a22b-instruct-2507"]
    current_model_idx = 0
elif MODE == "OLLAMA":
    MODEL_QUEUE = ["gemma3:12b"]
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


SYSTEM_PROMPT = """
You are a Senior Technical Intelligence Analyst. Your mission is to synthesize raw Wikipedia data (Summary + Wikitext) into a high-fidelity, Metric-only JSON.

### I. EXTRACTION PROTOCOL:
1. **PARAMETER HARVESTING:** Scour the 'TECHNICAL DATA BLOCKS' for: |span=, |length=, |range=, |max speed=, |empty weight=, |max takeoff weight=, |engine=. If these exist in wikitext, you MUST include them in 'specs'.
2. **METRIC SUPREMACY:** - Root 'specs': Can include dual units (e.g., '20,000 ft (6,100 m)').
   - ALL 'translations': Use ONLY pure metric (km, m, kg, km/h). Convert 20,000 ft to 6,100 m. No Miles/Feet/Lbs allowed.
3. **COUNTRY CODES:** Use strictly ISO 3166-1 alpha-3 (e.g., DEU, ESP, USA, TUR). If multiple, separate with a slash (DEU/ESP).

### II. NARRATIVE SYNTHESIS (full_dossier):
The 'full_dossier' must be a professional 2-3 sentence technical narrative. 
- Blend the hard numbers (specs) with the context from the 'SUMMARY' (history, manufacturer, strategic role).
- Example: "Jointly developed by Germany and Spain, the Barracuda is a stealth UAV..."

### III. LANGUAGE PURITY (CRITICAL):
- Each translation block must contain ONLY its target language. 
- DO NOT leak characters from other languages (e.g., No Chinese characters in Turkish text). 
- If you don't know the technical term in the target language, use the phonetic localization or the standard international term, but never switch alphabets.

### IV. JSON SCHEMA (STRICT TEMPLATE - EXTENDABLE):
{
  "country": "...",
  "countryCode": "...",
  "specs": { 
    "role": "...", 
    "range": "...", 
    "speed": "...", 
    "//": "IMPORTANT: The keys below are EXAMPLES. Add ANY other technical parameters found (e.g., 'crew', 'armament', 'weight', 'wingspan', 'ceiling', 'climb_rate', 'radar_type'). Use snake_case for keys."
  },
  "short_specs": { 
    "range": "...", "speed": "...", "payload": "...",
    "//": "Include the 3-5 most critical tactical specs only."
  },
  "full_dossier": "...",
  "translations": {
    "tr": { 
      "full_dossier": "...", 
      "short_specs": { "//": "Must match the keys in root 'short_specs'" } 
    },
    "ru": { ... },
    "ar": { ... },
    "zh": { ... }
  }
}

### V. CONSTRAINTS:
- Do not output null keys. If data is missing for a field, omit that key entirely.
- Output ONLY raw JSON. No markdown, no commentary.
"""


def call_groq(asset_name, wiki_text):
    global current_model_idx

    user_prompt = f"Asset Name: {asset_name}\n\nContent:\n{wiki_text}"

    for _ in range(3):  # Retry logic
        try:
            if MODE == "OLLAMA":
                response = client.chat(
                    model=MODEL_QUEUE[current_model_idx],
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    format="json",
                    options={"temperature": 0.1},
                )
                return json.loads(response["message"]["content"])
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
        #all assets for debugging will be only EADS_Barracuda asset
        all_assets = [a for a in all_assets if a["name"] == "EADS Barracuda"]

    processed_ids = set()#get_processed_ids()
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
