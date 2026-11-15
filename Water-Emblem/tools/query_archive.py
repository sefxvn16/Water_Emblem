import urllib.request
import json

def list_contents(path="assets"):
    url = f'https://api.github.com/repos/ja-brouil/TBS_GoDot/contents/{path}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            for item in data:
                print(f"{path}/{item.get('name')} ({item.get('type')})")
                if item.get('type') == 'dir':
                    list_contents(f"{path}/{item.get('name')}")
    except Exception as e:
        print("Error:", e)

list_contents()
