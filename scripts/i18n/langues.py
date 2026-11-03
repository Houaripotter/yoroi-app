#!/usr/bin/env python3
"""
YOROI : la commande des langues. À lancer depuis la racine du projet.

  python3 scripts/i18n/langues.py etat
      Ce qui manque dans chaque langue : phrases du code sans traduction, textes de la montre,
      des widgets, d'Android, réglages iOS et Android, politique de confidentialité.

  python3 scripts/i18n/langues.py extraire <code|toutes> [dossier]
      Écrit dossier/<code>-a-traduire.json : seulement ce qui manque (rien de ce qui est déjà traduit).
      Chaque entrée : la phrase française, et l'anglais quand il existe, pour aider le traducteur.

  python3 scripts/i18n/langues.py integrer <code> fichier.json
      Range les traductions rendues (même format que l'extraction, champ "trad" rempli).
      Refuse une traduction qui perd un {0}, contient un tiret long ou moyen, ou est vide.

  python3 scripts/i18n/langues.py ajouter <code>
      Nouvelle langue, après avoir ajouté sa ligne dans le registre de lib/i18n/tr.ts :
      crée le dictionnaire, les fichiers de la montre, des widgets, de Siri et d'Android,
      et l'inscrit dans app.json, Info.plist, Android et le projet Xcode.
      Les textes natifs démarrent en français, « extraire » les liste ensuite à traduire.

Le français est la seule source. Ce script ne modifie jamais un texte français.
"""
import json, os, re, sys, random

R = '.'
DICT = 'lib/i18n/dict'
CIBLES_IOS = ['ios/Yoroi', 'ios/YoroiWatch', 'ios/YoroiWatchWidgets', 'ios/YoroiWidgets']
POLITIQUE = 'data/politiqueConfidentialite.json'
# textes natifs volontairement identiques au français (« FC », « Alarme » en portugais), relus à la main
IDENTIQUES = 'scripts/i18n/identiques.json'
PBX = 'ios/Yoroi.xcodeproj/project.pbxproj'
STUDIO = ('app/creator-mode', 'app/studio/', 'components/yoroi/v2/studio/', 'app/marketing-kit')
DOSSIERS_CODE = ['app', 'components', 'lib', 'hooks', 'context', 'constants', 'data', 'utils']


# ─── Registre (lib/i18n/tr.ts) ───────────────────────────────────────────────

def registre():
    s = open('lib/i18n/tr.ts', encoding='utf-8').read()
    a = s.index('const REGISTRE = {')
    b = s.index('} as const;', a)
    out = {}
    for m in re.finditer(r"^\s+([a-z]{2,3}): \{ nom: '([^']+)'.*?locale: '([^']+)', systeme: '([^']+)'", s[a:b], re.M):
        out[m.group(1)] = {'nom': m.group(2), 'locale': m.group(3), 'systeme': m.group(4)}
    return out


def langues_trad():
    return [l for l in registre() if l != 'fr']


# ─── Fichiers ────────────────────────────────────────────────────────────────

def lire_dict(l):
    p = f'{DICT}/{l}.json'
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}


def ecrire_dict(l, d):
    with open(f'{DICT}/{l}.json', 'w', encoding='utf-8') as f:
        f.write(json.dumps(d, ensure_ascii=False, indent=0))


STR = re.compile(r'^"((?:[^"\\]|\\.)*)"\s*=\s*"((?:[^"\\]|\\.)*)";\s*$')


def lire_strings(p):
    out = {}
    if not os.path.exists(p):
        return out
    for ligne in open(p, encoding='utf-8'):
        m = STR.match(ligne.strip())
        if m:
            out[m.group(1)] = m.group(2)
    return out


def esc(s):
    return s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')


def unesc(s):
    return re.sub(r'\\(.)', lambda m: {'n': '\n'}.get(m.group(1), m.group(1)), s)


def ecrire_strings(p, entete, d):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(entete + '\n')
        for k in sorted(d):
            f.write(f'"{k}" = "{d[k]}";\n')


XML = re.compile(r'<string name="([^"]+)">(.*?)</string>', re.S)


