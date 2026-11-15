import urllib.request
import re

url = "https://www.sounds-resource.com/ds_dsi/fireemblemshadowdragon/"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        matches = re.findall(r'href=["\'](/download/[^"\']+)["\']', html)
        print("Found download links:", matches)
        # Also find sound file links or zip links
        zips = re.findall(r'href=["\']([^"\']+\.zip)["\']', html)
        print("Found zip links:", zips)
except Exception as e:
    print("Error:", e)
