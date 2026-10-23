#!/usr/bin/env python3
"""
Regenere lib/v2/seance/sportArt.generated.ts a partir des images presentes dans
assets/avatars/app/sports/ (un dossier par sport, fichiers <sport>_{h,f}_{1,2,3}.webp)
et des icones de assets/avatars/app/sports/_icones/.

Metro exige des require() statiques vers des fichiers qui existent : ce script n'ecrit
que les fichiers reellement presents. A relancer quand de nouvelles images arrivent :
    python3 lib/v2/seance/genSportVisuals.py
Il affiche ensuite, pour chaque sport de lib/sports.ts, l'illustration retenue.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SPORTS_DIR = os.path.join(ROOT, 'assets', 'avatars', 'app', 'sports')
ICONS_DIR = os.path.join(SPORTS_DIR, '_icones')
# copies recentrees des icones : dans _icones le dessin est en haut du cadre 600x800,
# ici il est centre pour se poser dans les memes cases que les personnages
CENTER_DIR = os.path.join(SPORTS_DIR, '_icones_centre')
OUT = os.path.join(HERE, 'sportArt.generated.ts')
MAP = os.path.join(HERE, 'sportArtMap.ts')
SPORTS_TS = os.path.join(ROOT, 'lib', 'sports.ts')

FILE_RE = re.compile(r'^(?P<base>.+)_(?P<g>[hf])_(?P<n>\d+)\.webp$')
IDENT_RE = re.compile(r'^[A-Za-z_$][A-Za-z0-9_$]*$')


def key(k):
    return k if IDENT_RE.match(k) else "'" + k + "'"


def req(rel):
    return "require('@/" + rel.replace(os.sep, '/') + "')"


def scan():
    art = {}
    for folder in sorted(os.listdir(SPORTS_DIR)):
        p = os.path.join(SPORTS_DIR, folder)
        if folder.startswith('_') or folder.startswith('.') or not os.path.isdir(p):
            continue
        sets = {'h': [], 'f': []}
        for f in os.listdir(p):
            m = FILE_RE.match(f)
            if not m or os.path.getsize(os.path.join(p, f)) == 0:
                continue
            sets[m.group('g')].append((int(m.group('n')), f))
        if not sets['h'] and not sets['f']:
            continue
        art[folder] = {g: [f for _, f in sorted(v)] for g, v in sets.items()}
    icons = []
    if os.path.isdir(ICONS_DIR):
        icons = sorted(f[:-5] for f in os.listdir(ICONS_DIR) if f.endswith('.webp') and os.path.getsize(os.path.join(ICONS_DIR, f)) > 0)
    return art, center_icons(icons)


def center_icons(icons):
    """Ecrit les copies centrees ; renvoie les icones disponibles (centrees si possible)."""
    try:
        from PIL import Image
    except ImportError:
        return [(n, os.path.join('_icones', n + '.webp')) for n in icons]
    os.makedirs(CENTER_DIR, exist_ok=True)
    out = []
    for n in icons:
        src = os.path.join(ICONS_DIR, n + '.webp')
        dst = os.path.join(CENTER_DIR, n + '.webp')
        if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
            im = Image.open(src).convert('RGBA')
            box = im.getchannel('A').getbbox()
            if box:
                part = im.crop(box)
                W, H = im.size
                canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
                canvas.paste(part, ((W - part.width) // 2, (H - part.height) // 2), part)
                canvas.save(dst, 'WEBP', quality=92, method=6)
            else:
                im.save(dst, 'WEBP')
        out.append((n, os.path.join('_icones_centre', n + '.webp')))
    return out


def write(art, icons):
    rel_sports = os.path.relpath(SPORTS_DIR, ROOT)
    lines = [
        '/**',
        ' * Fichier ecrit par genSportVisuals.py, ne pas modifier a la main.',
        ' * Table des illustrations de sport presentes sur le disque (require statiques pour Metro).',
        ' */',
        "import type { ImageSourcePropType } from 'react-native';",
        '',
        'export type ArtSet = { h: ImageSourcePropType[]; f: ImageSourcePropType[] };',
        '',
        'export const SPORT_ART: Record<string, ArtSet> = {',
    ]
    for folder, sets in art.items():
        lines.append('  ' + key(folder) + ': {')
        for g in ('h', 'f'):
            items = ', '.join(req(os.path.join(rel_sports, folder, f)) for f in sets[g])
            lines.append('    ' + g + ': [' + items + '],')
        lines.append('  },')
    lines.append('};')
    lines.append('')
    lines.append('export const SPORT_ICONS: Record<string, ImageSourcePropType> = {')
    for name, rel in icons:
        lines.append('  ' + key(name) + ': ' + req(os.path.join(rel_sports, rel)) + ',')
    lines.append('};')
    lines.append('')
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))


def report(art, icons):
    src = open(MAP, encoding='utf-8').read()
    body = src.split('SPORT_ART_MAP', 1)[1].split('};', 1)[0]
    amap = {m.group(1) or m.group(2): re.findall(r"'([^']+)'", m.group(3))
            for m in re.finditer(r"^\s*(?:'([^']+)'|([A-Za-z_][\w]*)):\s*\[(.*?)\],", body, re.M)}
    cat_body = src.split('CATEGORY_ICON', 1)[1].split('};', 1)[0]
    cat_icon = dict(re.findall(r"(\w+):\s*'([^']+)'", cat_body))
    sports_src = open(SPORTS_TS, encoding='utf-8').read()
    sports = re.findall(r"id:\s*'([^']+)',\s*\n\s*name:\s*'(?:[^'\\]|\\.)*',.*?category:\s*'([^']+)'", sports_src, re.S)
    ill, ico, missing_icons = [], [], set()
    for sid, cat in sports:
        choices = amap.get(sid, []) + ['@' + cat_icon.get(cat, 'medaille'), '@medaille']
        pick = None
        for c in choices:
            if c.startswith('@'):
                if c[1:] in icons:
                    pick = c
                    break
                missing_icons.add(c[1:])
            elif c in art:
                pick = c
                break
        (ico if pick is None or pick.startswith('@') else ill).append((sid, pick))
    print('Dossiers d illustrations : %d (%s)' % (len(art), ', '.join(art)))
    print('Icones : %d' % len(icons))
    print('Sports de lib/sports.ts : %d, avec illustration : %d, avec icone : %d' % (len(sports), len(ill), len(ico)))
    not_in_map = [s for s, _ in sports if s not in amap]
    if not_in_map:
        print('Sports absents de sportArtMap.ts (icone de famille) : ' + ', '.join(not_in_map))
    unknown = [k for k in amap if k not in dict(sports)]
    if unknown:
        print('Cles de sportArtMap.ts inconnues de lib/sports.ts : ' + ', '.join(unknown))
    if missing_icons:
        print('Icones citees mais absentes : ' + ', '.join(sorted(missing_icons)))
    if '-v' in sys.argv:
        for sid, pick in ill + ico:
            print('  %s -> %s' % (sid, pick))
    wanted = sorted({c for v in amap.values() for c in v if not c.startswith('@') and c not in art})
    if wanted:
        print('Dossiers attendus, pas encore la : ' + ', '.join(wanted))


if __name__ == '__main__':
    a, i = scan()
    write(a, i)
    print('Ecrit : ' + os.path.relpath(OUT, ROOT))
    report(a, [n for n, _ in i])
