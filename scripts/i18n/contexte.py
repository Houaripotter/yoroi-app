# Branche l'ancien moteur (lib/I18nContext.tsx) sur traduire() et sur la locale de la langue.
import sys
p='lib/I18nContext.tsx';s=open(p).read()
if 'traduire' in s: sys.exit('deja fait')
def rep(a,b):
    global s
    assert s.count(a)==1,a; s=s.replace(a,b)
rep("""// 18 octobre 2026 : lancement en français seul. Les anciens en.json et ja.json ne sont plus chargés.
// Les nouvelles langues seront rebranchées ici.
""","""import { traduire, LOCALE } from './i18n/tr';
// 23 octobre 2026 : les anciens en.json et ja.json ne sont plus chargés.
// Les textes viennent de fr.json puis passent par traduire(), dans la langue du téléphone.
""")
rep("""  if (options) {
    return value.replace(""","""  value = traduire(value);

  if (options) {
    return value.replace(""")
s=s.replace("LOCALE_MAP[language] ?? 'fr-FR'","LOCALE")
open(p,'w').write(s)
print('ok')
