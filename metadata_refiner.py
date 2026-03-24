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

load_dotenv()

JSON_PATH = './mobile/assets/data/military-assets.json'
OUTPUT_PATH = './mobile/assets/data/military-assets-v27.json'
LOG_FILE = 'processed_assets.log'

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("ERROR: GROQ_API_KEY not found in .env")
    exit(1)

client = Groq(api_key=GROQ_API_KEY)
MODEL_QUEUE = [
    "llama-3.3-70b-versatile",                      # 100K TPD — başla
    "openai/gpt-oss-120b",                          # 200K TPD — 120B, en kaliteli
    "meta-llama/llama-4-scout-17b-16e-instruct",    # 500K TPD — hız/kalite dengesi
    "qwen/qwen3-32b",                               # 500K TPD — JSON çok iyi
    "moonshotai/kimi-k2-instruct",                  # 300K TPD — yedek
    "llama-3.1-8b-instant",                         # 500K TPD — son çare
]
current_model_idx = 0
MODEL_ID = MODEL_QUEUE[current_model_idx]

# Groq free tier limits — bunları aşma
# llama-3.3-70b: 30 req/min, 6000 token/min
# Her asset ~1500 token (prompt+completion) → dakikada max 4 asset güvenli
REQUESTS_PER_MINUTE = 25        # limit 30, 5 pay bırak
SECONDS_PER_REQUEST = 60 / REQUESTS_PER_MINUTE   # ~2.4s minimum aralık
WIKI_CONCURRENCY = 3           # Wikipedia fetch'i agresif çek

def get_processed_ids():
    if not os.path.exists(LOG_FILE):
        return set()
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        return set(line.strip() for line in f if line.strip())

def log_processed_id(asset_id):
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(f"{asset_id}\n")

def generate_slug(name):
    if not name:
        return "unknown"
    return re.sub(r'[^a-z0-9]+', '-', str(name).lower()).strip('-')

# ── PHASE 1: Wikipedia'ları toplu async çek ───────────────────────────────────

async def fetch_one(session, asset, semaphore):
    async with semaphore:
        wiki_url = asset.get("wikiUrl", "")
        asset["_wiki_text"] = ""

        if not wiki_url or "wikipedia.org" not in wiki_url:
            if wiki_url:
                print(f"\n  [SKIP] Wikipedia dışı: {wiki_url}")
            return asset

        # Anchor'ı at (#M1129_ICV gibi şeyler)
        wiki_url = wiki_url.split('#')[0]
        title = wiki_url.rstrip('/').split('/wiki/')[-1]

        # Önce direkt fetch dene
        text = await _fetch_by_title(session, title)

        # 404 olduysa asset name ile search API'ye düş
        if not text:
            asset_name = asset.get("name", "")
            print(f"\n  [SEARCH FALLBACK] {title} → '{asset_name}' ile aranıyor...")
            text = await _search_and_fetch(session, asset_name)

        asset["_wiki_text"] = text
        return asset


async def _wiki_get(session, params: dict, retries: int = 3) -> dict:
    """Tüm Wikipedia API çağrıları için tek nokta — retry + delay dahil."""
    for attempt in range(retries):
        try:
            if attempt > 0:
                await asyncio.sleep(2 ** attempt)  # 2s, 4s

            resp = await session.get(
                "https://en.wikipedia.org/w/api.php",
                params={**params, "format": "json"},
                timeout=20,
            )

            if not resp.text.strip():
                continue  # boş response → retry

            return resp.json()

        except json.JSONDecodeError:
            continue  # boş body → retry
        except Exception as e:
            print(f"\n  [WIKI GET ERR] {e}")
            return {}

    return {}


async def _fetch_by_title(session, title: str) -> str:
    data = await _wiki_get(session, {
        "action": "query",
        "titles": title,
        "prop": "extracts",
        "explaintext": True,
        "exsectionformat": "plain",
        "redirects": 1,
    })
    if not data:
        return ""
    pages = data.get("query", {}).get("pages", {})
    page = next(iter(pages.values()))
    if page.get("pageid") == -1 or "missing" in page:
        return ""
    return page.get("extract", "")[:4000]


async def _search_and_fetch(session, query: str) -> str:
    if not query or query in ("N/A", "Unknown"):
        return ""

    data = await _wiki_get(session, {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": 1,
    })
    if not data:
        return ""

    results = data.get("query", {}).get("search", [])
    if not results:
        print(f"\n  [NO RESULT] '{query}'")
        return ""

    best_title = results[0]["title"]
    print(f"\n  [FOUND] '{query}' → '{best_title}'")
    return await _fetch_by_title(session, best_title)

