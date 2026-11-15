import os
import subprocess

base_src = "scratch/TBS_GoDot/assets/sound"
out_dir = "Water-Emblem/public/audio/sfx"
os.makedirs(out_dir, exist_ok=True)

sfx_map = {
    "sfx_cursor": f"{base_src}/cursor/cursorMovement.wav",
    "sfx_select": f"{base_src}/cursor/selectUnit.wav",
    "sfx_accept": f"{base_src}/cursor/accept.wav",
    "sfx_cancel": f"{base_src}/cursor/backSound.wav",
    "sfx_invalid": f"{base_src}/cursor/Not Allowed.wav",
    "sfx_sword": f"{base_src}/battle sounds/Attack Hit 1.wav",
    "sfx_lance": f"{base_src}/battle sounds/Attack Hit 2.wav",
    "sfx_axe": f"{base_src}/battle sounds/AXE_3.wav",
    "sfx_bow": f"{base_src}/battle sounds/ARROW_2.wav",
    "sfx_crit": f"{base_src}/battle sounds/Critical Hit 1.wav",
    "sfx_miss": f"{base_src}/battle sounds/Attack Miss 1.wav",
    "sfx_damage": f"{base_src}/battle sounds/Damage taken.wav",
    "sfx_nodamage": f"{base_src}/battle sounds/No Damage.wav",
    "sfx_death": f"{base_src}/battle sounds/Death.wav",
    "sfx_heal": f"{base_src}/battle sounds/Heal.wav",
    "sfx_levelup": f"{base_src}/battle sounds/Level Up.wav",
    "sfx_step_foot": f"{base_src}/unitMovement/Light Foot Steps 1.wav",
    "sfx_step_armor": f"{base_src}/misc/ARMOR_0.wav",
    "sfx_step_horse": f"{base_src}/unitMovement/Horse Steps.wav",
    "sfx_step_pegasus": f"{base_src}/unitMovement/PEGASUS_FLAP_0.wav",
    "sfx_player_phase": f"{base_src}/transition/Player Phase Start.wav",
    "sfx_enemy_phase": f"{base_src}/transition/Enemy Phase Start.wav",
    "sfx_stage_clear": f"{base_src}/transition/Chapter Clear.wav",
    "sfx_item_get": f"{base_src}/misc/item get.wav",
}

print(f"Converting {len(sfx_map)} SFX tracks...")
for name, src in sfx_map.items():
    if not os.path.exists(src):
        print(f"Warning: {src} not found!")
        continue
    
    ogg_out = os.path.join(out_dir, f"{name}.ogg")
    mp3_out = os.path.join(out_dir, f"{name}.mp3")
    
    # Convert to OGG
    cmd_ogg = ["ffmpeg", "-y", "-i", src, "-c:a", "libvorbis", "-q:a", "4", ogg_out]
    subprocess.run(cmd_ogg, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    # Convert to MP3
    cmd_mp3 = ["ffmpeg", "-y", "-i", src, "-c:a", "libmp3lame", "-b:a", "128k", mp3_out]
    subprocess.run(cmd_mp3, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    print(f"Processed: {name} -> {os.path.basename(ogg_out)}, {os.path.basename(mp3_out)}")

print("Done converting SFX!")
