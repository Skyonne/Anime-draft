"""Regenerate original abstract avatars from the JSON catalogue. Python 3, no dependencies."""
import hashlib
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
catalog = json.loads((ROOT / 'src/data/characters.json').read_text(encoding='utf-8'))
generated = 0
for character in catalog:
    if not character["image"].lower().endswith(".svg"):
        continue  # Preserve authorized raster portraits.
    digest = hashlib.sha256(character['id'].encode()).digest()
    hue = [22, 5, 166, 207, 267, 42][digest[0] % 6]
    initials = ''.join(part[0] for part in character['name'].split()[:2])
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 480 600">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="hsl({hue},30%,21%)"/><stop offset="1" stop-color="#101216"/></linearGradient><radialGradient id="glow"><stop stop-color="hsl({hue},70%,55%)" stop-opacity=".24"/><stop offset="1" stop-opacity="0"/></radialGradient><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#fff" stroke-opacity=".035"/></pattern></defs>
<path fill="url(#bg)" d="M0 0h480v600H0z"/><path fill="url(#grid)" d="M0 0h480v600H0z"/>
<circle cx="240" cy="245" r="220" fill="url(#glow)"/>
<g fill="none" stroke="hsl({hue},65%,63%)"><circle cx="240" cy="245" r="160" opacity=".22"/><circle cx="240" cy="245" r="145" stroke-dasharray="2 10" opacity=".4"/><path d="M240 63v44m0 276v44M58 245h44m276 0h44" opacity=".5"/></g>
<path d="M110 490q5-105 130-124 125 19 130 124" fill="#0c0f14" opacity=".8"/>
<path d="M162 217q-10-101 78-116 88 15 78 116l-12 92q-26 49-66 56-40-7-66-56z" fill="hsl({hue},16%,15%)" stroke="hsl({hue},28%,33%)"/>
<path d="m158 191 82-45 82 45-7 34H165z" fill="#30343b"/>
<rect x="194" y="184" width="92" height="43" rx="8" fill="#777c81"/>
<path d="m223 206 17-11 17 11-17 11z" fill="none" stroke="#252a30" stroke-width="3"/>
<path d="m189 252 29 5m44 0 29-5" stroke="hsl({hue},75%,68%)" stroke-width="4"/>
<text x="240" y="325" text-anchor="middle" fill="hsl({hue},55%,75%)" font-family="Arial,sans-serif" font-weight="700" font-size="41" letter-spacing="6">{html.escape(initials)}</text>
<text x="28" y="37" fill="#bbc0c7" opacity=".5" font-family="monospace" font-size="10" letter-spacing="3">SHINOBI ARCHIVE / {digest[1]:03d}</text>
<path d="M28 60V28h32m360 0h32v32M28 500v32h32m360 0h32v-32" fill="none" stroke="hsl({hue},50%,60%)" opacity=".4"/>
</svg>'''
    path = ROOT / 'public' / character['image']
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg.strip().replace('>\n<', '><') + '\n', encoding='utf-8')
    generated += 1
print(f'{generated} avatars generated')