async def fetch_all_wikipedia(assets: list) -> list:
    print(f"\n[PHASE 1] Wikipedia fetch — {len(assets)} asset, concurrency={WIKI_CONCURRENCY}")
    semaphore = asyncio.Semaphore(WIKI_CONCURRENCY)
    async with httpx.AsyncClient(
        headers={
            "User-Agent": "WarAssets3D/1.0 (https://github.com/Jessitoii/war-assets-3d; alpercanzerr1600@gmail.com)",
            "Api-User-Agent": "WarAssets3D/1.0 (https://github.com/Jessitoii/war-assets-3d; alpercanzerr1600@gmail.com)",  # ← ekstra
        },
        follow_redirects=True,
        limits=httpx.Limits(max_connections=WIKI_CONCURRENCY),  # ← bağlantı sayısını sınırla
    ) as session:
        tasks = [fetch_one(session, asset, semaphore) for asset in assets]
        results = []
        for coro in tqdm(asyncio.as_completed(tasks), total=len(tasks), desc="Wikipedia fetch"):
            result = await coro
            results.append(result)
            await asyncio.sleep(0.3)  # ← her request sonrası 100ms nefes

    fetched = sum(1 for a in results if a.get("_wiki_text"))
    print(f"[PHASE 1] Tamamlandı — {fetched}/{len(assets)} Wikipedia text alındı")
    return results

# ── PHASE 2: LLM — sıralı, rate-limit farkında ───────────────────────────────

SYSTEM_PROMPT = """You are a military data formatter.
You receive Wikipedia text about a military asset.
Extract and return ONLY valid JSON, no markdown, no explanation.

IMPORTANT: Ignore any prior knowledge or existing specs.
Derive ALL values exclusively from the Wikipedia text provided.
If a value is not present in the text, use null — never guess.
Never fill null fields with approximate or speculative values.
"Expected" or "planned" capabilities must be explicitly marked as such in full_dossier.
short_specs must ONLY contain confirmed/verified values — use null otherwise.

SPEC FIELDS RULE:
- Always include: range, speed, payload
- Additionally extract ANY other relevant specs found in the text.
- Examples of extra fields: crew, weight, engine, ceiling, rate_of_fire, armor, displacement, endurance
- Use snake_case for field names. Only add a field if the value is explicitly stated in the text.

Required JSON structure:
{
  "country": "Full country name",
  "countryCode": "ISO 3166-1 alpha-3 code",
  "specs": {
    "role": "e.g. Main Battle Tank",
    "range": "concise value or null",
    "speed": "concise value or null",
    "payload": "concise value or null"
    // + any extra fields found in text
  },
  "short_specs": {
    "range": "max 10 chars or null",
    "speed": "max 10 chars or null",
    "payload": "max 10 chars or null"
    // + same extra fields, also max 10 chars
  },
  "full_dossier": {
    "range": "detailed 1-2 sentence description or null",
    "speed": "detailed 1-2 sentence description or null",
    "payload": "detailed 1-2 sentence description or null"
    // + same extra fields with detailed descriptions
  },
  "translations": {
    "tr": {
      "range":   {"short_specs": "...", "full_dossier": "..."},
      "speed":   {"short_specs": "...", "full_dossier": "..."},
      "payload": {"short_specs": "...", "full_dossier": "..."}
      // + same extra fields translated
    },
    "ru": { ... },
    "ar": { ... },
    "zh": { ... }
  }
}

EXAMPLE extra fields for a tank: {"crew": "4", "weight": "62 t", "engine": "1,500 hp diesel"}
EXAMPLE extra fields for a ship: {"displacement": "8,000 t", "endurance": "30 days"}
EXAMPLE extra fields for an aircraft: {"ceiling": "15,000 m", "crew": "2"}"""

def call_groq(asset_name: str, wiki_text: str) -> dict | None:
    """Tek bir Groq çağrısı yapar. Rate limit'e karşı retry ile."""
    global MODEL_ID, current_model_idx

    user_msg = f"Asset: {asset_name}\n\nWikipedia text:\n{wiki_text}"
    backoff = 60  # İlk rate limit'te 60s bekle
    for attempt in range(4):
        try:
            resp = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_msg},
                ],
                model=MODEL_ID,
                response_format={"type": "json_object"},
                max_tokens=2000,
                temperature=0.1,
            )
            return json.loads(resp.choices[0].message.content)

        except Exception as e:
            err = str(e)
            if "429" in err or "rate_limit" in err.lower():
                if "day" in err.lower():
                    current_model_idx += 1
                    MODEL_ID = MODEL_QUEUE[current_model_idx]
                    if current_model_idx >= len(MODEL_QUEUE):
                        print("\n  [RATE LIMIT] All models are rate limited. Please try again later.")
                        sys.exit(0)
                    print(f"\n  [RATE LIMIT] Switching to model {MODEL_ID}")
                    attempt = 0
                    break

                # Rate limit — Groq'un Retry-After header'ını parse etmeye çalış
                wait = backoff
                if "please try again in" in err.lower():
                    try:
                        # "please try again in 52.4s" formatını yakala
                        wait = float(re.search(r'in (\d+\.?\d*)s', err).group(1)) + 2
                    except Exception:
                        pass
                print(f"\n  [RATE LIMIT] {wait:.0f}s bekleniyor... (attempt {attempt+1})")
                time.sleep(wait + 1)
                backoff *= 2
            else:
                print(f"\n  [LLM ERROR] {asset_name}: {e}")
                return None

    print(f"\n  [FAILED] {asset_name} — max retry aşıldı")
    return None

