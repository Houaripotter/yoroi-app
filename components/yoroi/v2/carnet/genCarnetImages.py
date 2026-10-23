#!/usr/bin/env python3
# Regenere components/yoroi/v2/carnet/images.ts a partir des fichiers presents.
# Pour chaque id : si assets/avatars/app/carnet/<id>.webp existe, il est utilise ;
# sinon le repli indique ci-dessous (un fichier qui existe deja dans l'app).
# Usage, depuis n'importe ou :  python3 components/yoroi/v2/carnet/genCarnetImages.py
# Un require() vers un fichier absent fait planter le build : le script verifie chaque chemin.
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
os.chdir(ROOT)

A = 'assets/avatars/app/'
CARNET = A + 'carnet/'

# (id, repli, legende)
IDS = [
    ('force', A + 'ornements/kabuto.webp', 'Force'),
    ('endurance', A + 'ornements/vague.webp', 'Endurance'),
    ('combat', A + 'ornements/combat.webp', 'Combat'),
    ('records', A + 'ornements/fuji.webp', 'Records'),
    ('techniques', A + 'ornements/carnet.webp', 'Techniques'),
    ('videos', A + 'ornements/lanterne.webp', 'Videos'),
    ('sparring', A + 'ornements/katanas.webp', 'Sparring'),
    ('musculation', CARNET + 'force.webp', 'Musculation'),
    ('course', CARNET + 'endurance.webp', 'Course'),
    ('jjb', CARNET + 'combat.webp', 'Jiu-jitsu bresilien'),
    ('boxe', A + 'ornements/combat.webp', 'Boxe'),
    ('carnet_vide', A + 'ornements/carnet.webp', 'Carnet vide'),
    ('partage_nuit', A + 'monde/fonds/verticale_chateau.webp', 'Fond de partage Nuit'),
    ('partage_aube', A + 'monde/fonds/verticale_aube.webp', 'Fond de partage Aube'),
    ('partage_dojo', A + 'themes/theme_dojo_soir.webp', 'Fond de partage Dojo'),
    ('partage_sakura', A + 'monde/fonds/verticale_sakura.webp', 'Fond de partage Sakura'),
]

rows = []
for k, fb, _ in IDS:
    own = CARNET + k + '.webp'
    if os.path.isfile(own):
        rows.append((k, own, True))
    elif os.path.isfile(fb):
        rows.append((k, fb, False))
    else:
        sys.exit('Repli introuvable pour ' + k + ' : ' + fb + ' (rien n a ete ecrit)')

repli = [k for k, _, ok in rows if not ok]
dediees = [k for k, _, ok in rows if ok]

L = []
L.append('/**')
L.append(' * Illustrations du carnet : un seul endroit pour tous les require().')
L.append(' * FICHIER GENERE par genCarnetImages.py (meme dossier) : ne le modifie pas a la main.')
L.append(' * Quand une nouvelle image arrive dans assets/avatars/app/carnet/<id>.webp, relance :')
L.append(' *   python3 components/yoroi/v2/carnet/genCarnetImages.py')
L.append(' *')
L.append(' * Ids avec leur illustration dediee : ' + (', '.join(dediees) if dediees else 'aucun'))
L.append(' * Ids encore en repli (' + str(len(repli)) + ') : ' + (', '.join(repli) if repli else 'aucun'))
L.append(' */')
L.append("import type { ImageSourcePropType } from 'react-native';")
L.append('')
L.append('export type CarnetImageId =')
for i, (k, _, _) in enumerate(rows):
    L.append("  | '" + k + "'" + (';' if i == len(rows) - 1 else ''))
L.append('')
L.append('const TABLE: Record<CarnetImageId, ImageSourcePropType> = {')
for k, p, ok in rows:
    L.append('  ' + k + ": require('@/" + p + "'),")
L.append('};')
L.append('')
L.append('/** vrai quand l illustration dediee est presente, faux quand c est un repli */')
L.append('export const CARNET_IMAGE_DEDIEE: Record<CarnetImageId, boolean> = {')
for k, _, ok in rows:
    L.append('  ' + k + ': ' + ('true' if ok else 'false') + ',')
L.append('};')
L.append('')
L.append('/** L illustration du carnet pour cet id (dediee si elle existe, sinon le repli) */')
L.append('export function carnetImage(id: CarnetImageId): ImageSourcePropType {')
L.append('  return TABLE[id];')
L.append('}')
L.append('')
L.append('/** Les illustrations de contenu (hors fonds de partage) */')
L.append("export type CarnetIllus = Exclude<CarnetImageId, `partage_${string}`>;")
L.append('')
L.append('/** Fonds illustres de la carte de partage d un record */')
L.append("export type PartageFond = 'nuit' | 'aube' | 'dojo' | 'sakura';")
L.append('')
L.append('export const PARTAGE_FONDS: Record<PartageFond, ImageSourcePropType> = {')
for f in ['nuit', 'aube', 'dojo', 'sakura']:
    L.append('  ' + f + ": TABLE.partage_" + f + ',')
L.append('};')
L.append('')
L.append('export const PARTAGE_FONDS_LISTE: { key: PartageFond; label: string; dark: boolean }[] = [')
L.append("  { key: 'nuit', label: 'Nuit', dark: true },")
L.append("  { key: 'aube', label: 'Aube', dark: true },")
L.append("  { key: 'dojo', label: 'Dojo', dark: true },")
L.append("  { key: 'sakura', label: 'Sakura', dark: false },")
L.append('];')

with open(os.path.join(HERE, 'images.ts'), 'w') as fh:
    fh.write('\n'.join(L) + '\n')
print('Illustrations dediees :', ', '.join(dediees) or 'aucune')
print('Encore en repli :', ', '.join(repli) or 'aucun')
