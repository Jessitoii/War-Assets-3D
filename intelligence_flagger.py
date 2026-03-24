import json
import os

# Paths
INPUT_PATH = './mobile/assets/data/military-assets-v27.json'
OUTPUT_PATH = './mobile/assets/data/military-assets-v28-optimized.json'

def calculate_score(asset):
    score = 0
    
    # 1. Country & CountryCode
    if asset.get('country'): score += 1
    if asset.get('countryCode'): score += 1
    
    # 2. short_specs
    short_specs = asset.get('short_specs', {})
    if isinstance(short_specs, dict):
        for val in short_specs.values():
            if val is not None and str(val).strip(): score += 1
            
    # 3. full_dossier
    full_dossier = asset.get('full_dossier', {})
    if isinstance(full_dossier, dict):
        for val in full_dossier.values():
            if val is not None and str(val).strip(): score += 1
            
    # 4. translations
    # Counting translated chunks (short_specs and full_dossier for each language)
    translations = asset.get('translations', {})
    if isinstance(translations, dict):
        for lang_data in translations.values():
            if isinstance(lang_data, dict):
                for field_data in lang_data.values():
                    if isinstance(field_data, dict):
                        if field_data.get('full_dossier') is not None and str(field_data.get('full_dossier')).strip(): 
                            score += 1
                        if field_data.get('short_specs') is not None and str(field_data.get('short_specs')).strip(): 
                            score += 1
    
    # 5. model
    if asset.get('model'): score += 1
    
    # 6. images
    images = asset.get('images', [])
    if isinstance(images, list):
        score += len(images)
        
    return score

def get_tie_breaker(asset):
    # Tie-Breaking: If scores are equal, prioritize assets that have a 3D model and at least 3 images.
    has_model = asset.get('model') is not None
    images = asset.get('images', [])
    has_min_images = isinstance(images, list) and len(images) >= 3
    
    # Return 1 if both conditions are met, otherwise 0
    return 1 if (has_model and has_min_images) else 0

def main():
    if not os.path.exists(INPUT_PATH):
        print(f"Error: {INPUT_PATH} not found.")
        return

    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        assets = json.load(f)

    total_count = len(assets)
    if total_count == 0:
        print("No assets found.")
        return

    # Calculate Featured count: 15% of total, min 5, max 20
    featured_count = int(total_count * 0.15)
    featured_count = max(5, min(20, featured_count))
    
    print(f"Total Assets: {total_count}")
    print(f"Featured Target Count: {featured_count}")

    # Process each asset
    scored_assets = []
    for asset in assets:
        score = calculate_score(asset)
        tie_breaker = get_tie_breaker(asset)
        scored_assets.append({
            'asset': asset.copy(), # Keep original safe
            'score': score,
            'tie_breaker': tie_breaker
        })

    # Sort: Score DESC, Tie-breaker DESC
    scored_assets.sort(key=lambda x: (x['score'], x['tie_breaker']), reverse=True)

    # Flag top assets
    for i, item in enumerate(scored_assets):
        val = (i < featured_count)
        item['asset']['isFeatured'] = val
        # Also update old featured field if it exists for compatibility
        if 'featured' in item['asset']:
            item['asset']['featured'] = val

    # Print summary of top 5
    print("\n--- Top 5 Intelligence Scores ---")
    for i in range(min(5, len(scored_assets))):
        item = scored_assets[i]
        asset = item['asset']
        print(f"{i+1}. {asset.get('name')} (ID: {asset.get('id')})")
        print(f"   Score: {item['score']} | Tie-Breaker: {item['tie_breaker']}")

    # Save output (using the sorted list or original order?)
    # Usually better to maintain original order for data stability
    # Construct a map of results
    id_to_flags = { item['asset']['id']: item['asset'] for item in scored_assets }
    
    # We will preserve the order from military-assets-v27.json
    final_assets = []
    for original_asset in assets:
        updated = id_to_flags.get(original_asset['id'])
        if updated:
            final_assets.append(updated)
        else:
            # Should not happen if IDs are unique and consistent
            original_asset['isFeatured'] = False
            final_assets.append(original_asset)

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_assets, f, indent=2, ensure_ascii=False)

    print(f"\nSuccessfully saved updated data to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
