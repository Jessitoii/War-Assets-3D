# test_wiki.py — aynı klasöre kaydet, çalıştır
import httpx
import json

url = "https://en.wikipedia.org/w/api.php"
params = {
    "action": "query",
    "titles": "T-90",
    "prop": "extracts",
    "explaintext": True,
    "exsectionformat": "plain",
    "format": "json",
    "redirects": 1,
}

with httpx.Client(follow_redirects=True) as client:
    resp = client.get(url, params=params, timeout=15,
                      # test_wiki.py — User-Agent'ı değiştir
headers = {
    "User-Agent": "WarAssets3D/1.0 (https://github.com/Jessitoii/war-assets; alpercanzerr1600@gmail.com)"
})
    print(f"Status: {resp.status_code}")
    print(f"Content-Type: {resp.headers.get('content-type')}")
    print(f"Body (ilk 500 char): {resp.text[:500]}")