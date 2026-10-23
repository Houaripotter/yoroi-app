import json,re,os,glob
def flat(d,p=''):
    o={}
    for k,v in d.items():
        kk=p+'.'+k if p else k
        if isinstance(v,dict): o.update(flat(v,kk))
        else: o[kk]=v
    return o
fr=flat(json.load(open('lib/i18n/fr.json')))
files=[]
for root in ['app','components','lib','constants','context','hooks','src']:
    for dp,dn,fn in os.walk(root):
        dn[:]=[d for d in dn if d not in ('node_modules','i18n','__tests__')]
        for f in fn:
            if re.search(r'\.(tsx?|jsx?)$',f) and not re.search(r'\.test\.|\.spec\.| \d\.',f): files.append(os.path.join(dp,f))
print('fichiers source',len(files))
used=set();dyn=[];useI=0;nouse=[]
for f in files:
    try: s=open(f,encoding='utf-8',errors='ignore').read()
    except OSError: nouse.append(f); continue
    if 'useI18n' in s or re.search(r'\bt\(',s): useI+=1
    for m in re.finditer(r"\bt\(\s*(['\"`])([^'\"`]+?)\1",s):
        k=m.group(2)
        if '${' in k: dyn.append((f,k))
        else: used.add(k)
print('fichiers qui traduisent',useI)
print('cles utilisees',len(used),'dynamiques',len(dyn))
missing=sorted(k for k in used if k not in fr and not any(x.startswith(k+'.') for x in fr))
print('cles appelees absentes du dico',len(missing)); print(missing[:60])
unused=[k for k in fr if k not in used]
print('cles du dico jamais appelees en litteral',len(unused))
for f,k in dyn[:25]: print('  dyn',f,k)
# duplicates iCloud " 2.tsx"
dup=[os.path.join(dp,f) for r in ['app','components','lib','constants','hooks'] for dp,dn,fn in os.walk(r) for f in fn if re.search(r' \d\.(tsx?|json)$',f)]
print('doublons iCloud',len(dup),dup[:10])
print('ILLISIBLES (iCloud)',len(nouse),nouse)
