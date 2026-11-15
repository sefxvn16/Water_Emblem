import os
import re
import urllib.request
import json
import time

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dest_dir = os.path.join(project_root, 'public', 'avatars', 'Original')
os.makedirs(dest_dir, exist_ok=True)

url = 'https://fireemblemwiki.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:Mystery_of_the_Emblem_portraits&gcmlimit=500&prop=imageinfo&iiprop=url|size&format=json'
req = urllib.request.Request(url, headers={'User-Agent': 'WaterEmblemDownloader/1.0 (contact@example.com)'})

print("Fetching metadata from Fire Emblem Wiki...")
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

pages = data.get('query', {}).get('pages', {})
print(f"Total pages fetched: {len(pages)}")

items = []
for pid, pinfo in pages.items():
    title = pinfo.get('title', '')
    iinfo = pinfo.get('imageinfo', [{}])[0]
    img_url = iinfo.get('url', '')
    if img_url:
        items.append((title, img_url))

items.sort(key=lambda x: x[0])

downloaded = 0
failed = []

for title, img_url in items:
    # Example: 'File:Portrait marth 01 fe03.png' -> 'Portrait_marth_01_fe03.png'
    raw_name = title.replace('File:', '').strip()
    clean_filename = re.sub(r'[\'\"\s]+', '_', raw_name)
    target_path = os.path.join(dest_dir, clean_filename)
    
    if os.path.exists(target_path) and os.path.getsize(target_path) > 0:
        downloaded += 1
        continue
    
    try:
        img_req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(img_req, timeout=15) as img_resp:
            content = img_resp.read()
            with open(target_path, 'wb') as f:
                f.write(content)
        downloaded += 1
        print(f"[{downloaded}/{len(items)}] Downloaded: {clean_filename}")
        time.sleep(0.1) # polite delay
    except Exception as e:
        print(f"Failed to download {title}: {e}")
        failed.append((title, img_url, str(e)))

print(f"\nFinished! Total downloaded: {downloaded}/{len(items)}")
if failed:
    print(f"Failed count: {len(failed)}")
    for f in failed:
        print(f)
