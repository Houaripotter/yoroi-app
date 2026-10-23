import json,re,sys,glob,os
# usage: python3 verif.py <langue> [lot...]
lang=sys.argv[1]
lots=sys.argv[2:] or sorted(os.path.basename(p)[:-5] for p in glob.glob('lots/lot-*.json'))
VAR=re.compile(r'\{\{\s*\w+\s*\}\}|\{\d+\}')
NUM=re.compile(r'\d+(?:[.,]\d+)?')
FR=re.compile(r"\b(le|la|les|des|une|est|pour|avec|tes|ton|votre|vos|séance|séances|jours|semaine|aujourd'hui|entraînement|poids|pesée|données|réglages|encore|déjà|très|aussi|mais|donc|chaque|depuis)\b",re.I)
ACC=re.compile(r'[éèêàçùûœ]')
tot=dict(lots=0,ok=0,manque=0,vars=0,nums=0,tiret=0,fr=0,vide=0,identique=0,absent=0)
probs=[]
def nums(s):
    s=VAR.sub('',s)
    s=re.sub(r'(?<=\d)[\s\u00a0\u202f.,](?=\d{3}\b)','',s)  # separateurs de milliers
    return sorted(x.replace(',','.') for x in NUM.findall(s))
for lot in lots:
    src=json.load(open(f'lots/{lot}.json'));p=f'out/{lang}/{lot}.json'
    tot['lots']+=1
    if not os.path.exists(p): tot['absent']+=1;probs.append((lot,'FICHIER ABSENT',''));continue
    try: out=json.load(open(p))
    except Exception as e: probs.append((lot,'JSON INVALIDE',str(e)));tot['absent']+=1;continue
    for u in src:
        i=u['id'];fr=u['fr'];t=out.get(i)
        if t is None: tot['manque']+=1;probs.append((lot,'manque',i,fr[:60]));continue
        if not isinstance(t,str) or (not t.strip() and fr.strip()): tot['vide']+=1;probs.append((lot,'vide',i,fr[:60]));continue
        bad=False
        if sorted(VAR.findall(fr))!=sorted(VAR.findall(t)): tot['vars']+=1;bad=True;probs.append((lot,'variables',i,fr[:60],t[:60]))
        if nums(fr)!=nums(t): tot['nums']+=1;bad=True;probs.append((lot,'nombres',i,fr[:60],t[:60]))
        if '—' in t or '–' in t: tot['tiret']+=1;bad=True;probs.append((lot,'tiret',i,t[:60]))
        if t==fr and len(fr)>12 and ACC.search(fr): tot['identique']+=1;bad=True;probs.append((lot,'identique',i,fr[:60]))
        elif lang!='fr' and t!=fr and (ACC.search(t) and lang=='en' or FR.search(t) and lang in('en','de','nl') and len(FR.findall(t))>=2): tot['fr']+=1;bad=True;probs.append((lot,'francais?',i,t[:70]))
        if not bad: tot['ok']+=1
    extra=set(out)-{u['id'] for u in src}
    if extra: probs.append((lot,'id en trop',len(extra)))
print(lang,json.dumps(tot,ensure_ascii=False))
json.dump(probs,open(f'out/{lang}/_problemes.json','w'),ensure_ascii=False,indent=0)
for p in probs[:40]: print(' ',p)
