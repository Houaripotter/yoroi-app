# Langues de YOROI

Langues : français (source), puis celles du registre de lib/i18n/tr.ts (anglais, allemand, néerlandais, espagnol, portugais du Brésil, italien).

## Comment ça marche

1. Le texte reste écrit en français dans le code, passé à traduire("...") ou traduirePluriel(...).
2. lib/i18n/tr.ts choisit la langue du téléphone au démarrage (réglage iOS ou Android de l'app).
3. lib/i18n/dict/<langue>.json : clé = phrase française (espaces réduits), valeur = traduction.
4. Phrase absente du dictionnaire : le français s'affiche (rien ne casse), mais le test languesCompletes devient rouge.
5. En français, traduire() rend le texte d'origine à l'identique. Les tests tournent en français.
6. Pour lancer en français seul : FRANCAIS_FORCE = true dans lib/i18n/tr.ts.

## Au quotidien : « mets les langues à jour »

1. python3 scripts/i18n/langues.py etat : ce qui manque, langue par langue (phrases, montre, widgets, Android, réglages).
2. python3 scripts/i18n/langues.py extraire toutes a-traduire : un fichier par langue, avec seulement ce qui manque.
3. Traduire depuis le français (consignes-traducteurs.md, glossaire-decisions.md) : remplir le champ "trad" de chaque entrée.
4. python3 scripts/i18n/langues.py integrer <langue> a-traduire/<langue>-a-traduire.json : range tout au bon endroit,
   refuse une traduction qui perd un {0} ou contient un tiret long.
5. npx jest __tests__/unit/languesCompletes.test.ts doit être vert.

## Ajouter une langue

1. Une ligne dans le registre REGISTRE de lib/i18n/tr.ts (nom, drapeau, locale, code système, séparateurs, lettres des jours).
2. python3 scripts/i18n/langues.py ajouter <code> : dictionnaire, montre, widgets, Siri, Android, app.json, Info.plist, Xcode.
3. npx tsc --noEmit : signale les rares tables qui doivent connaître la langue (dates date-fns de lib/i18n/dateLocale.ts).
4. Puis « Au quotidien », étapes 2 à 5 (la politique de confidentialité fait partie de l'extraction).
5. Avant de faire la promotion dans un pays : relecture par une personne dont c'est la langue maternelle.

## Outils

0. langues.py : état, extraction, intégration, ajout d'une langue (voir plus haut).

1. scan.js : texte français en dur, par analyse TypeScript.
2. catalog.js : catalogue des phrases entières (JSX regroupé, variables {0}, pluriels séparés).
3. reach.js : fichiers encore utilisés par l'app.
4. brancher.js : branchement automatique (simulation par défaut, --ecrire pour appliquer).
   N'y touche pas : valeurs comparées par le code, identifiants, recherches, statistiques, types littéraux.
5. nombres.js : locales des dates, locale fr-FR en dur, virgule décimale.
6. contexte.py : branche l'ancien moteur lib/I18nContext.tsx sur traduire().
7. reste-francais.json : textes affichés encore en français après branchement (à reprendre à la main).
