"""Prepare a manually cleared local portrait. No network, no catalogue/stat changes.
Requires Pillow: python -m pip install Pillow
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import warnings

ROOT = Path(__file__).resolve().parents[1]

def optimize(source, focus=(0.5, 0.5)):
    from PIL import Image, ImageOps
    warnings.simplefilter('error', Image.DecompressionBombWarning)
    with Image.open(source) as image:
        if getattr(image, 'n_frames', 1) != 1:
            raise ValueError('Une image fixe est requise.')
        image = ImageOps.exif_transpose(image)
        image = ImageOps.fit(image.convert('RGBA' if 'A' in image.getbands() else 'RGB'), (400, 500), Image.Resampling.LANCZOS, centering=focus)
        # Recreate pixels so EXIF, ICC and comments cannot leak into the output.
        image = Image.frombytes(image.mode, image.size, image.tobytes())
        for quality in range(84, 39, -5):
            output = io.BytesIO()
            image.save(output, format='WEBP', quality=quality, method=6)
            if len(output.getvalue()) <= 120000:
                return output.getvalue(), quality
    raise ValueError('Impossible de respecter la limite de 120 Ko sans dégrader davantage le portrait.')

def main():
    parser = argparse.ArgumentParser(description='Optimiser un portrait dont la réutilisation a été vérifiée manuellement.')
    parser.add_argument('--approval', required=True, type=Path, help='JSON de droits et crédits ; voir docs/PORTRAITS.md')
    parser.add_argument('--input', required=True, type=Path, help='Fichier local autorisé, jamais une URL')
    parser.add_argument('--focus-x', type=float, default=0.5)
    parser.add_argument('--focus-y', type=float, default=0.5)
    parser.add_argument('--replace', action='store_true', help='Remplacer explicitement un portrait déjà inscrit')
    args = parser.parse_args()
    if not (0 <= args.focus_x <= 1 and 0 <= args.focus_y <= 1):
        parser.error('Le cadrage doit être entre 0 et 1.')
    node = shutil.which('node')
    if not node and Path('C:/Program Files/nodejs/node.exe').is_file():
        node = 'C:/Program Files/nodejs/node.exe'
    if not node:
        raise ValueError('Node.js est requis pour valider les crédits.')
    subprocess.run([node, str(ROOT/'scripts/portrait-tools.mjs'), '--check-approval', str(args.approval.resolve())], cwd=ROOT, check=True)
    approval = json.loads(args.approval.read_text(encoding='utf-8'))
    manifest_path = ROOT/'src/data/portraits.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    identifier = approval['characterId']
    relative = f'characters/portraits/{identifier}.webp'
    destination = ROOT/'public'/relative
    if not args.replace and (destination.exists() or any(p['characterId'] == identifier for p in manifest['portraits'])):
        raise ValueError('Portrait existant : utiliser --replace seulement si son remplacement est voulu.')
    data, quality = optimize(args.input, (args.focus_x, args.focus_y))
    approval.update(file=relative, width=400, height=500, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), position='50% 50%')
    approval['changes'] += f' Traitement local : orientation EXIF, recadrage 4:5 ({args.focus_x}, {args.focus_y}), 400 × 500, WebP qualité {quality}, métadonnées retirées.'
    manifest['portraits'] = [p for p in manifest['portraits'] if p['characterId'] != identifier] + [approval]
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    temporary = manifest_path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    temporary.replace(manifest_path)
    subprocess.run([node, str(ROOT/'scripts/portrait-tools.mjs'), '--sync'], cwd=ROOT, check=True)
    print(f'{identifier}: {len(data)} octets, 400 × 500, crédits synchronisés. Vérifier le cadrage visuellement avant publication.')

if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
