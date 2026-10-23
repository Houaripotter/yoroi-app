# YOROI : consignes pour les traducteurs

YOROI est une app iPhone et Android de suivi du poids, du sport et des sports de combat (JJB, MMA, boxe, lutte, grappling, musculation), dans un univers guerrier japonais. Public : pratiquants de sports de combat et de musculation, du débutant au compétiteur. Ton de coach : motivant, direct, chaleureux.

Tu traduis TOUJOURS depuis le français (champ "fr"). Le français est la seule source de vérité.

## Format

1. Entrée : un fichier JSON, liste d'objets { id, fr, ctx, zone, plural, ref }.
2. Sortie : un fichier JSON, un seul objet { "id": "traduction", ... } avec TOUS les id du lot, dans le même ordre. Rien d'autre dans le fichier. JSON valide (guillemets échappés).
3. ctx dit où vit le texte : label, title, sub (sous titre), accessibilityLabel (lu par VoiceOver), appAlert et showPopup (alertes), placeholder, aliases (mots de recherche), nom, description, phrase, body (notification), etc. Sers t'en pour la longueur et le ton.
4. ref dit dans quel fichier le texte vit. Il aide à comprendre le contexte.
5. plural = "one" ou "other" : la même phrase existe au singulier (one, 1 élément) et au pluriel (other, plusieurs). Traduis chaque forme bien accordée.

## Règles absolues

1. Variables {0}, {1}, {2} : toutes gardées, exactement les mêmes, jamais traduites. Tu peux les déplacer si la grammaire l'exige.
2. Aucun tiret long ni tiret moyen (caractères U+2014 et U+2013) nulle part. Utilise virgule, deux points, point ou parenthèses. Le trait d'union normal dans un mot composé reste permis.
3. Les nombres restent les mêmes chiffres. Séparateur décimal : point en anglais (82.5), virgule en allemand et en néerlandais (82,5).
4. Les unités ne changent jamais : kg, lb, cm, in, kcal, bpm, km, m, min, h, s, g, ml, L, %.
5. Un texte en MAJUSCULES reste en MAJUSCULES.
6. Les espaces, la ponctuation et les symboles de début ou de fin (", ", " · ", " : ", "…") sont gardés : le texte est souvent collé à un autre morceau.
7. Si le français est un morceau de phrase (commence par une virgule, une minuscule, ou finit par une préposition), traduis le morceau pour qu'il se recolle naturellement.
8. Longueur proche du français. Boutons, onglets, labels : très courts. Titres : courts.
9. Pas d'emoji ajoutés. Pas de commentaire, pas de note, pas d'alternative entre parenthèses.
10. Ne corrige pas le français. S'il manque un accent ou s'il y a une faute, traduis le sens.
11. Si le texte n'a pas besoin de traduction (nom propre, marque, mot international), recopie le tel quel.
12. Les sauts de ligne (\n) sont gardés au même endroit.

## Registre

1. Le français tutoie.
2. Anglais : "you", naturel, orthographe américaine (color, favorite, center), simple et punchy. Pas de ton corporate. Majuscules de titre seulement en début de phrase (Sentence case), comme le français.
3. Allemand : "du", "dein" (en minuscule), jamais "Sie". Naturel, phrases courtes, pas de mot à mot. Majuscules des noms selon la grammaire allemande.
4. Néerlandais : "je", "jouw", "jij", jamais "u". Néerlandais standard, lisible en Flandre comme aux Pays Bas : évite les mots trop propres à un seul pays. Phrases courtes.

## Terminologie imposée

### Termes japonais : toujours tels quels
YOROI, Kabuto, dojo, sensei, kanji, Ashigaru, Bushi, Rōnin, Shōgun, Daimyō, Onna-bugeisha, Sōhei, Ninja, Kunoichi, Oni, Kitsune, Tengu, Yuki-onna, kyūdō, kenjutsu, torii, sakura, matcha, et tout autre mot japonais. Garde les macrons (ō, ū).
Exception : Samouraï devient Samurai dans les trois langues.

### Rangs de l'univers Classique
| Français | Anglais | Allemand | Néerlandais |
|---|---|---|---|
| Débutant | Beginner | Anfänger | Beginner |
| Régulier | Regular | Regelmäßig | Regelmatig |
| Confirmé | Skilled | Fortgeschritten | Gevorderd |
| Expert | Expert | Experte | Expert |
| Champion | Champion | Champion | Kampioen |

