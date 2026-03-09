import json
import os
import time
import random
import requests
import subprocess
import zipfile
import threading
import re
import boto3
from botocore.client import Config
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
from ddgs import DDGS
from cerebras.cloud.sdk import Cerebras
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

load_dotenv()

# CONFIGURATION
JSON_PATH = './mobile/assets/data/military-assets.json'
IMAGE_DIR = './backend-cdn/public/images/'
MODEL_DIR = './backend-cdn/public/models/'
RAW_MODEL_DIR = './backend-cdn/public/models/raw/'
LOG_FILE = 'missing_assets.log'

CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
SKETCHFAB_TOKEN = os.getenv("SKETCHFAB_TOKEN")
MAX_WORKERS = 4  # Resource limit for Blender/Playwright
BLENDER_PATH = r"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe"

# HYBRID DEPLOYMENT CONFIG
DEPLOY_MODE = os.getenv("DEPLOY_MODE", "CLOUDFLARE") # LOCAL or CLOUDFLARE
R2_PUBLIC_URL = "https://pub-2c4d302f7a9147f2b8723c7d066dc44f.r2.dev/"

# CLOUDFLARE R2 CREDENTIALS
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")

# 5. VALIDATE BUCKET NAME CONFIGURATION
if R2_BUCKET_NAME and "r2.dev" in R2_BUCKET_NAME:
    raise ValueError("R2_BUCKET_NAME must be the bucket name, not the r2.dev domain.")

# Global Locks
json_lock = threading.Lock()
log_lock = threading.Lock()
# 6. ADD THREAD-SAFE LOGGING
print_lock = threading.Lock()

def safe_print(msg):
    with print_lock:
        print(msg)

client = Cerebras(api_key=CEREBRAS_API_KEY)

# Ensure directories exist
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(RAW_MODEL_DIR, exist_ok=True)

def safe_log(msg):
    with log_lock:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} | {msg}\n")

def jitter_sleep(min_s=1, max_s=3):
    time.sleep(random.uniform(min_s, max_s))

def generate_slug(name):
    if not name: return ""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    return slug.strip('-')

def get_r2_client():
    if not R2_ACCESS_KEY_ID or not R2_SECRET_ACCESS_KEY or not R2_ACCOUNT_ID:
        return None
    return boto3.client(
        's3',
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )

def upload_to_r2(local_path, r2_path):
    if DEPLOY_MODE != "CLOUDFLARE": return True
    r2 = get_r2_client()
    if not r2: return False
    
    # 2. VERIFY LOCAL FILE EXISTS BEFORE UPLOAD
    if not os.path.exists(local_path):
        safe_print(f"[UPLOAD ERROR] File does not exist: {local_path}")
        return False
    
    file_size = os.path.getsize(local_path)
    safe_print(f"[UPLOAD] {local_path} | size={file_size}")
    
    if file_size == 0:
        safe_print(f"[UPLOAD SKIP] File is empty: {local_path}")
        return False

    try:
        content_type = 'application/octet-stream'
        if local_path.endswith('.jpg'): content_type = 'image/jpeg'
        elif local_path.endswith('.glb'): content_type = 'model/gltf-binary'
        
        # 3. VERIFY R2 UPLOAD SUCCEEDED
        r2.upload_file(local_path, R2_BUCKET_NAME, r2_path, ExtraArgs={'ContentType': content_type})
        
        # Verification check
        r2.head_object(Bucket=R2_BUCKET_NAME, Key=r2_path)
        safe_print(f"[UPLOAD VERIFIED] {r2_path}")
        return True
    except Exception as e:
        # 4. ADD STRICT ERROR LOGGING FOR R2
        safe_print(f"[R2 UPLOAD FAILED] {local_path} -> {e}")
        safe_log(f"R2 Upload Failed: {local_path} -> {e}")
        return False