def lire_android(p):
    return dict(XML.findall(open(p, encoding='utf-8').read())) if os.path.exists(p) else {}


def dossier_android(systeme):
    return f'android/app/src/main/res/values-{systeme.split("-")[0]}'


def ecrire_android(p, d):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write('<resources>\n  <!-- Widgets -->\n')
        for k, v in d.items():
            f.write(f'  <string name="{k}">{v}</string>\n')
        f.write('</resources>\n')


# ─── Phrases du code (traduire, traduireSens, traduirePluriel) ───────────────

LIT = r"""('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\$]|\\.)*`)"""
PATS = [re.compile(r"\btraduire\(\s*" + LIT),
        re.compile(r"\btraduireSens\(\s*" + LIT + r"\s*,\s*" + LIT),
        re.compile(r"\btraduirePluriel\(\s*[^,]+,\s*[^,]+,\s*" + LIT + r"\s*,\s*" + LIT)]


def lit(s):
    s = s[1:-1]
    s = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), s)
    s = re.sub(r"\\(.)", lambda m: {'n': '\n', 't': '\t'}.get(m.group(1), m.group(1)), s)
    return re.sub(r'\s+', ' ', s).strip()


def phrases_du_code(reference):
    """Clés littérales du code, avec un endroit où elles sont utilisées."""
    out = {}
    for d in DOSSIERS_CODE:
        for r, _, fs in os.walk(d):
            for f in fs:
                if not f.endswith(('.ts', '.tsx')):
                    continue
                p = os.path.join(r, f)
                if p.startswith(STUDIO) or '__tests__' in p:
                    continue
                src = open(p, encoding='utf-8').read()
                for i, pat in enumerate(PATS):
                    for m in pat.finditer(src):
                        if i == 1:
                            k = lit(m.group(2)) + '§' + lit(m.group(1))
                            keys = [k if k in reference else k.split('§')[0]]
                        elif i == 2:
                            keys = [lit(m.group(1)), lit(m.group(2))]
                        else:
                            keys = [lit(m.group(1))]
                        for k in keys:
                            if k and k not in out:
                                out[k] = f'{p}:{src[:m.start()].count(chr(10)) + 1}'
    return out


# ─── Ce qui manque ───────────────────────────────────────────────────────────

def a_traduire(l, avec_code=True):
    """Liste des entrées à traduire pour la langue l : [{type, ...}]."""
    reg = registre()
    en = lire_dict('en')
    d = lire_dict(l)
    # toutes les phrases connues : celles des dictionnaires existants, plus celles du code
    toutes = {}
    for x in langues_trad():
        for k in lire_dict(x):
            toutes.setdefault(k, None)
    if avec_code:
        for k, ou in phrases_du_code(en).items():
            toutes[k] = ou
    out = []
    for k, ou in toutes.items():
        if k not in d:
            e = {'type': 'phrase', 'fr': k}
            if k in en and l != 'en':
                e['en'] = en[k]
            if ou:
                e['ou'] = ou
            out.append(e)
    # textes natifs iOS : clé et français pris dans fr.lproj
    sysl = reg[l]['systeme']
    ident = set(json.load(open(IDENTIQUES, encoding='utf-8')).get(l, [])) if os.path.exists(IDENTIQUES) else set()
    for c in CIBLES_IOS:
        frl = f'{c}/fr.lproj'
        if not os.path.isdir(frl):
            continue
        for f in sorted(os.listdir(frl)):
            if not f.endswith('.strings'):
                continue
            fr = lire_strings(f'{frl}/{f}')
            enS = lire_strings(f'{c}/en.lproj/{f}')
            mien = lire_strings(f'{c}/{sysl}.lproj/{f}')
            for k, v in fr.items():
                voulu = f'{c}/{sysl}.lproj/{f}|{unesc(k)}' in ident
                if k not in mien or (mien[k] == v and enS.get(k, v) != v and not voulu):
                    e = {'type': 'ios', 'fichier': f'{c}/{sysl}.lproj/{f}', 'cle': unesc(k), 'fr': unesc(v)}
                    if k in enS:
                        e['en'] = unesc(enS[k])
                    out.append(e)
    # Android : pas de français de base, l'anglais sert de référence
    ref = lire_android('android/app/src/main/res/values-en/strings.xml')
    mien = lire_android(dossier_android(sysl) + '/strings.xml')
    for k, v in ref.items():
        if l != 'en' and (k not in mien or mien[k] == v):
            out.append({'type': 'android', 'cle': k, 'en': v.replace("\\'", "'")})
    # politique de confidentialité
    pol = json.load(open(POLITIQUE, encoding='utf-8'))
    if l not in pol or l not in pol['miseAJour']:
        out.append({'type': 'politique', 'fr': {'miseAJour': pol['miseAJour']['fr'], 'sections': pol['fr']}})
    return out


