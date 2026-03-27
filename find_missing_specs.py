import json
import os


def check_missing(asset):
    short_specs = asset.get("short_specs", {})

    # Speed keys
    speed_keys = [
        k for k in short_specs.keys() if "speed" in k.lower() or "hiz" in k.lower()
    ]
    # Range keys
    range_keys = [
        k for k in short_specs.keys() if "range" in k.lower() or "menzil" in k.lower()
    ]
    # Generation keys
    gen_keys = [
        k
        for k in short_specs.keys()
        if "generation" in k.lower() or "nesil" in k.lower()
    ]

    missing = []
    if not speed_keys:
        missing.append("speed")
    if not range_keys:
        missing.append("range")
    if not gen_keys:
        missing.append("generation")

    return missing


def main():
    json_path = "./mobile/assets/data/military-assets-v29.json"
    with open(json_path, "r", encoding="utf-8") as f:
        assets = json.load(f)

    results = []
    for a in assets:
        m = check_missing(a)
        if m:
            results.append(
                {
                    "id": a["id"],
                    "name": a["name"],
                    "missing": m,
                    "wikiUrl": a.get("wikiUrl"),
                }
            )

    print(f"Total assets with missing info: {len(results)}")
    for r in results[:10]:
        print(r)


if __name__ == "__main__":
    main()
