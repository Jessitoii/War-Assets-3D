import json
import os
import asyncio
import httpx
import time
import re
import urllib.parse
from tqdm import tqdm
from dotenv import load_dotenv
from groq import Groq
import orjson
import mwparserfromhell
from cerebras.cloud.sdk import Cerebras

load_dotenv()

# --- CONFIG ---
JSON_PATH = os.path.abspath("./mobile/assets/data/military-assets-v29.json")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")

# Revised Model List based on what works
MODELS_CONFIG_70B = [
    {"provider": "GROQ", "model": "llama-3.3-70b-versatile"},
    {"provider": "CEREBRAS", "model": "llama3.1-8b"},  # Backup
]

current_idx_70b = 0

clients = {
    "GROQ": Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None,
    "CEREBRAS": Cerebras(api_key=CEREBRAS_API_KEY) if CEREBRAS_API_KEY else None,
}

# --- PROMPTS ---

EXTRACT_PROMPT = """You are a Technical Intelligence Analyst. 
Extract the following parameters for the military asset from the provided Wikipedia data:
1. Max Speed (with units like km/h or mph)
2. Range (Operational or Ferry range with units like km or miles)
3. Generation (Numerical generation like 4th, 5th, 4.5, etc. - mostly for aircraft/tanks)

Return a JSON object. Use "not found" if the information is not in the text.
Example Output:
{
  "max_speed": "Mach 2.8 (3,000 km/h)",
  "range": "3,000 km",
  "generation": "4th Generation"
}
"""

TRANSLATE_PROMPT = """You are a Metric Conversion and Translation Expert.
Translate the following technical parameters into Turkish (tr), Russian (ru), Arabic (ar), and Chinese (zh).
CRITICAL: CONVERT ALL VALUES TO METRIC.
- Speed: Convert to km/h. Units: km/sa (tr), km/h (others).
- Range: Convert to km. Units: km.
- Generation: Translate "Generation" to local equivalent (tr: Nesil, ru: Поколение, etc.).

Input: English JSON with max_speed, range, generation.
Output: JSON object with tr, ru, ar, zh keys.
{
  "tr": { "max_speed": "...", "range": "...", "generation": "..." },
  ...
}
"""


def call_llm(prompt, content, model_pool=MODELS_CONFIG_70B):
    global current_idx_70b
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": content},
    ]

    pool_size = len(model_pool)
    for i in range(pool_size * 2):  # Try each model twice
        idx = (current_idx_70b + i) % pool_size
        config = model_pool[idx]
        provider = config["provider"]
        model = config["model"]
        client = clients.get(provider)
        if not client:
            continue

        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.0,
            )
            current_idx_70b = idx
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "rate_limit" in err_str:
                wait_time = 30 if provider == "GROQ" else 5
                print(f"[{provider}] Rate Limit. Sleeping {wait_time}s...")
                time.sleep(wait_time)
                continue
            print(f"LLM Error ({provider}/{model}): {e}")
            continue
    return None


async def fetch_wiki(session, wiki_url):
    if not wiki_url or "wikipedia.org" not in wiki_url:
        return None
    try:
        title = wiki_url.split("/wiki/")[-1].split("#")[0]
        safe_title = urllib.parse.unquote(title)

        params = {
            "action": "query",
            "titles": safe_title,
            "prop": "revisions",
            "rvprop": "content",
            "format": "json",
            "redirects": 1,
        }
        resp = await session.get(
            "https://en.wikipedia.org/w/api.php", params=params, timeout=15
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        page = next(iter(data.get("query", {}).get("pages", {}).values()))
        if "missing" in page:
            return None

        content = page.get("revisions", [{}])[0].get("*", "")
        code = mwparserfromhell.parse(content)

        sections = code.get_sections(flat=True)
        raw_text = [str(sections[0])[:1500]] if sections else []

        for s in code.get_sections(levels=[2]):
            hdr = s.filter_headings()
            if hdr and any(
                x in str(hdr[0].title).lower()
                for x in ["spec", "perform", "design", "description"]
            ):
                raw_text.append(str(s)[:2000])

        templates = [
            str(t)
            for t in code.filter_templates()
            if any(
                k in str(t.name).lower()
                for k in ["infobox", "spec", "aircra", "weapon", "tank"]
            )
        ]

        return "\n\n".join(raw_text) + "\n\nRAW:\n" + "\n".join(templates)
    except:
        return None


def get_missing_fields(asset):
    specs = asset.get("short_specs", {})
    missing = []

    # Check Speed
    if not any(
        "speed" in k.lower() or "hiz" in k.lower() or "hız" in k.lower()
        for k in specs.keys()
    ):
        missing.append("speed")

    # Check Range
    if not any("range" in k.lower() or "menzil" in k.lower() for k in specs.keys()):
        missing.append("range")

    # Check Generation
    if not any("generation" in k.lower() or "nesil" in k.lower() for k in specs.keys()):
        missing.append("generation")

    return missing


async def main():
    if not os.path.exists(JSON_PATH):
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        assets = json.load(f)

    targets = [a for a in assets if get_missing_fields(a)]
    print(f"Found {len(targets)} assets needing replenishment.")

    async with httpx.AsyncClient() as session:
        for asset in tqdm(targets, desc="Refining"):
            missing = get_missing_fields(asset)
            if not missing:
                continue

            wiki_data = await fetch_wiki(session, asset.get("wikiUrl"))
            if not wiki_data:
                continue

            # Extraction
            extracted = call_llm(
                EXTRACT_PROMPT,
                f"Asset: {asset['name']}\nMissing: {missing}\nWiki: {wiki_data[:9000]}",
            )
            if not extracted:
                continue

            # Clean data
            new_specs = {k: v for k, v in extracted.items() if v and v != "not found"}
            if not new_specs:
                continue

            # Translation
            translated = call_llm(TRANSLATE_PROMPT, json.dumps(new_specs))
            if not translated:
                continue

            # Updates
            if "short_specs" not in asset:
                asset["short_specs"] = {}
            for k, v in new_specs.items():
                asset["short_specs"][k] = v

            if "translations" not in asset:
                asset["translations"] = {}
            for lang, trans_data in translated.items():
                if lang not in ["tr", "ru", "ar", "zh"]:
                    continue
                if lang not in asset["translations"]:
                    asset["translations"][lang] = {
                        "short_specs": {},
                        "full_dossier": {},
                    }
                if "short_specs" not in asset["translations"][lang]:
                    asset["translations"][lang]["short_specs"] = {}

                for k, v in trans_data.items():
                    asset["translations"][lang]["short_specs"][k] = v

            # Save progress
            with open(JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(assets, f, ensure_ascii=False, indent=2)

            await asyncio.sleep(0.5)


if __name__ == "__main__":
    asyncio.run(main())
