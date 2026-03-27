import os
import re
import json


def title_case(s):
    return s.replace("_", " ").title()


def set_nested_value(d, keys, value):
    for key in keys[:-1]:
        d = d.setdefault(key, {})
    if keys[-1] not in d:
        d[keys[-1]] = value
        return True
    return False


def scan_translations(root_dir):
    mobile_dir = os.path.join(root_dir, "mobile")
    # Fixed regex to ensure the "t" function is isolated
    pattern = re.compile(r'(?<!\w)t\([\'"]([\w\.]+)[\'"]\)')
    all_keys = set()

    scan_dirs = [
        "components",
        "screens",
        "navigation",
        "app",
        "utils",
        "hooks",
        "store",
        "services",
    ]

    for subdir in scan_dirs:
        dir_path = os.path.join(mobile_dir, subdir)
        if not os.path.exists(dir_path):
            continue
        for root, _, files in os.walk(dir_path):
            for file in files:
                if file.endswith((".ts", ".tsx")):
                    with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                        content = f.read()
                        matches = pattern.findall(content)
                        for match in matches:
                            all_keys.add(match)

    print(f"Found {len(all_keys)} unique translation keys in codebase.")

    locales_path = os.path.join(mobile_dir, "locales")
    for filename in os.listdir(locales_path):
        if not filename.endswith(".json"):
            continue

        filepath = os.path.join(locales_path, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                continue

        # Clean up bad keys from the previous run
        cleaned = False
        if "T" in data:
            del data["T"]
            cleaned = True
        if "window" in data:
            del data["window"]
            cleaned = True

        added = 0
        for key in all_keys:
            parts = key.split(".")
            default_val = title_case(parts[-1])
            if set_nested_value(data, parts, default_val):
                added += 1

        if added > 0 or cleaned:
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Saved changes to {filename} (added: {added}, cleaned: {cleaned}).")


if __name__ == "__main__":
    scan_translations(".")
