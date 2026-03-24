
import json
import os

path = r'd:\Software\Expo\War-Assets-3D-main\mobile\assets\data\military-assets.json'
with open(path, 'r', encoding='utf-8') as f:
    assets = json.load(f)

# Category mapping logic:
# 1: Tanks
# 2: Aircraft
# 3: Air Defense
# 4: Drones/Missiles
# 5: Navy

def get_cat_id(asset):
    # From context:
    # Tanks: 'Tank', 'MBT', 'Armored', 'Anti-tank', 'Infantry Fighting Vehicle', 'IFV', 'APC', 'Ground'
    # Aircraft: 'Aircraft', 'Jet', 'Fighter', 'Helicopter', 'Airplane', 'Air', 'CAS', 'Fixed-wing', 'Rotary-wing'
    # Air Defense: 'Air Defense', 'SAM', 'Anti-aircraft', 'Battery', 'Interceptor', 'S-400', 'Patriot'
    # Drones/Missiles: 'Drone', 'UAV', 'Missile', 'Rocket', 'UCAV', 'Loitering Munition'
    # Navy: 'Navy', 'Ship', 'Submarine', 'Frigate', 'Destroyer', 'Carrier', 'Vessel'

    t = asset.get('threatType', '').lower()
    r = (asset.get('role') or (asset.get('specs', {}) or {}).get('role', '')).lower()
    n = asset.get('name', '').lower()

    # Priority 1: threatType
    if any(x in t for x in ['tank', 'mbt', 'armored', 'ifv', 'apc', 'infantry', 'howitzer', 'artillery']):
        return '1'
    if any(x in t for x in ['aircraft', 'jet', 'fighter', 'helicopter', 'airplane', 'air-to-surface', 'cas']):
        return '2'
    if any(x in t for x in ['air defense', 'sam', 'anti-air', 'battery', 'interceptor', 's-300', 's-400', 'patriot']):
        return '3'
    if any(x in t for x in ['drone', 'uav', 'missile', 'rocket', 'ucav', 'munition']):
        return '4'
    if any(x in t for x in ['navy', 'ship', 'submarine', 'frigate', 'destroyer', 'carrier', 'vessel']):
        return '5'

    # Priority 2: role
    if any(x in r for x in ['tank', 'mbt', 'armored', 'infantry', 'howitzer', 'artillery']):
        return '1'
    if any(x in r for x in ['aircraft', 'jet', 'fighter', 'helicopter', 'airplane', 'air']):
        return '2'
    if any(x in r for x in ['air defense', 'sam', 'anti-air', 'aa']):
        return '3'
    if any(x in r for x in ['drone', 'uav', 'missile', 'rocket', 'ucav']):
        return '4'
    if any(x in r for x in ['navy', 'ship', 'submarine', 'frigate', 'destroyer']):
        return '5'

    # Priority 3: Name
    if any(x in n for x in ['tank', 'abrams', 'leopard', 't-72', 't-90', 'challenger', 'panzer']):
        return '1'
    if any(x in n for x in ['f-16', 'f-22', 'f-35', 'mig-', 'su-', 'eurofighter', 'rafale', 'mirage']):
        return '2'
    if any(x in n for x in ['patriot', 's-300', 's-400', 'nasams', 'buk-']):
        return '3'
    if any(x in n for x in ['bayraktar', 'shahed', 'reaper', 'predator', 'kalibr', 'tomahawk', 'atgms']):
        return '4'

    # If it has "Ground" threat type but we couldn't match, often it's a tank/vehicle
    if 'ground' in t:
        return '1'
    if 'air' in t:
        return '2'

    return '1' # Default to Tanks if nothing else. Most are tanks/vehicles in this app.

fixed_count = 0
for a in assets:
    if not a.get('catId'):
        old_cat = a.get('catId')
        new_cat = get_cat_id(a)
        a['catId'] = new_cat
        fixed_count += 1
        print(f"Fixed {a.get('name')}: {old_cat} -> {new_cat}")

with open(path, 'w', encoding='utf-8') as f:
    json.dump(assets, f, indent=2, ensure_ascii=True)

print(f"Done! Fixed {fixed_count} assets.")
