import os
import re
import requests
from urllib.parse import quote

# Configuration
ASSETS_FILE = 'mobile/assets/data/military-assets.ts'
OUTPUT_DIR = 'backend-cdn/public/images/'
WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php"

def get_asset_list():
    with open(ASSETS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to extract id and name from the TS file
    pattern = r"id:\s*'([^']*)'.*?name:\s*'([^']*)'"
    matches = re.findall(pattern, content, re.DOTALL)
    return [{"id": m[0], "name": m[1]} for m in matches]

def download_image(asset_name, asset_id):
    print(f"Searching for {asset_name}...")
    
    # 1. Search for the Wikipedia page
    search_params = {
        "action": "query",
        "format": "json",
        "list": "search",
        "srsearch": asset_name,
        "utf8": 1,
        "formatversion": 2
    }
    
    try:
        r = requests.get(WIKIPEDIA_API_URL, params=search_params)
        data = r.json()
        
        if not data['query']['search']:
            print(f"No Wikipedia page found for {asset_name}")
            return False
            
        page_title = data['query']['search'][0]['title']
        
        # 2. Get the main image from the page
        image_params = {
            "action": "query",
            "format": "json",
            "titles": page_title,
            "prop": "pageimages",
            "pithumbsize": 800,
            "formatversion": 2
        }
        
        r = requests.get(WIKIPEDIA_API_URL, params=image_params)
        data = r.json()
        
        page = data['query']['pages'][0]
        if 'thumbnail' not in page:
            print(f"No thumbnail found for {page_title}")
            return False
            
        img_url = page['thumbnail']['source']
        
        # 3. Download the image
        img_data = requests.get(img_url).content
        
        output_path = f"{OUTPUT_DIR}{asset_id}.jpg"
        with open(output_path, 'wb') as f:
            f.write(img_data)
        
        print(f"Successfully downloaded {asset_id}.jpg")
        return True
        
    except Exception as e:
        print(f"Error downloading {asset_name}: {e}")
        return False

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    assets = get_asset_list()
    print(f"Found {len(assets)} assets to download.")
    
    success_count = 0
    for asset in assets:
        if download_image(asset['name'], asset['id']):
            success_count += 1
            
    print(f"\nFinished! Successfully downloaded {success_count}/{len(assets)} images.")

if __name__ == "__main__":
    main()
