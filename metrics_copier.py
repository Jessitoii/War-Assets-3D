import json
import os
import re
import orjson

# Configuration
ORIGINAL_FILE = "mobile/assets/data/military-assets.json"
TARGET_FILE = "mobile/assets/data/military-assets-v27.json"

def generate_slug(name):
    """Utility to generate a slug from a name, matching the logic in metadata_refiner.py"""
    if not name:
        return "unknown"
    return re.sub(r'[^a-z0-9]+', '-', str(name).lower()).strip('-')

def main():
    print(f"🚀 Starting Metrics Sync...")
    
    if not os.path.exists(ORIGINAL_FILE):
        print(f"❌ Error: Original file not found at {ORIGINAL_FILE}")
        return
    if not os.path.exists(TARGET_FILE):
        print(f"❌ Error: Target file not found at {TARGET_FILE}")
        return

    # Load data
    print(f"📂 Loading data files...")
    with open(ORIGINAL_FILE, 'r', encoding='utf-8') as f:
        original_data = json.load(f)
    
    with open(TARGET_FILE, 'r', encoding='utf-8') as f:
        target_data = json.load(f)

    # Index original data for fast lookup
    print(f"🔍 Indexing {len(original_data)} original assets...")
    id_map = {}
    name_map = {}
    
    for asset in original_data:
        asset_id = asset.get('id', '').lower()
        if not asset_id:
            asset_id = generate_slug(asset.get('name', ''))
        
        id_map[asset_id] = asset
        if asset.get('name'):
            name_map[asset.get('name')] = asset

    # Perform synchronization
    print(f"🔄 Syncing metrics to {len(target_data)} target assets...")
    updated_count = 0
    metrics_added = 0
    
    for target in target_data:
        target_id = (target.get('id') or "").strip().lower()
        target_name = (target.get('name') or "").strip()
        
        # 1. Match by ID (preferred)
        match = id_map.get(target_id)
        
        # 2. Match by Name (fallback)
        if not match and target_name:
            match = name_map.get(target_name)
            
        if match:
            # 1. Grab values from top-level OR nested 'specs' key (common in legacy files)
            metrics = match.get('metrics') or match.get('specs', {}).get('metrics')
            danger_level = match.get('dangerLevel') or match.get('specs', {}).get('dangerLevel')
            threat_type = match.get('threatType') or match.get('specs', {}).get('threatType')

            # 2. Sync metrics object
            if metrics:
                target['metrics'] = metrics
                metrics_added += 1
            
            # 3. Sync core stats
            if danger_level:
                target['dangerLevel'] = danger_level
            if threat_type:
                target['threatType'] = threat_type
            
            updated_count += 1
            if updated_count < 5:
                print(f"   ✨ Matched: {target_name} ({target_id}) - metrics: {'YES' if metrics else 'NO'}")

    if updated_count == 0:
        print(f"⚠️ Warning: No assets were matched! Checking first few IDs in original vs target...")
        orig_ids = list(id_map.keys())[:5]
        target_ids = [(t.get('id') or "").strip().lower() for t in target_data[:5]]
        print(f"   - Original: {orig_ids}")
        print(f"   - Target:   {target_ids}")

    print(f"📊 Summary:")
    print(f"   - Total original: {len(original_data)}")
    print(f"   - Total target:   {len(target_data)}")
    print(f"   - Assets matched: {updated_count}")
    print(f"   - Metrics copied: {metrics_added}")

    # Save the updated file
    print(f"💾 Saving updated data to {TARGET_FILE}...")
    try:
        with open(TARGET_FILE, 'wb') as f:
            f.write(orjson.dumps(
                target_data, 
                option=orjson.OPT_INDENT_2 | orjson.OPT_SORT_KEYS
            ))
        print(f"✅ Sync complete! {TARGET_FILE} has been updated.")
    except Exception as e:
        print(f"❌ Error saving file: {e}")

if __name__ == "__main__":
    main()
