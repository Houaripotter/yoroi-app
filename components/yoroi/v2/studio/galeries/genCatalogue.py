# Genere catalogue.generated.ts : toutes les illustrations appelees par un require() dans app, components et lib.
# Lancer depuis la racine du projet : python3 components/yoroi/v2/studio/galeries/genCatalogue.py
import os, re, json
PARTENAIRES = 'assets/' + 'partenaires/'  # dossier supprime volontairement, jamais dans le catalogue
ROOT = os.getcwd()
OUT = os.path.join(ROOT, 'components/yoroi/v2/studio/galeries/catalogue.generated.ts')
EXT = ('.png', '.webp', '.jpg', '.jpeg')
RX = re.compile(r"require\(\s*'((?:[^'\\]|\\.)+)'\s*\)|require\(\s*\"([^\"]+)\"\s*\)")
found = {}
for base in ('app', 'components', 'lib'):
    for d, _, files in os.walk(os.path.join(ROOT, base)):
        if 'node_modules' in d or '_archive' in d:
            continue
        for f in files:
            if not f.endswith(('.ts', '.tsx')) or f == 'catalogue.generated.ts':
                continue
            p = os.path.join(d, f)
            try:
                txt = open(p, encoding='utf-8').read()
            except Exception:
                continue
            for m in RX.finditer(txt):
                raw = (m.group(1) or m.group(2)).replace("\\'", "'")
                if not raw.lower().endswith(EXT):
                    continue
                if raw.startswith('@/'):
                    rel = raw[2:]
                elif raw.startswith('.'):
                    rel = os.path.relpath(os.path.normpath(os.path.join(d, raw)), ROOT)
                else:
                    continue
                # Les photos partenaires ne doivent plus jamais entrer dans le catalogue.
                if rel.startswith(PARTENAIRES):
                    continue
                if os.path.isfile(os.path.join(ROOT, rel)):
                    found.setdefault(rel, set()).add(os.path.relpath(p, ROOT))

def famille(rel):
    r = rel.replace('assets/avatars/app/', 'APP/')
    if r.startswith('APP/monde/personnages/'): return 'personnages'
    if r.startswith('APP/guerrier/'): return 'guerrier'
    if r.startswith('APP/packs/'): return 'packs'
    if r.startswith('APP/monde/scenes/') or r.startswith('APP/themes/'): return 'scenes'
    if r.startswith('APP/monde/fonds/'): return 'fonds'
    if r.startswith('APP/ornements/'): return 'ornements'
    if r.startswith('APP/sports/_icones_centre/'): return 'icones'
    if r.startswith('APP/sports/'): return 'sports'
    if r.startswith('APP/carnet/partage_'): return 'partage'
    if r.startswith('APP/carnet/'): return 'carnet'
    if r.startswith('APP/sceaux/'): return 'sceaux'
    if r.startswith('APP/tampons/'): return 'tampons'
    if r.startswith("assets/logo d'app/") or r in ('assets/images/icon.png', 'assets/images/splash-yoroi.png'): return 'logos'
    if r.startswith('assets/images/'): return 'divers'
    if r.startswith('assets/body-images/'): return 'divers'
    if r.startswith('assets/avatars/'): return 'anciens'
    return 'divers'

def sous(rel, fam):
    parts = rel.split('/')
    if fam == 'tampons':
        return {'record': 'Records', 'victoire': 'Victoire', 'medaille': 'Médailles', 'objectif': 'Objectifs', 'frein': 'Freins'}.get(parts[-1].split('_')[0].split('.')[0], 'Réserve')
    if fam in ('packs', 'sports', 'sceaux', 'anciens'):
        return parts[-2] if parts[-2] not in ('male', 'female') else parts[-3]
    return ''

ORDER = ['personnages', 'guerrier', 'packs', 'scenes', 'fonds', 'ornements', 'sports', 'carnet', 'partage', 'sceaux', 'tampons', 'logos', 'icones', 'partenaires', 'divers', 'anciens']
rows = sorted(found, key=lambda r: (ORDER.index(famille(r)), r))
L = ['/**', ' * Fichier ecrit par genCatalogue.py (meme dossier), ne pas modifier a la main.',
     ' * Chaque illustration appelee par un require() de l\'app, rangee par famille, pour la galerie du Studio.', ' */',
     "import type { ImageSourcePropType } from 'react-native';", '',
     'export type ImageFamille = ' + ' | '.join("'%s'" % f for f in ORDER) + ';', '',
     'export type ImageEntree = { famille: ImageFamille; groupe: string; nom: string; chemin: string; src: ImageSourcePropType };', '',
     'export const CATALOGUE_IMAGES: ImageEntree[] = [']
for r in rows:
    fam = famille(r)
    req = '@/' + r
    req_js = req.replace("'", "\\'")
    L.append("  { famille: '%s', groupe: %s, nom: %s, chemin: %s, src: require('%s') }," % (fam, json.dumps(sous(r, fam)), json.dumps(os.path.basename(r)), json.dumps(r, ensure_ascii=False), req_js))
L.append('];')
open(OUT, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
from collections import Counter
print(len(rows), Counter(famille(r) for r in rows))
