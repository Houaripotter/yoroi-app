import json,re,sys
def flat(d,p=''):
    o={}
    for k,v in d.items():
        kk=p+'.'+k if p else k
        if isinstance(v,dict): o.update(flat(v,kk))
        else: o[kk]=v
    return o
L={l:flat(json.load(open(f'lib/i18n/{l}.json'))) for l in ['fr','en','ja']}
fr=L['fr']
print('cles fr',len(fr),'en',len(L['en']),'ja',len(L['ja']))
print('top sections',len(json.load(open('lib/i18n/fr.json'))))
for l in ['en','ja']:
    D=L[l]
    miss=[k for k in fr if k not in D]
    extra=[k for k in D if k not in fr]
    same=[k for k in fr if k in D and D[k]==fr[k] and isinstance(fr[k],str) and re.search(r'[a-zA-Zéèàç]{4,}',fr[k])]
    nonstr=[k for k in D if not isinstance(D[k],str)]
    print(l,'manquantes',len(miss),'en_trop',len(extra),'identiques_fr',len(same),'non_texte',len(nonstr))
    print('  ex identiques:',[(k,fr[k]) for k in same[:15]])
    if l=='ja':
        same_en=[k for k in fr if k in D and k in L['en'] and D[k]==L['en'][k] and re.search(r'[a-zA-Z]{4,}',str(D[k]))]
        print('  ja == en:',len(same_en),[(k,D[k]) for k in same_en[:15]])
        latin=[k for k in D if isinstance(D[k],str) and not re.search(r'[぀-ヿ一-鿿]',D[k]) and re.search(r'[a-zA-Z]{3,}',D[k])]
        print('  ja sans aucun caractère japonais:',len(latin))
# variables
def vars_(s): return sorted(re.findall(r'\{\{\s*\w+\s*\}\}|\{\d+\}',str(s)))
for l in ['en','ja']:
    bad=[k for k in fr if k in L[l] and vars_(fr[k])!=vars_(L[l][k])]
    print(l,'variables differentes',len(bad),bad[:10])
# french residue in en
frw=re.compile(r"\b(le|la|les|des|une|est|pour|avec|vos|votre|tes|ton|séance|jour|jours|semaine|poids|entraînement|restantes?)\b",re.I)
res=[(k,L['en'][k]) for k in L['en'] if isinstance(L['en'][k],str) and frw.search(L['en'][k]) and L['en'][k]!=fr.get(k)]
print('en avec mots francais',len(res),res[:10])
dash=sum(1 for l in L for k,v in L[l].items() if isinstance(v,str) and ('—' in v or '–' in v))
print('valeurs avec tiret long/moyen',dash)