def save_asset_to_db(asset):
    """Atomic save to JSON after every successful asset processing."""
    # 7. PREVENT DATABASE WRITE WITH EMPTY ID
    if not asset.get("id"):
        safe_print("[DB ERROR] Attempted to write asset with empty id")
        return False

    with json_lock:
        try:
            if os.path.exists(JSON_PATH):
                with open(JSON_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            else:
                data = []
            
            # Upsert logic
            existing_idx = next((i for i, a in enumerate(data) if a['id'] == asset['id']), None)
            if existing_idx is not None:
                data[existing_idx] = asset
            else:
                data.append(asset)
                
            with open(JSON_PATH, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            safe_print(f" [!] Database Save Failure: {e}")
            return False

def trigger_conversion(input_path, asset_id):
    abs_input = os.path.abspath(input_path)
    abs_output = os.path.abspath(os.path.join(MODEL_DIR, f"{asset_id}.glb"))
    
    if not os.path.exists(abs_input): return None
    
    try:
        subprocess.run([
            BLENDER_PATH, "--background", "--python", "converter.py", "--", 
            abs_input, abs_output
        ], check=True, capture_output=True)
        return abs_output if os.path.exists(abs_output) else None
    except Exception:
        return None

def download_sketchfab_model(asset_name, asset_id):
    headers = {"Authorization": f"Token {SKETCHFAB_TOKEN}"}
    search_url = f"https://api.sketchfab.com/v3/search?type=models&q={asset_name}&downloadable=true"
    
    try:
        r = requests.get(search_url, timeout=15)
        res = r.json().get('results', [])
        if not res: return None
        
        uid = res[0]['uid']
        dl_url = f"https://api.sketchfab.com/v3/models/{uid}/download"
        dr = requests.get(dl_url, headers=headers, timeout=15)
        if dr.status_code != 200: return None
        
        links = dr.json()
        options = next((links[fmt] for fmt in ['glb', 'gltf', 'source'] if fmt in links), None)
        if not options: return None
        
        local_raw = os.path.join(RAW_MODEL_DIR, f"{asset_id}_temp")
        with requests.get(options['url'], stream=True, timeout=60) as fr:
            with open(local_raw, 'wb') as f:
                for chunk in fr.iter_content(8192): f.write(chunk)
        
        # Identification
        with open(local_raw, 'rb') as f:
            magic = f.read(4)
            ext = '.glb' if magic == b'glTF' else ('.zip' if magic[:2] == b'PK' else '.raw')
            
        final_raw = os.path.join(RAW_MODEL_DIR, f"{asset_id}{ext}")
        if os.path.exists(final_raw): os.remove(final_raw)
        os.rename(local_raw, final_raw)
        
        if ext == '.zip':
            extract_dir = os.path.join(RAW_MODEL_DIR, asset_id)
            with zipfile.ZipFile(final_raw, 'r') as zf: zf.extractall(extract_dir)
            for root, _, files in os.walk(extract_dir):
                for file in files:
                    if file.lower().endswith(('.gltf', '.glb', '.obj', '.fbx', '.stl')):
                        return os.path.join(root, file)
        return final_raw
    except: return None

def fetch_image_from_ddg(name, asset_id):
    query = f"{name} military vehicle"
    try:
        with DDGS() as ddgs:
            results = list(ddgs.images(query, max_results=2))
            if not results: return None
            
            img_url = results[0]['image']
            local_path = os.path.join(IMAGE_DIR, f"{asset_id}.jpg")
            r = requests.get(img_url, timeout=10, stream=True)
            if r.status_code == 200:
                with open(local_path, 'wb') as f:
                    for chunk in r.iter_content(8192): f.write(chunk)
                return local_path
    except: pass
    return None

def extract_intel(name, cat_id):
    try:
        system_prompt = (
            "You are a Senior Military Intelligence Analyst. Extract technical specifications. "
            "Output ONLY JSON matching this schema: "
            "{ \"name\": \"string\", \"range\": \"string\", \"speed\": \"string\", \"rcs\": \"string\", "
            "\"payload\": \"string\", \"generation\": \"string\", \"role\": \"string\", "
            "\"dangerLevel\": number, \"threatType\": \"string\" } "
            "Return {} if civilian or generic."
        )
        response = client.chat.completions.create(
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": f"Asset: {name}"}],
            model="llama3.1-8b", 
            response_format={"type": "json_object"}
        )
        intel = json.loads(response.choices[0].message.content)
        if not intel or "name" not in intel: return None
        return intel
    except Exception as e:
        safe_print(f" [!] Intel extraction failed for {name}: {e}")
        return None

def process_asset_live(asset):
    """The Master Live-Sync Loop for a single asset."""
    original_name = asset['name']
    cat_id = asset['catId']
    
    safe_print(f"\n[*] Reconnaissance: {original_name}")
    
    # 1. Intel Discovery
    intel = extract_intel(original_name, cat_id)
    if not intel: 
        safe_print(f"    [-] Aborted: Not military or OSINT failure.")
        return False
    
    real_name = intel['name']
    # 1. PREVENT EMPTY SLUG / INVALID ASSET ID
    asset_id = generate_slug(real_name)
    if not asset_id:
        safe_print(f"[INVALID SLUG] name={real_name}")
        return False

    asset.update({
        "id": asset_id,
        "name": real_name,
        "specs": intel,
        "dangerLevel": intel.get('dangerLevel', 5),
        "threatType": intel.get('threatType', 'Classified')
    })

    # 2. Image Fetch & Sync
    img_local = fetch_image_from_ddg(real_name, asset_id)
    if img_local:
        if DEPLOY_MODE == "CLOUDFLARE":
            if upload_to_r2(img_local, f"images/{asset_id}.jpg"):
                asset['img'] = f"{R2_PUBLIC_URL}images/{asset_id}.jpg"
        else:
            asset['img'] = f"{asset_id}.jpg"
        safe_print(f"    [+] Image Synced: {asset_id}.jpg")
    else:
        safe_print(f"    [!] Image Acquisition Failed.")

    # 3. Model Fetch, Convert & Sync
    raw_path = download_sketchfab_model(real_name, asset_id)
    if raw_path:
        glb_local = trigger_conversion(raw_path, asset_id)
        if glb_local:
            if DEPLOY_MODE == "CLOUDFLARE":
                if upload_to_r2(glb_local, f"models/{asset_id}.glb"):
                    asset['model'] = f"{R2_PUBLIC_URL}models/{asset_id}.glb"
            else:
                asset['model'] = f"{asset_id}.glb"
            safe_print(f"    [+] Model Materialized: {asset_id}.glb")
        else:
            safe_print(f"    [!] GLB Fusion Failed.")
    else:
        safe_print(f"    [!] Model Scouting Failed.")

    # 4. Persistence
    if save_asset_to_db(asset):
        safe_print(f"    [✓] Database Lock-in: {asset_id}")
        return True
    return False

def expand_targets(current_assets, target_count=1000):
    safe_print(f"[*] Intelligence Briefing: Expanding target list to {target_count}...")
    categories = {
        "1": ["Main Battle Tank", "Cold War MBT", "Modern AFV"],
        "2": ["Stealth Fighter", "Strategic Bomber", "Attack Helicopter"],
        "3": ["SAM System", "Patriot Battery", "S-400"],
        "4": ["UCAV", "Loitering Munition", "Kamikaze Drone"],
        "5": ["Destroyer", "Stealth Frigate", "Attack Submarine"]
    }
    
    new_targets = []
    current_ids = {a['name'].lower() for a in current_assets}
    needed = target_count - len(current_assets)
    if needed <= 0: return []

    per_cat = (needed // len(categories)) + 1
    for cat_id, hints in categories.items():
        for hint in hints:
            num = (per_cat // len(hints)) + 1
            safe_print(f"    [>] Scouting {num} targets for {hint}...")
            try:
                prompt = (f"Return a JSON list of exactly {num} UNIQUE, REAL {hint} models from world militaries (USA, Russia, China, NATO). "
                          "Format: {\"list\": [\"Name1\", ...]} No placeholders like 'Classified'.")
                response = client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="gpt-oss-120b",
                    response_format={"type": "json_object"}
                )
                names = json.loads(response.choices[0].message.content).get("list", [])
                for n in names:
                    if n.lower() not in current_ids:
                        new_targets.append({"catId": cat_id, "name": n, "featured": False})
                        current_ids.add(n.lower())
            except Exception as e: 
                safe_print(f"    [!] Scouting error for {hint}: {e}")
    return new_targets

def main():
    # 8. ADD DEBUG OUTPUT FOR R2 CONFIG
    safe_print("R2 CONFIG:")
    safe_print(f"Bucket: {R2_BUCKET_NAME}")
    safe_print(f"Endpoint: https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com")
    safe_print(f"Deploy Mode: {DEPLOY_MODE}")
    
    safe_print(f"🚀 INITIALIZING HYBRID LIVE-SYNC [Mode: {DEPLOY_MODE}]")
    
    # Load Existing
    if os.path.exists(JSON_PATH):
        with open(JSON_PATH, 'r', encoding='utf-8') as f:
            existing_assets = json.load(f)
    else:
        existing_assets = []

    # Filter out junk already
    existing_assets = [a for a in existing_assets if len(a.get('name', '')) > 2]
    
    # Scout New Targets
    new_targets = expand_targets(existing_assets, 1000)
    safe_print(f"[*] Intelligence Discovery Found {len(new_targets)} Targets.")

    # Live Processing Loop
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_asset_live, t): t for t in new_targets}
        for future in as_completed(futures):
            future.result()

    safe_print(f"\n[!] OPERATION LIVE-SYNC COMPLETE.")

if __name__ == "__main__":
    main()