def etat():
    tot = 0
    for l in langues_trad():
        x = a_traduire(l)
        n = {}
        for e in x:
            n[e['type']] = n.get(e['type'], 0) + 1
        tot += len(x)
        print(f"{l} : {len(lire_dict(l))} phrases traduites, à traduire : " +
              (', '.join(f'{v} {k}' for k, v in n.items()) if n else 'rien'))
    manque = verifier_branchement()
    for m in manque:
        print('  réglage manquant :', m)
    print('TOTAL à traduire :', tot, '| réglages manquants :', len(manque))
    return tot + len(manque)


# ─── Inscription d'une langue dans les réglages iOS, Android, Expo ──────────

def verifier_branchement():
    out = []
    reg = registre()
    app = json.load(open('app.json', encoding='utf-8'))
    ios_loc = app['expo']['ios']['infoPlist'].get('CFBundleLocalizations', [])
    plug = next(p for p in app['expo']['plugins'] if isinstance(p, list) and p[0] == 'expo-localization')[1]['supportedLocales']
    info = open('ios/Yoroi/Info.plist', encoding='utf-8').read()
    loc_android = open('android/app/src/main/res/xml/locales_config.xml', encoding='utf-8').read()
    pbx = open(PBX, encoding='utf-8').read()
    kr = re.search(r'knownRegions = \((.*?)\);', pbx, re.S).group(1)
    pol = json.load(open(POLITIQUE, encoding='utf-8'))
    for l, v in reg.items():
        s = v['systeme']
        if s not in ios_loc: out.append(f'{l} : app.json CFBundleLocalizations')
        if s not in plug['ios']: out.append(f'{l} : app.json expo-localization ios')
        if s not in plug['android']: out.append(f'{l} : app.json expo-localization android')
        if f'<string>{s}</string>' not in info: out.append(f'{l} : ios/Yoroi/Info.plist')
        if f'android:name="{s}"' not in loc_android: out.append(f'{l} : android locales_config.xml')
        if not re.search(rf'(^|\s|"){re.escape(s)}("|,)', kr): out.append(f'{l} : Xcode knownRegions')
        if l not in pol: out.append(f'{l} : politique de confidentialité')
        if l == 'fr':
            continue
        if not os.path.exists(f'{DICT}/{l}.json'): out.append(f'{l} : {DICT}/{l}.json')
        for c in CIBLES_IOS:
            for f in os.listdir(f'{c}/fr.lproj'):
                if f.endswith('.strings') and not os.path.exists(f'{c}/{s}.lproj/{f}'):
                    out.append(f'{l} : {c}/{s}.lproj/{f}')
                elif f.endswith('.strings') and not re.search(rf'path = "?(Yoroi/)?{re.escape(s)}\.lproj/{re.escape(f)}"?;', pbx):
                    out.append(f'{l} : Xcode, {c}/{s}.lproj/{f}')
        if l != 'en' and not os.path.exists(dossier_android(s) + '/strings.xml'):
            out.append(f'{l} : {dossier_android(s)}/strings.xml')
    return out


def nouvel_id(pbx):
    while True:
        i = ''.join(random.choice('0123456789ABCDEF') for _ in range(24))
        if i not in pbx:
            return i


