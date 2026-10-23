# Fichiers Localizable.strings pour la montre, les widgets et l'app iOS.
# SwiftUI traduit tout seul Text("..."), Label("..."), LocalizedStringResource "..." si la clé existe.
import json,os,re
H=os.path.expanduser('~')
tr=json.load(open('scripts/i18n/swift-trad.json'))
par=json.load(open(H+'/work/swift.json'))   # cible -> {texte: fichier}
CIBLES={'YoroiWatch':('4FE4F2E74120D82686D88DAD','49FB9344FA3521CF45B66E14','ios/YoroiWatch',''),
        'YoroiWatchWidgets':('8A692B9C6ED6284A4395960B','7743DD768CEDD80538DB0CB0','ios/YoroiWatchWidgets',''),
        'YoroiWidgets':('E80764186CA08167F81B13B0','158782848A5A5636F2980FA5','ios/YoroiWidgets',''),
        'Yoroi':(None,'13B07F8E1A680F5B00A75B9A','ios/Yoroi','Yoroi/')}
L=['fr','en','de','nl']
def esc(s): return s.replace('\\','\\\\').replace('"','\\"')
P='ios/Yoroi.xcodeproj/project.pbxproj';s=open(P).read()
n=0
for i,(cible,(grp,res,dossier,pref)) in enumerate(CIBLES.items()):
    cles=[t for t in par.get(cible,{}) if t in tr]
    if not cles: continue
    for li,l in enumerate(L):
        os.makedirs(f'{dossier}/{l}.lproj',exist_ok=True)
        with open(f'{dossier}/{l}.lproj/Localizable.strings','w',encoding='utf-8') as f:
            f.write(f'/* YOROI {cible} : textes en {l}. Clé = texte français du code Swift. */\n')
            for k in sorted(cles): f.write(f'"{esc(k)}" = "{esc(k if l=="fr" else tr[k][li-1])}";\n')
    vg=f'1A18N1{i:02d}00000000000000000'[:24];bf=f'1A18N1{i:02d}10000000000000000'[:24]
    refs={l:f'1A18N1{i:02d}2{li}000000000000000'[:24] for li,l in enumerate(L)}
    assert not any(x in s for x in [vg,bf,*refs.values()])
    def rep(a,b,count=1):
        global s
        assert s.count(a)>=1,a; s=s.replace(a,b,count)
    rep("/* End PBXBuildFile section */",f"\t\t{bf} /* Localizable.strings in Resources */ = {{isa = PBXBuildFile; fileRef = {vg} /* Localizable.strings */; }};\n/* End PBXBuildFile section */")
    rep("/* End PBXFileReference section */",''.join(f"\t\t{refs[l]} /* {l} */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.strings; name = {l}; path = {pref}{l}.lproj/Localizable.strings; sourceTree = \"<group>\"; }};\n" for l in L)+"/* End PBXFileReference section */")
    rep("/* End PBXVariantGroup section */",f"\t\t{vg} /* Localizable.strings */ = {{\n\t\t\tisa = PBXVariantGroup;\n\t\t\tchildren = (\n"+''.join(f"\t\t\t\t{refs[l]} /* {l} */,\n" for l in L)+"\t\t\t);\n\t\t\tname = Localizable.strings;\n\t\t\tsourceTree = \"<group>\";\n\t\t};\n/* End PBXVariantGroup section */")
    # ressources de la cible
    m=re.search(res+r' /\* Resources \*/ = \{\s*isa = PBXResourcesBuildPhase;\s*buildActionMask = \d+;\s*files = \(\n',s)
    assert m,cible; s=s[:m.end()]+f"\t\t\t\t{bf} /* Localizable.strings in Resources */,\n"+s[m.end():]
    # groupe de la cible
    if grp:
        m=re.search(grp+r' /\* [^*]+ \*/ = \{\s*isa = PBXGroup;\s*children = \(\n',s)
    else:
        m=re.search(r'13B07FAE1A68108700A75B9A /\* Yoroi \*/ = \{\s*isa = PBXGroup;\s*children = \(\n',s)
    assert m,('groupe',cible); s=s[:m.end()]+f"\t\t\t\t{vg} /* Localizable.strings */,\n"+s[m.end():]
    n+=1;print(cible,len(cles),'textes')
open(P,'w').write(s);print('cibles',n,'accolades',s.count('{')==s.count('}'))
