# Langues de YOROI

Langues : français (source), anglais, allemand, néerlandais.

## Comment ça marche

1. Le texte reste écrit en français dans le code, passé à traduire("...") ou traduirePluriel(...).
2. lib/i18n/tr.ts choisit la langue du téléphone au démarrage (réglage iOS ou Android de l'app).
3. lib/i18n/dict/<langue>.json : clé = phrase française (espaces réduits), valeur = traduction.
4. Phrase absente du dictionnaire : le français s'affiche (rien ne casse).
5. En français, traduire() rend le texte d'origine à l'identique. Les tests tournent en français.
6. Pour lancer en français seul : FRANCAIS_FORCE = true dans lib/i18n/tr.ts.

## Ajouter ou modifier un texte

1. Écrire le texte français normalement, dans traduire("...").
2. Relancer le catalogue : node scripts/i18n/catalog.js . sortie.json
3. Traduire les phrases nouvelles depuis le français (consignes-traducteurs.md, glossaire-decisions.md).
4. Contrôler : python3 scripts/i18n/verif.py <langue> (variables, nombres, tirets, français résiduel).

## Outils

1. scan.js : texte français en dur, par analyse TypeScript.
2. catalog.js : catalogue des phrases entières (JSX regroupé, variables {0}, pluriels séparés).
3. reach.js : fichiers encore utilisés par l'app.
4. brancher.js : branchement automatique (simulation par défaut, --ecrire pour appliquer).
   N'y touche pas : valeurs comparées par le code, identifiants, recherches, statistiques, types littéraux.
5. nombres.js : locales des dates, locale fr-FR en dur, virgule décimale.
6. contexte.py : branche l'ancien moteur lib/I18nContext.tsx sur traduire().
7. reste-francais.json : textes affichés encore en français après branchement (à reprendre à la main).
