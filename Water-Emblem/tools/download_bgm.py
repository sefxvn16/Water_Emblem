import os
import subprocess
import urllib.parse

base_url = "https://archive.org/download/2024-08-24-fe03-mystery-of-the-emblem-ost-arrangements-extended/FE03%20Mystery%20of%20the%20Emblem%20OST%20Arrangements%20Extended/"
out_dir = "Water-Emblem/public/audio/bgm"
os.makedirs(out_dir, exist_ok=True)

tracks = {
    "bgm_player_phase": "Fire Emblem Mystery of the Emblem - Advance - Orchestral Cover 01f2 Extended.mp3",
    "bgm_enemy_phase": "Fire Emblem Mystery of the Emblem - Trouble! - Orchestral Cover 01c5 Extended.mp3",
    "bgm_battle": "Fire Emblem Mystery of the Emblem - Strike! - Orchestral Cover 01c5 Extended.mp3",
    "bgm_boss": "Fire Emblem Mystery of the Emblem - Confronting a Strong Foe - Orchestral Cover 01a4 Extended.mp3",
    "bgm_victory": "Fire Emblem Mystery of the Emblem - Victory is Ours - Orchestral Cover 01a4 Extended.mp3",
    "bgm_preparation": "Fire Emblem Mystery of the Emblem - Armory - Orchestral Cover 01b2 Extended.mp3",
}

print(f"Downloading and converting {len(tracks)} FE3 BGM tracks...")
for name, filename in tracks.items():
    encoded_filename = urllib.parse.quote(filename)
    stream_url = base_url + encoded_filename
    
    ogg_out = os.path.join(out_dir, f"{name}.ogg")
    mp3_out = os.path.join(out_dir, f"{name}.mp3")
    
    # Duration: 75 seconds is ideal for web game loop
    duration = "75"
    if name == "bgm_victory":
        duration = "45" # shorter fanfare
        
    print(f"Fetching {name} ({filename})...")
    
    # Stream & convert to OGG
    cmd_ogg = [
        "ffmpeg", "-y", "-ss", "0", "-t", duration,
        "-i", stream_url,
        "-vn", "-c:a", "libvorbis", "-q:a", "4",
        ogg_out
    ]
    subprocess.run(cmd_ogg, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    # Stream & convert to MP3
    cmd_mp3 = [
        "ffmpeg", "-y", "-ss", "0", "-t", duration,
        "-i", stream_url,
        "-vn", "-c:a", "libmp3lame", "-b:a", "128k",
        mp3_out
    ]
    subprocess.run(cmd_mp3, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    print(f"Created: {ogg_out} ({os.path.getsize(ogg_out)} bytes), {mp3_out} ({os.path.getsize(mp3_out)} bytes)")

# Handle Game Over from local file
local_gameover = "scratch/TBS_GoDot/assets/music/Game Over.ogg"
if os.path.exists(local_gameover):
    print("Processing local Game Over track...")
    go_ogg = os.path.join(out_dir, "bgm_gameover.ogg")
    go_mp3 = os.path.join(out_dir, "bgm_gameover.mp3")
    subprocess.run(["ffmpeg", "-y", "-i", local_gameover, "-vn", "-c:a", "libvorbis", "-q:a", "4", go_ogg], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    subprocess.run(["ffmpeg", "-y", "-i", local_gameover, "-vn", "-c:a", "libmp3lame", "-b:a", "128k", go_mp3], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    print(f"Created: {go_ogg}, {go_mp3}")

# Clean up test_advance.ogg
test_file = os.path.join(out_dir, "test_advance.ogg")
if os.path.exists(test_file):
    os.remove(test_file)

print("All BGM tracks successfully downloaded and processed!")
