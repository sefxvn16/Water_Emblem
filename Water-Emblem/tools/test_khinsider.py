import urllib.request
import re

url = "https://downloads.khinsider.com/game-soundtracks/album/fire-emblem-mystery-of-the-emblem-snes-gamerip-1993"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        matches = re.findall(r'href="(/game-soundtracks/album/fire-emblem-mystery-of-the-emblem-snes-gamerip-1993/[^"]+)"', html)
        print(f"Found {len(matches)} track page links.")
        if matches:
            print("First 5:", matches[:5])
except Exception as e:
    print("Error:", e)