def ajouter(l):
    reg = registre()
    if l not in reg:
        sys.exit(f"Ajoute d'abord la ligne « {l}: {{ ... }} » dans le registre de lib/i18n/tr.ts.")
    s = reg[l]['systeme']
    q = f'"{s}"' if '-' in s else s
    # dictionnaire vide (les phrases arrivent par extraire puis integrer)
    if not os.path.exists(f'{DICT}/{l}.json'):
        ecrire_dict(l, {})
    # fichiers natifs : copie du français, en attente de traduction
    for c in CIBLES_IOS:
        os.makedirs(f'{c}/{s}.lproj', exist_ok=True)
        for f in os.listdir(f'{c}/fr.lproj'):
            if not f.endswith('.strings') or os.path.exists(f'{c}/{s}.lproj/{f}'):
                continue
            entete = open(f'{c}/fr.lproj/{f}', encoding='utf-8').readline().rstrip('\n').replace(' en fr.', f' en {s}.').replace(' fr ', f' {s} ')
            ecrire_strings(f'{c}/{s}.lproj/{f}', entete, lire_strings(f'{c}/fr.lproj/{f}'))
    pa = dossier_android(s) + '/strings.xml'
    if not os.path.exists(pa):
        ecrire_android(pa, lire_android('android/app/src/main/res/values-en/strings.xml'))
    # app.json
    t = open('app.json', encoding='utf-8').read()
    app = json.loads(t)
    ip = app['expo']['ios']['infoPlist'].setdefault('CFBundleLocalizations', [])
    if s not in ip: ip.append(s)
    plug = next(p for p in app['expo']['plugins'] if isinstance(p, list) and p[0] == 'expo-localization')[1]['supportedLocales']
    for k in ('ios', 'android'):
        if s not in plug[k]: plug[k].append(s)
    open('app.json', 'w', encoding='utf-8').write(json.dumps(app, indent=2, ensure_ascii=False) + '\n')
    # Info.plist
    p = 'ios/Yoroi/Info.plist'
    t = open(p, encoding='utf-8').read()
    if f'<string>{s}</string>' not in t:
        a = t.index('<key>CFBundleLocalizations</key>')
        b = t.index('</array>', a)
        t = t[:b] + f'\t<string>{s}</string>\n\t' + t[b:].lstrip('\t')
        open(p, 'w', encoding='utf-8').write(t)
    # Android
    p = 'android/app/src/main/res/xml/locales_config.xml'
    t = open(p, encoding='utf-8').read()
    if f'android:name="{s}"' not in t:
        t = t.replace('</locale-config>', f'  <locale android:name="{s}"/>\n</locale-config>')
        open(p, 'w', encoding='utf-8').write(t)
    # Xcode : knownRegions, et une référence par fichier .strings, à côté de celle de l'anglais
    pbx = open(PBX, encoding='utf-8').read()
    m = re.search(r'knownRegions = \((.*?)\);', pbx, re.S)
    if not re.search(rf'(^|\s|"){re.escape(s)}("|,)', m.group(1)):
        pbx = pbx[:m.end(1)] + f'\t\t\t\t{q},\n\t\t\t' + pbx[m.end(1):].lstrip('\t') if False else \
            pbx[:m.start(1)] + m.group(1).rstrip() + f'\n\t\t\t\t{q},\n\t\t\t' + pbx[m.end(1):]
    lignes = re.findall(r'^\t\t([0-9A-Z]{24}) /\* en \*/ = \{isa = PBXFileReference; [^\n]*name = en; path = ([^;]*?)en\.lproj/([^;]+?); [^\n]*\n', pbx, re.M)
    for (ide, pref, f) in lignes:
        if re.search(rf'path = "?{re.escape(pref + s)}\.lproj/{re.escape(f)}"?;', pbx):
            continue
        ligne = re.search(rf'^\t\t{ide} /\* en \*/ = [^\n]*\n', pbx, re.M).group(0)
        nid = nouvel_id(pbx)
        nl = ligne.replace(ide, nid).replace('/* en */', f'/* {s} */').replace('name = en;', f'name = {q};').replace('en.lproj/', f'{s}.lproj/')
        if '-' in s:
            nl = re.sub(r'path = ([^;"]+);', r'path = "\1";', nl)
        pbx = pbx.replace(ligne, ligne + nl, 1)
        enfant = f'\t\t\t\t{ide} /* en */,\n'
        assert pbx.count(enfant) == 1, f'groupe de {ide} introuvable'
        pbx = pbx.replace(enfant, enfant + f'\t\t\t\t{nid} /* {s} */,\n')
    open(PBX, 'w', encoding='utf-8').write(pbx)
    print(f'{l} ajoutée. Suite : python3 scripts/i18n/langues.py extraire {l}')


