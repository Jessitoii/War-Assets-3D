
import json
import os

path = r'd:\Software\Expo\War-Assets-3D-main\mobile\assets\data\military-assets-v27.json'
with open(path, 'r', encoding='utf-8') as f:
    assets = json.load(f)

print(f"Initial asset count: {len(assets)}")

# Scrubbing logic: remove {} or objects missing name
scrubbed_assets = []
removed_count = 0

for i, a in enumerate(assets):
    if not a: # {}
        print(f"Removing empty object at index {i}")
        removed_count += 1
        continue
    
    if not a.get('name'):
        print(f"Removing asset missing name at index {i}: {a}")
        removed_count += 1
        continue
        
    scrubbed_assets.append(a)

with open(path, 'w', encoding='utf-8') as f:
    json.dump(scrubbed_assets, f, indent=2, ensure_ascii=False)

print(f"Final asset count: {len(scrubbed_assets)}")
print(f"Removed {removed_count} malformed assets.")
