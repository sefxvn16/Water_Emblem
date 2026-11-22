#!/usr/bin/env python3
"""
tools/extract_fe3_dialogues.py

Tool for parsing, cleaning, and extracting Fire Emblem 3 dialogues from
FE3 Akaneia Refined buildfiles (`project/text/dialogue/*.txt`) into
clean JSON files conforming to Water Emblem's DialogueLine schema:
{
  "speaker": string,
  "avatarUrl": string,
  "text": string
}
"""

import os
import re
import sys
import json
from typing import List, Dict, Any, Optional

DEFAULT_FE3_TEXT_DIR = r"D:\Games\Snes\Fire Emblem\FE 3\Akaneia Refined patch\FE3_buildfiles_v1.2\FE3_buildfiles_v1.2\fe3_version_E\project\text\dialogue"

PORTRAIT_MAP = {
    "00": "Marth",
    "01": "Caeda",
    "02": "Jagen",
    "03": "Cain",
    "04": "Abel",
    "05": "Draug",
    "06": "Gordin",
    "07": "Wrys",
    "08": "Ogma",
    "09": "Barst",
    "0a": "Bord",
    "0b": "Cord",
    "0c": "Castor",
    "0d": "Julian",
    "0e": "Lena",
    "0f": "Navarre",
    "10": "Merric",
    "11": "Matthis",
    "12": "Hardin",
    "13": "Wolf",
    "14": "Sedgar",
    "15": "Roshea",
    "16": "Vyland",
    "17": "Wendell",
    "18": "Rickard",
    "19": "Bantu",
    "1a": "Caesar",
    "1b": "Radd",
    "1c": "Roger",
    "1d": "Jeorge",
    "1e": "Maria",
    "1f": "Minerva",
    "20": "Linde",
    "21": "Jake",
    "22": "Midia",
    "23": "Catria",
    "24": "Palla",
    "25": "Est",
    "26": "Tiki",
    "27": "Lorenz",
    "28": "Elice",
    "29": "Gazzak",
    "2a": "Gomer",
    "2b": "Reynald",
}


def clean_fe3_text(raw_text: str) -> str:
    """Removes assembly directives, comments, hex tags, and formatting codes."""
    # Remove metadata lines
    text = re.sub(r'@[^\n]*\n?', '', raw_text)
    text = re.sub(r'#[^\n]*\n?', '', text)

    # Strip custom bracket tags
    text = re.sub(r'\[ClearFrame\]', '\n[ClearFrame]\n', text)
    text = re.sub(r'\[SwitchFrame\]\[[0-9a-fA-F]+\]', '', text)
    text = re.sub(r'\[CloseFrame\]\[[0-9a-fA-F]+\]', '', text)
    text = re.sub(r'\[WaitForA\]', '\n', text)
    text = re.sub(r'\[PlaySong\]\[[0-9a-fA-F]+\]\[[0-9a-fA-F]+\]', '', text)
    text = re.sub(r'\[_[0-9a-fA-F]+\]\[[0-9a-fA-F]+\]', '', text)
    text = re.sub(r'\[Space2\]', ' ', text)
    text = re.sub(r'\[Exclaim2\]', '!', text)
    text = re.sub(r'\[Question2\]', '?', text)

    return text


def parse_dialogue_file(filepath: str) -> List[Dict[str, str]]:
    """Parses an FE3 dialogue file into a list of {speaker, avatarUrl, text} objects."""
    if not os.path.isfile(filepath):
        return []

    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    cleaned = clean_fe3_text(content)
    lines: List[Dict[str, str]] = []

    current_speaker = "Narrator"
    # Match portrait shifts: [ShowPortrait][id][frame]
    segments = re.split(r'\[ShowPortrait\]\[([0-9a-fA-F]{2})\](?:\[[0-9a-fA-F]{2}\])?', cleaned)

    for i in range(len(segments)):
        if i % 2 == 1:
            portrait_id = segments[i].lower()
            current_speaker = PORTRAIT_MAP.get(portrait_id, f"Speaker_{portrait_id}")
        else:
            text_block = segments[i]
            # Strip remaining bracket tags
            text_block = re.sub(r'\[[^\]]*\]', '', text_block)
            paragraphs = [p.strip() for p in text_block.split('\n') if p.strip()]
            for p in paragraphs:
                cleaned_p = ' '.join(p.split())
                if cleaned_p and len(cleaned_p) > 2:
                    lines.append({
                        "speaker": current_speaker,
                        "avatarUrl": f"/avatars/{current_speaker.lower()}.png" if current_speaker != "Narrator" else "",
                        "text": cleaned_p
                    })

    return lines


def extract_chapter_dialogues(dialogue_dir: str, file_indices: List[str]) -> Dict[str, Any]:
    """Extracts lines from specified file indices into a structured dialogue dict."""
    result = {}
    for idx in file_indices:
        filename = f"{idx.zfill(2)}.txt"
        path = os.path.join(dialogue_dir, filename)
        dialogue_lines = parse_dialogue_file(path)
        if dialogue_lines:
            result[f"event_{idx}"] = dialogue_lines
    return result


def main():
    dialogue_dir = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_FE3_TEXT_DIR
    print(f"Extracting FE3 dialogues from: {dialogue_dir}")
    if not os.path.isdir(dialogue_dir):
        print(f"Directory not found: {dialogue_dir}")
        sys.exit(1)

    # Test sample extraction on file 01.txt (Chapter 1 Opening)
    sample_file = os.path.join(dialogue_dir, "01.txt")
    if os.path.isfile(sample_file):
        parsed = parse_dialogue_file(sample_file)
        print(f"Sample 01.txt parsed {len(parsed)} dialogue lines:")
        for line in parsed[:4]:
            print(f"  [{line['speaker']}]: {line['text']}")


if __name__ == "__main__":
    main()