# ─── Extraction et intégration ───────────────────────────────────────────────

def extraire(cible, dossier):
    os.makedirs(dossier, exist_ok=True)
    for l in (langues_trad() if cible == 'toutes' else [cible]):
        x = a_traduire(l)
        p = f'{dossier}/{l}-a-traduire.json'
        json.dump({'langue': l, 'nom': registre()[l]['nom'], 'entrees': x}, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(p, len(x), 'entrées')


VARS = re.compile(r'\{\d+\}|\{\{\s*\w+\s*\}\}|\$\{\w+\}|%(?:\d+\$)?[@dsf]')


def controle(fr, t):
    if not isinstance(t, str) or not t.strip():
        return 'vide'
    if sorted(VARS.findall(fr)) != sorted(VARS.findall(t)):
        return 'variables'
    if re.search('[\u2013\u2014]', t):
        return 'tiret'
    return None


def integrer(l, fichier):
    reg = registre()
    s = reg[l]['systeme']
    data = json.load(open(fichier, encoding='utf-8'))
    entrees = data['entrees'] if isinstance(data, dict) else data
    d = lire_dict(l)
    refus = []
    natifs = {}
    andro = lire_android(dossier_android(s) + '/strings.xml')
    pol = None
    identiques = []
    n = 0
    for e in entrees:
        t = e.get('trad')
        if t is None:
            continue
        if e['type'] == 'politique':
            pol = t
            continue
        src = e.get('fr', e.get('en', ''))
        pb = controle(src, t)
        if pb:
            refus.append((pb, src[:80]))
            continue
        if e['type'] == 'phrase':
            d[e['fr']] = t
        elif e['type'] == 'ios':
            natifs.setdefault(e['fichier'], {})[esc(e['cle'])] = esc(t)
            if t == e['fr']:
                identiques.append(e['fichier'] + '|' + e['cle'])
        elif e['type'] == 'android':
            andro[e['cle']] = t.replace("'", "\\'").replace('&', '&amp;').replace('<', '&lt;')
        n += 1
    ecrire_dict(l, d)
    for p, kv in natifs.items():
        actuel = lire_strings(p)
        actuel.update(kv)
        entete = open(p, encoding='utf-8').readline().rstrip('\n') if os.path.exists(p) else f'/* YOROI : textes en {s}. */'
        ecrire_strings(p, entete, actuel)
    if identiques:
        I = json.load(open(IDENTIQUES, encoding='utf-8')) if os.path.exists(IDENTIQUES) else {}
        I[l] = sorted(set(I.get(l, [])) | set(identiques))
        open(IDENTIQUES, 'w', encoding='utf-8').write(json.dumps(I, ensure_ascii=False, indent=1) + '\n')
    if l != 'en' and andro:
        ecrire_android(dossier_android(s) + '/strings.xml', andro)
    if pol:
        P = json.load(open(POLITIQUE, encoding='utf-8'))
        P['miseAJour'][l] = pol['miseAJour']
        P[l] = pol['sections']
        with open(POLITIQUE, 'w', encoding='utf-8') as f:
            f.write(json.dumps(P, ensure_ascii=False, indent=2))
        n += 1
    print(f'{l} : {n} rangées, {len(refus)} refusées')
    for r in refus[:50]:
        print('  refus', r)
    return len(refus)


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] not in ('etat', 'extraire', 'integrer', 'ajouter'):
        print(__doc__)
        sys.exit(1)
    if a[0] == 'etat':
        sys.exit(1 if etat() else 0)
    if a[0] == 'extraire':
        extraire(a[1], a[2] if len(a) > 2 else 'a-traduire')
    if a[0] == 'integrer':
        sys.exit(1 if integrer(a[1], a[2]) else 0)
    if a[0] == 'ajouter':
        ajouter(a[1])