### Niveaux de pratique par sport
| Français | Anglais | Allemand | Néerlandais |
|---|---|---|---|
| Novice | Novice | Neuling | Nieuwkomer |
| Initié | Initiate | Eingeweiht | Ingewijde |
| Motivé | Driven | Motiviert | Gemotiveerd |
| Solide | Solid | Solide | Solide |
| Assidu | Committed | Beständig | Toegewijd |
| Aguerri | Hardened | Gestählt | Gehard |
| Chevronné | Seasoned | Erfahren | Doorgewinterd |
| Redoutable | Formidable | Gefürchtet | Gevreesd |
| Vétéran | Veteran | Veteran | Veteraan |
| Maître | Master | Meister | Meester |

### Univers
Japon : Japan, Japan, Japan. Classique : Classic, Klassisch, Klassiek. Sans personnage : No character, Ohne Figur, Zonder personage.

### Sports de combat : vocabulaire international inchangé
BJJ, MMA, sparring, grappling, rolling, drill, round, takedown, guard pass, submission, armbar, triangle, kimura, heel hook, leg lock, HYROX, CrossFit, EMOM, AMRAP, Tabata, HIIT.
JJB devient BJJ. Boxe anglaise : Boxing, Boxen, Boksen. Lutte : Wrestling, Ringen, Worstelen. Muay thaï : Muay Thai.

### Ceintures (grades réels de JJB ou judo)
Anglais : white, blue, purple, brown, black belt.
Allemand : Weißgurt, Blaugurt, Lilagurt, Braungurt, Schwarzgurt.
Néerlandais : witte band, blauwe band, paarse band, bruine band, zwarte band.

### Mots de l'app
| Français | Anglais | Allemand | Néerlandais |
|---|---|---|---|
| séance | session | Einheit (ou Training) | sessie (ou training) |
| entraînement | workout ou training | Training | training |
| pesée | weigh-in | Wiegen | weging |
| série (d'affilée) | streak | Serie | reeks |
| série (musculation) | set | Satz | set |
| répétitions | reps | Wiederholungen | herhalingen |
| charge | weight ou load | Gewicht | gewicht |
| record | PR (record personnel) | Bestleistung | record |
| synchro | sync | Sync | synchronisatie |
| sauvegarde | backup | Backup | back-up |
| copie automatique | auto backup | automatisches Backup | automatische back-up |
| Santé (app Apple) | Apple Health | Apple Health | Apple Health |
| Health Connect | Health Connect | Health Connect | Health Connect |
| Premium | Premium | Premium | Premium |
| XP | XP | XP | XP |
| armure | armor | Rüstung | harnas |
| tenue | outfit | Outfit | outfit |
| pièce (d'armure) | piece | Teil | onderdeel |
| balance (connectée) | scale | Waage | weegschaal |
| masse grasse | body fat | Körperfett | vetpercentage |
| composition corporelle | body composition | Körperzusammensetzung | lichaamssamenstelling |
| mensurations | measurements | Körpermaße | lichaamsmaten |
| jeûne | fasting | Fasten | vasten |
| récupération | recovery | Erholung | herstel |
| carnet | log | Logbuch | logboek |
| compétition | competition | Wettkampf | wedstrijd |
| partenaire d'entraînement | training partner | Trainingspartner | trainingspartner |
| montre | watch | Uhr | horloge |

### Noms propres
Noms de personnages, d'athlètes, de clubs, de lieux, de fédérations (IBJJF, CFJJB, UFC, FFJDA) : inchangés. Les noms de lieux et décors des scènes (« Pont des cerisiers ») se traduisent.

## Données et citations

1. Citations et phrases de motivation : traduis le sens avec force, pas mot à mot. Une citation connue (Bruce Lee, Musashi, Sun Tzu...) prend sa forme connue dans la langue.
2. Noms d'exercices : le nom usuel des salles de sport dans la langue (Développé couché : Bench press, Bankdrücken, Bankdrukken). En néerlandais et en allemand, l'anglais est souvent le terme réel des salles (Deadlift, Squat) : utilise celui que les pratiquants disent vraiment.
3. ctx = aliases (mots de recherche séparés par des virgules ou des espaces) : donne les mots que quelqu'un taperait dans cette langue pour trouver l'exercice, même format.
4. Textes de santé et de nutrition : précis et prudents, pas de promesse médicale ajoutée.
5. Textes légaux (politique de confidentialité, conditions) : traduction fidèle et complète, ton neutre.

## Variables au format {{nom}}

Certains textes (ctx = ancien_dico) ont des variables {{nom}} ou {{count}}. Garde les exactement, jamais traduites, comme {0}.