def process_sequentially(assets_with_wiki: list, v27_map: dict, processed_ids: set) -> int:
    """LLM çağrılarını sıralı yapar, rate limit'e saygı gösterir."""
    print(f"\n[PHASE 2] LLM format pass başlıyor — sıralı, {SECONDS_PER_REQUEST:.1f}s/req aralık")

    enriched_count = 0
    last_request_time = 0.0

    pbar = tqdm(assets_with_wiki, desc="LLM enrichment")
    for asset in pbar:
        name = asset.get("name", "unknown")
        wiki_text = asset.get("_wiki_text", "")

        # ID belirle
        original_id = asset.get("id", "")
        final_id = original_id.lower() if original_id else generate_slug(name)

        if final_id in processed_ids:
            pbar.set_postfix_str(f"skip: {name[:30]}")
            continue

        if not wiki_text:
            # Wikipedia'dan veri gelmedi — asset'i orijinal haliyle koru, sadece logla
            print(f"\n  [NO WIKI] {name} — atlandı")
            continue

        # Rate limit: son request'ten bu yana yeterli süre geçti mi?
        elapsed = time.time() - last_request_time
        if elapsed < SECONDS_PER_REQUEST:
            time.sleep(SECONDS_PER_REQUEST - elapsed)

        pbar.set_postfix_str(f"{name[:35]}")
        last_request_time = time.time()

        intel = call_groq(name, wiki_text)

        if intel:
            enriched = {
                # Identity — dokunma
                "id":          final_id,
                "catId":       asset.get("catId"),
                "name":        name,
                "featured":    asset.get("featured", False),
                "wikiUrl":     asset.get("wikiUrl"),
                "images":      asset.get("images", []),
                "model":       asset.get("model"),
                "dangerLevel": asset.get("dangerLevel"),
                "threatType":  asset.get("threatType"),

                # Sıfırdan Wikipedia + LLM'den
                "country":      intel.get("country"),
                "countryCode":  intel.get("countryCode"),
                "specs":        intel.get("specs"),
                "short_specs":  intel.get("short_specs"),
                "full_dossier": intel.get("full_dossier"),
                "translations": intel.get("translations"),
            }
            v27_map[final_id] = enriched
            log_processed_id(final_id)
            processed_ids.add(final_id)
            enriched_count += 1
            _save(v27_map)
            # Her 10 asset'te bir kaydet
            if enriched_count % 10 == 0:
                
                print(f"\n  [SAVE] {enriched_count} enriched asset kaydedildi.")

    return enriched_count

def _save(v27_map: dict):
    with open(OUTPUT_PATH, 'wb') as f:  # ← 'wb' binary mode
        f.write(orjson.dumps(
            list(v27_map.values()),
            option=orjson.OPT_INDENT_2
        ))

# ── MAIN ──────────────────────────────────────────────────────────────────────

async def main():
    if not os.path.exists(JSON_PATH):
        print(f"[ERROR] {JSON_PATH} bulunamadı.")
        return

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        all_assets = json.load(f)

    processed_ids = get_processed_ids()

    # Mevcut output varsa yükle
    v27_map = {}
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH, 'r', encoding='utf-8') as f:
            try:
                v27_map = {a.get('id'): a for a in json.load(f)}
            except Exception:
                v27_map = {}

    target_assets = [
        a for a in all_assets
        if (a.get('id', '').lower() or generate_slug(a.get('name', ''))) not in processed_ids
    ]

    print(f"PIPELINE BAŞLADI")
    print(f"  Toplam: {len(all_assets)} | İşlenecek: {len(target_assets)}")
    print(f"  Groq rate: {REQUESTS_PER_MINUTE} req/min → ~{SECONDS_PER_REQUEST:.1f}s aralık")
    print(f"  Tahmini süre: {len(target_assets) * SECONDS_PER_REQUEST / 60:.0f} dakika")

    # PHASE 1: Wikipedia'ları hızlıca topla
    assets_with_wiki = await fetch_all_wikipedia(target_assets)

    # PHASE 2: LLM'e sıralı gönder
    count = process_sequentially(assets_with_wiki, v27_map, processed_ids)

    # Final save
    _save(v27_map)
    print(f"\n✅ TAMAMLANDI: {count} asset enriched. Output: {OUTPUT_PATH}")

if __name__ == "__main__":
    asyncio.run(main())