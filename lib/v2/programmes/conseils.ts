/**
 * Fiches conseils (24 octobre 2026) : des points courts, chacun appuye sur une source de ./sources.ts.
 * Quand aucune etude ne donne de chiffre, la fiche le dit au lieu d'inventer.
 */
export type Guide = {
  id: string;
  titre: string;
  accroche: string;
  /** deux a quatre phrases a retenir, affichees en haut */
  essentiel: string[];
  sections: { titre: string; points: string[] }[];
  /** programmes lies (ids du catalogue) */
  programmes: string[];
  /** ids de ./sources.ts */
  sources: string[];
};

export const GUIDES: Guide[] = [
  {
    id: 'perdre-gras',
    titre: 'Perdre du gras et du ventre',
    accroche: 'Ce qui marche vraiment, et ce qui ne marche pas',
    essentiel: [
      'On ne choisit pas où on perd le gras : les abdos ne font pas fondre le ventre.',
      'Le gras part avec un déficit calorique. La musculation garde ton muscle pendant ce temps.',
      'Vise 0,5 à 1 % de ton poids par semaine : plus vite, tu perds du muscle.',
    ],
    sections: [
      {
        titre: 'Le ventre',
        points: [
          'Six semaines d’abdos seuls n’ont pas fait baisser la graisse du ventre ni le tour de taille.',
          'Travailler une zone ne fait pas fondre la graisse de cette zone : le corps puise partout à la fois.',
          'Pareil ailleurs : un bras entraîné seul pendant 12 semaines n’a pas perdu plus de gras que l’autre. Une petite étude récente trouve un léger effet des abdos, à confirmer.',
          'Ce qui fait baisser la graisse profonde du ventre : le cardio, même sans régime, et même quand la balance bouge peu.',
          'Mesure ton tour de taille chaque semaine : c’est là que le résultat se voit en premier.',
          'Le ventre part en dernier chez beaucoup de gens. C’est normal, continue.',
        ],
      },
      {
        titre: 'La bonne vitesse',
        points: [
          'Environ 0,5 à 1 % de ton poids par semaine : à 80 kg, entre 400 et 800 g.',
          'Chez des athlètes, perdre 0,7 % par semaine a fait gagner du muscle ; perdre 1,4 % par semaine, non.',
          'Plus tu es déjà sec, plus la perte doit être lente.',
          'Ta courbe de poids lissée dans YOROI montre la vraie tendance, sans les variations d’eau d’un jour à l’autre.',
        ],
      },
      {
        titre: 'L’entraînement',
        points: [
          'Garde la musculation et des charges lourdes : elle protège ton muscle pendant le déficit.',
          'Fractionné ou cardio tranquille : autant de gras perdu. Le fractionné prend environ 40 % de temps en moins.',
          'L’OMS conseille 150 à 300 minutes d’activité modérée par semaine, ou 75 à 150 minutes d’activité intense.',
          'Pour perdre nettement et ne pas reprendre, plus de 250 minutes par semaine. Le sport seul fait perdre environ 2 kg : avec l’alimentation, 5 à 6 kg de plus.',
          'Bouger dans la journée compte aussi : marcher, prendre les escaliers. Aucune étude ne fixe un nombre de pas idéal pour perdre du gras.',
        ],
      },
      {
        titre: 'L’assiette et le sommeil',
        points: [
          'Au moins 1,6 g de protéines par kilo et par jour, réparties en repas de 20 à 40 g.',
          'En déficit avec entraînement, 2,4 g par kilo ont gardé plus de muscle et fait perdre plus de gras que 1,2 g.',
          'En régime, dormir 5 h 30 au lieu de 8 h 30 a fait perdre deux fois moins de gras et plus de muscle.',
          'Si tu as des antécédents de troubles alimentaires ou un problème de santé, demande l’aide d’un professionnel.',
        ],
      },
    ],
    programmes: ['perte-poids-4j', 'seche-4j', 'fessiers-ventre-4j', 'maison-3j'],
    sources: ['vispute2011', 'ramirez2013', 'kostek2007', 'brobakken2023', 'vissers2013', 'ismail2012', 'verheggen2016', 'ross2020', 'johns2014', 'swift2014', 'donnelly2009', 'helms2014', 'garthe2011', 'aragon2017', 'wewege2017', 'keating2017', 'oms2020', 'morton2018', 'jager2017', 'longland2016', 'nedeltcheva2010'],
  },
  {
    id: 'grip',
    titre: 'Un grip de fer pour le judo et le JJB',
    accroche: 'Tenir le kimono plus fort et plus longtemps',
    essentiel: [
      'La force et l’endurance du grip font partie du profil des judokas de haut niveau.',
      'Travaille les deux : la force maximale et l’endurance.',
      'Protège tes doigts : c’est la zone la plus blessée en JJB.',
    ],
    sections: [
      {
        titre: 'Ce que disent les études',
        points: [
          'Les tractions au judogi distinguent les judokas de l’équipe nationale des autres : c’est l’endurance dynamique du grip qui fait la différence.',
          'Il existe des tables de référence pour les tractions et la suspension au judogi : tu peux te tester et suivre tes progrès.',
          'Chez des grimpeurs, huit semaines de suspensions ont augmenté l’endurance du grip : +45 % en suspensions répétées, +34 % en suspensions lestées, mais seulement +7 % en mélangeant les deux méthodes.',
          'Aucune étude ne donne de dosage précis pour le grip en judo ou en JJB : les séries du programme sont des repères prudents.',
        ],
      },
      {
        titre: 'Les exercices',
        points: [
          'Suspension à la barre, bras tendus : avec un kimono ou une serviette, c’est la prise du combat.',
          'Tractions prise kimono : deux serviettes ou ton kimono passés sur la barre.',
          'Marche du fermier : haltères lourds, épaules basses, tu marches.',
          'Manchons de grip en tissu de kimono : attachés sur une haltère ou un kettlebell, ils transforment la marche du fermier, le rowing, les swings ou les curls en travail de prise kimono. C’est une astuce de terrain, aucune étude ne les a encore comparés.',
          'Pince de serrage : ferme complètement, tiens une seconde, relâche lentement.',
          'Extensions de poignets : les muscles qui ouvrent la main équilibrent ceux qui serrent.',
        ],
      },
      {
        titre: 'Les précautions',
        points: [
          'Arrête dès qu’une douleur apparaît dans un doigt ou au poignet.',
          'Pas de séance de grip la veille d’une compétition ou d’un gros entraînement au kimono.',
          'Commence léger : les tendons des doigts s’adaptent moins vite que les muscles.',
        ],
      },
    ],
    programmes: ['grip-2j', 'combat-force-2j'],
    sources: ['franchini2011judo', 'branco2017', 'lopezrivera2019', 'mcdonald2017'],
  },
  {
    id: 'sac',
    titre: 'Bien utiliser un sac de frappe',
    accroche: 'Rounds, cardio, puissance et protection des mains',
    essentiel: [
      'La boxe est surtout aérobie, avec des pics explosifs : il faut du fond et de la puissance.',
      'En boxe amateur, les rounds durent 3 minutes avec 1 minute de repos.',
      'La main est la zone la plus blessée chez les boxeurs : bandes et gants à chaque séance.',
    ],
    sections: [
      {
        titre: 'Ce que demande un round',
        points: [
          'Environ 77 % de l’énergie d’un combat de boxe vient du système aérobie, le reste des efforts explosifs.',
          'Le cœur et la consommation d’oxygène montent d’un round à l’autre : le dernier round est le plus dur.',
          'Sur une simulation de 3 rounds de 3 minutes, le cœur dépasse 165 battements par minute en moyenne.',
        ],
      },
      {
        titre: 'Construire ses séances',
        points: [
          'Débutant : rounds de 2 minutes, la technique avant la vitesse.',
          'Ensuite : rounds de 3 minutes, 1 minute de repos, comme en compétition amateur.',
          'Fractions de 30 secondes à fond, trois fois par semaine pendant quatre semaines : chez 16 boxeurs, de 238 à 289 coups en combat simulé.',
          'Le chrono de YOROI affiche la consigne de chaque round pendant que tu frappes.',
        ],
      },
      {
        titre: 'Protéger tes mains',
        points: [
          'Chez les boxeurs de l’équipe de Grande Bretagne, la main est la zone la plus souvent blessée.',
          'Bande tes mains et mets des gants à chaque séance. Aucune étude ne compare avec et sans bandes, mais le risque est connu.',
          'Frappe avec les deux premières jointures, poignet aligné.',
          'Douleur à la main qui ne passe pas en quelques jours : montre ta main à un médecin.',
        ],
      },
    ],
    programmes: ['sac-debutant-3j', 'sac-cardio-3j', 'sac-mma-3j', 'sac-hiit-4sem'],
    sources: ['davis2014', 'slimani2017', 'thomson2017', 'ruddock2016', 'herrera2021', 'loosemore2015'],
  },
  {
    id: 'force',
    titre: 'Devenir plus fort',
    accroche: 'Charges lourdes, assez de séries, du repos',
    essentiel: [
      'Pour la force, les charges lourdes gagnent : plus de 60 % de ton maximum, idéalement autour de 80 %.',
      'Le volume total compte plus que le nombre de séances.',
      'Prends 3 minutes de repos sur les gros mouvements.',
    ],
    sections: [
      {
        titre: 'Charges et séries',
        points: [
          'Le gain de force est plus grand avec des charges lourdes qu’avec des charges légères, même si le muscle grossit autant.',
          '2 à 3 séries lourdes par exercice, autour de 80 % de ton maximum : c’est la recommandation de l’ACSM.',
          '5 séries ou plus par exercice et par semaine font un peu mieux que moins de 5.',
          'Pas besoin d’aller à l’échec : pour la force, c’est surtout la charge qui compte.',
        ],
      },
      {
        titre: 'Fréquence et repos',
        points: [
          'Plus de séances par semaine donnent plus de force, mais à volume égal la fréquence ne change rien.',
          'Choisis le nombre de séances qui te permet de faire tes séries, sans fatigue qui traîne.',
          '3 minutes de repos sur les gros mouvements : plus de force et de muscle qu’une minute.',
          'Augmente la charge de 2 à 10 % quand tu dépasses ta cible deux séances de suite. YOROI le fait pour toi.',
        ],
      },
    ],
    programmes: ['force-3j', 'combat-force-2j', 'haut-bas-4j'],
    sources: ['schoenfeld2017charges', 'lopez2021', 'acsm2026', 'ralston2017', 'grgic2018', 'robinson2024', 'schoenfeld2016repos', 'acsm2009'],
  },
  {
    id: 'muscle',
    titre: 'Prendre du muscle',
    accroche: 'Les règles simples qui comptent vraiment',
    essentiel: [
      'Au moins 10 séries par muscle et par semaine.',
      'Arrête tes séries 1 à 3 répétitions avant l’échec : autant de muscle, moins de fatigue.',
      'Une fois ou deux fois par semaine par muscle : à volume égal, c’est pareil.',
    ],
    sections: [
      {
        titre: 'Le volume',
        points: [
          'Plus de séries par semaine, plus de muscle : 10 séries ou plus tendent à faire mieux que moins de 5.',
          'Chez les pratiquants entraînés, 12 à 20 séries par muscle et par semaine.',
          'Les gains ralentissent quand le volume monte : inutile d’empiler les séries à l’infini.',
        ],
      },
      {
        titre: 'Les charges et les répétitions',
        points: [
          'Charges légères ou lourdes : autant de muscle si tu finis près de l’échec.',
          '6 à 12 répétitions sur les gros mouvements, 10 à 15 en isolation : pratique et efficace.',
          'Plus de 90 secondes de repos : après, peu de différence pour le muscle.',
        ],
      },
      {
        titre: 'L’assiette',
        points: [
          'Les gains de muscle plafonnent vers 1,6 g de protéines par kilo et par jour.',
          '20 à 40 g de protéines par repas, toutes les 3 à 4 heures.',
        ],
      },
    ],
    programmes: ['split-5j', 'haut-bas-4j', 'ppl-3j', 'ppl-6j', 'bas-du-corps-4j'],
    sources: ['schoenfeld2017volume', 'bazvalle2022', 'pelland2026', 'refalo2023', 'schoenfeld2019frequence', 'schoenfeld2017charges', 'singer2024', 'morton2018', 'jager2017'],
  },
  {
    id: 'recuperer',
    titre: 'Récupérer pour progresser',
    accroche: 'Sommeil, semaine légère, et savoir lever le pied',
    essentiel: [
      'Une semaine plus légère toutes les 4 à 8 semaines : moitié moins de séries, même charge.',
      'Le sommeil compte, surtout en sèche.',
      'Fatigue qui s’accumule, performances qui baissent : fais ta semaine légère plus tôt.',
    ],
    sections: [
      {
        titre: 'La semaine légère',
        points: [
          'Les experts s’accordent : baisse les séries ou les répétitions, garde à peu près la charge.',
          'Généralement toutes les 4 à 8 semaines, ou quand la fatigue s’installe.',
          'YOROI te la propose dans ton programme et ajuste tes séances tout seul.',
        ],
      },
      {
        titre: 'Le sommeil',
        points: [
          'En régime, dormir 5 h 30 au lieu de 8 h 30 a fait perdre moins de gras et plus de muscle.',
          'Note ton sommeil dans YOROI pour voir le lien avec tes séances.',
        ],
      },
    ],
    programmes: [],
    sources: ['bell2023', 'bell2025', 'nedeltcheva2010'],
  },
  {
    id: 'stagner',
    titre: 'Je m’entraîne depuis des années et je stagne',
    accroche: 'Ce que les études sur les pratiquants entraînés disent de faire',
    essentiel: [
      'Ce qui fait progresser un pratiquant entraîné : assez de séries, des séries proches de l’échec, et une progression notée séance après séance.',
      'Plus n’est pas toujours mieux : au delà de 12 à 20 séries par muscle et par semaine, ajouter des séries n’a pas fait mieux.',
      'Le piège le plus courant : refaire les mêmes charges pendant des mois sans le savoir. Note tout, YOROI te dit quand monter.',
    ],
    sections: [
      {
        titre: 'Le volume',
        points: [
          'Chez des hommes entraînés depuis 4 ans, faire plus de séries a donné plus de muscle sur les bras et les cuisses, et la même force.',
          'Chez les pratiquants entraînés, la zone conseillée est de 12 à 20 séries par muscle et par semaine.',
          'Chez des pratiquants de 3 ans et plus, ajouter 30 à 60 % de séries n’a pas fait mieux que garder son volume. Si tu fais déjà 20 séries, la solution n’est pas d’en faire 30.',
        ],
      },
      {
        titre: 'L’intensité',
        points: [
          'Le muscle grossit plus quand la série s’arrête près de l’échec. Aller jusqu’à l’échec n’apporte presque rien de plus.',
          'Repère simple : arrête la série quand il te reste 1 ou 2 répétitions. Si tu pourrais en faire 5 de plus, la série compte peu.',
        ],
      },
      {
        titre: 'La progression',
        points: [
          'Monter la charge ou faire plus de répétitions donne autant de muscle : ce qui compte, c’est de progresser l’un ou l’autre.',
          'Faire varier les charges au fil des semaines aide la force, pas le muscle.',
          'Varier un peu les exercices, de façon prévue, peut aider. En changer à chaque séance freine les progrès : garde un cycle de 8 semaines.',
        ],
      },
      {
        titre: 'Les pectoraux',
        points: [
          'Chez des débutants, le développé incliné a fait plus grossir le haut des pectoraux que le développé à plat. Chez les entraînés, aucune étude ne l’a encore vérifié.',
          'L’amplitude complète fait un peu mieux que les demi mouvements. Descends la barre jusqu’à la poitrine.',
          'Pour le triceps, travailler bras au dessus de la tête a fait environ 1,4 fois plus de muscle : un muscle étiré semble mieux grossir. Pour les pectoraux, ce n’est pas encore prouvé.',
        ],
      },
    ],
    programmes: ['pecs-priorite-4j', 'haut-bas-4j', 'split-5j'],
    sources: ['schoenfeld2019volume', 'bazvalle2022', 'barsuhn2024', 'pelland2026', 'robinson2024', 'refalo2023', 'plotkin2022', 'moesgaard2022', 'kassiano2022', 'chaves2020', 'wolf2023', 'maeo2022'],
  },
  {
    id: 'prendre-du-poids',
    titre: 'Prendre du poids, en muscle',
    accroche: 'Pour ceux qui mangent « beaucoup » et ne grossissent pas',
    essentiel: [
      'Sans manger plus que tu ne dépenses, tu ne prendras pas de poids, même en t’entraînant fort.',
      'Un surplus modéré suffit : environ 10 à 20 % de plus que ton entretien, souvent 350 à 500 kcal par jour.',
      'Prends 0,25 à 0,5 % de ton poids par semaine. Plus vite, c’est surtout du gras.',
    ],
    sections: [
      {
        titre: 'Combien manger',
        points: [
          'Commence par environ 350 à 500 kcal de plus par jour. Si tu as vraiment du mal à prendre, monte jusqu’à 950.',
          'Chez des athlètes, manger 600 kcal de plus par jour a fait prendre surtout du gras (+15 %), pas plus de muscle.',
          'Au moins 1,6 g de protéines par kilo et par jour, sur 3 à 6 repas.',
        ],
      },
      {
        titre: 'Suivre la bonne vitesse',
        points: [
          'Débutant : vise le haut de la fourchette, environ 0,5 % par semaine (350 g à 70 kg). Avancé : le bas, environ 0,25 %.',
          'Le poids monte le week end et redescend en semaine : regarde la moyenne de la semaine dans YOROI, pas une pesée seule.',
          'Si la moyenne ne bouge pas en deux semaines, ajoute environ 200 kcal par jour.',
        ],
      },
      {
        titre: 'L’entraînement',
        points: [
          'Chaque gros muscle deux fois par semaine, au moins 10 séries : c’est ce qui transforme le surplus en muscle.',
          'Note tes charges : si elles montent, le poids que tu prends est en bonne partie du muscle.',
        ],
      },
    ],
    programmes: ['prise-de-masse-4j', 'haut-bas-4j', 'debutant-fullbody-3j'],
    sources: ['iraki2019', 'slater2019', 'garthe2013', 'morton2018', 'orsama2014', 'schoenfeld2016frequence', 'schoenfeld2017volume'],
  },
  {
    id: 'fessiers',
    titre: 'Faire grossir les fessiers',
    accroche: 'Hip thrust, squat, profondeur : ce que les études ont mesuré',
    essentiel: [
      'Hip thrust et squat profond font grossir les fessiers autant l’un que l’autre. Le squat fait en plus grossir les cuisses.',
      'Descends bas : en squat complet, les fessiers ont grossi trois fois plus qu’en demi squat.',
      'Les femmes gagnent autant de muscle que les hommes en pourcentage : mêmes règles, mêmes progrès.',
    ],
    sections: [
      {
        titre: 'Les exercices',
        points: [
          '34 débutants, dont 23 femmes, mesurés à l’IRM : 9 semaines de hip thrust ou de squat ont donné les mêmes fessiers. Le squat a aussi fait grossir les cuisses.',
          'Chez 33 femmes débutantes, ajouter le hip thrust au programme a fait passer le gain des fessiers de 6 % à 9 % en 10 semaines.',
          'Tu veux surtout les fessiers et pas les cuisses : le hip thrust en exercice principal. Tu veux les deux : squat profond et hip thrust.',
          'Abduction, kickback, fentes : aucune étude ne les a encore testés seuls pour les fessiers. Ils complètent, ils ne remplacent pas.',
        ],
      },
      {
        titre: 'Ne te fie pas aux « exercices qui brûlent »',
        points: [
          'Un exercice qui fait beaucoup travailler le muscle sur le moment ne le fait pas forcément plus grossir. Seules les études sur plusieurs semaines le disent.',
          'La sensation de brûlure n’est pas un signe de croissance. La progression de tes charges, si.',
        ],
      },
    ],
    programmes: ['bas-du-corps-4j', 'fessiers-ventre-4j'],
    sources: ['plotkin2023', 'kubo2019', 'kassiano2024', 'krauseneto2025', 'vigotsky2022', 'roberts2020', 'refalo2025'],
  },
  {
    id: 'courir',
    titre: 'Commencer à courir sans se blesser',
    accroche: 'Le bon rythme, d’après les études sur les débutants',
    essentiel: [
      'Alterne course et marche au début : c’est comme ça que les plans des études font courir 30 minutes en 8 semaines.',
      'Les débutants se blessent deux fois plus que les coureurs habitués : la progression doit être douce, pas forcément lente.',
      'Cours surtout en facile, à une allure où tu peux parler.',
    ],
    sections: [
      {
        titre: 'La progression',
        points: [
          'Une hausse de plus de 20 à 30 % du volume en deux ou trois semaines est liée à plus de blessures.',
          'La règle des 10 % par semaine n’a pas protégé davantage qu’un plan un peu plus rapide.',
          'Une douleur qui dure plus de deux jours : refais la semaine précédente, et demande l’avis d’un professionnel si elle continue.',
        ],
      },
      {
        titre: 'Aller plus vite',
        points: [
          'Les meilleurs coureurs font environ 80 % de leur entraînement en facile et 20 % en dur.',
          'Le 4 fois 4 minutes dur, avec 3 minutes de trot, a fait progresser la VO2max de 7 % en 8 semaines.',
          'Le fractionné fait un peu mieux que l’endurance seule pour la VO2max, mais les deux marchent.',
        ],
      },
    ],
    programmes: ['course-5km-8sem', 'course-10km-8sem'],
    sources: ['buist2007', 'buist2008', 'nielsen2014', 'damsted2019', 'videbaek2015', 'seiler2010', 'munoz2014', 'helgerud2007', 'milanovic2015'],
  },
  {
    id: 'voir-resultats',
    titre: 'Voir tes résultats',
    accroche: 'Les bons chiffres à regarder, et quand',
    essentiel: [
      'Une pesée seule ne veut rien dire : compare les moyennes de la semaine.',
      'Le tour de taille montre la graisse du ventre qui part, même quand la balance ne bouge pas.',
      'Tes charges qui montent sont la preuve que tu prends du muscle.',
    ],
    sections: [
      {
        titre: 'Le poids',
        points: [
          'Le poids monte le week end et redescend en semaine. Pèse toi le matin, plusieurs fois par semaine, et regarde la moyenne dans YOROI.',
          'Juge sur 2 à 4 semaines, jamais sur 3 jours.',
        ],
      },
      {
        titre: 'Le tour de taille',
        points: [
          'C’est un repère de santé reconnu : le sport le fait baisser même quand le poids bouge peu.',
          'Même sans perdre de poids, l’entraînement a réduit la graisse profonde du ventre d’environ 6 %.',
          'Mesure une fois par semaine, le matin, au même endroit, ruban à plat sans serrer.',
        ],
      },
      {
        titre: 'Les charges',
        points: [
          'Dans chaque programme, « Tes progrès » montre la charge de chaque exercice depuis le début.',
          'Si une charge ne bouge pas en 3 à 4 semaines, c’est le signal : regarde la fiche « Je stagne ».',
        ],
      },
    ],
    programmes: [],
    sources: ['orsama2014', 'ross2020', 'verheggen2016', 'plotkin2022'],
  },
  {
    id: 'marche-inclinee',
    titre: 'Marche inclinée et zone 2',
    accroche: 'Le cardio qui dépense sans te vider',
    essentiel: [
      'Zone 2 : un effort où tu peux encore parler en phrases complètes, environ 60 à 70 % de ta fréquence cardiaque max.',
      'Sur tapis : 30 à 45 minutes, pente de 8 à 12 %, entre 4,5 et 5,5 km/h, sans tenir les barres.',
      'Elle ajoute de la dépense, mais c’est le déficit calorique qui fait perdre le gras.',
    ],
    sections: [
      {
        titre: 'La zone 2',
        points: [
          'Le test de la parole : tant que tu parles à l’aise, tu es à peu près sous le premier seuil ventilatoire, là où l’effort reste modéré.',
          'L’ACSM classe 64 à 76 % de la fréquence cardiaque max comme une intensité modérée. Pas de montre ? Le test de la parole suffit.',
          'La zone 2 n’a pas de définition unique : les chiffres changent un peu selon les montres et les auteurs.',
        ],
      },
      {
        titre: 'La pente et les barres',
        points: [
          'Monter la pente fait monter la dépense sans courir : marcher à 10 % a coûté nettement plus qu’à 5 %.',
          'Lâche les barres : en t’y accrochant penché en arrière, la dépense a baissé d’environ un tiers. Tenues bien droit, la baisse n’était pas nette.',
          'Si tu ne peux plus parler, baisse la pente avant de baisser la durée.',
        ],
      },
      {
        titre: 'Pourquoi elle aide à perdre du gras',
        points: [
          'Elle ajoute des calories dépensées avec peu de fatigue : tu récupères vite et tu peux en faire plusieurs fois par semaine.',
          'Ajoutée à la musculation, la course a freiné le muscle et la force, le vélo non, et d’autant plus que le cardio était long et fréquent. La marche n’a pas été testée à part : garde des séances modérées.',
          'Le sport seul fait perdre environ 2 kg. Avec l’alimentation, bien plus : c’est le déficit qui fait le travail.',
          'Plus de 150 minutes d’activité par semaine aident à perdre, plus de 250 aident à ne pas reprendre.',
        ],
      },
    ],
    programmes: ['seche-4j', 'perte-poids-4j', 'fessiers-ventre-4j'],
    sources: ['persinger2004', 'garber2011', 'hofmann2014', 'wilson2012', 'swift2014', 'johns2014', 'donnelly2009'],
  },
  {
    id: 'force-delai',
    titre: 'En combien de temps tu prends de la force ?',
    accroche: 'Des chiffres réalistes, semaine après semaine',
    essentiel: [
      'Les premières semaines, tu deviens plus fort surtout parce que ton système nerveux apprend à mieux commander tes muscles.',
      'Débutant : des gains nets dès 4 à 5 semaines, puis le muscle grossit et prend le relais.',
      'Après 1 à 2 ans, les progrès ralentissent beaucoup : c’est normal, pas un échec.',
    ],
    sections: [
      {
        titre: 'Les premières semaines',
        points: [
          'En 4 semaines d’entraînement, la force a monté d’environ 14 %, surtout parce que les commandes nerveuses vers le muscle sont devenues plus rapides.',
          'En 35 jours d’exercices lourds pour les cuisses, 3 fois par semaine, la force a monté d’environ 39 %. Le muscle avait déjà un peu grossi au bout de 20 jours.',
        ],
      },
      {
        titre: 'Les mois et les années',
        points: [
          'Avec une seule séance courte par semaine, près de 15 000 adultes ont gagné environ 30 à 50 % de force la première année.',
          'Ensuite la courbe s’aplatit vers 1 à 2 ans : environ 50 à 60 % gagnés au bout de 6 ans.',
          'Plus de séries et de séances donnent plus de force, avec des gains qui ralentissent quand le volume monte.',
        ],
      },
      {
        titre: 'Pour toi',
        points: [
          'Sur un cycle de 8 à 12 semaines, tes gros mouvements doivent monter. Regarde « Tes progrès » dans ton programme.',
          'Si tu t’entraînes depuis des années, quelques pour cent par an, c’est déjà un bon résultat.',
        ],
      },
    ],
    programmes: ['debutant-fullbody-3j', 'force-3j', 'haut-bas-4j'],
    sources: ['delvecchio2019', 'seynnes2007', 'steele2022', 'pelland2026'],
  },
];

export function guideParId(id: string | null | undefined): Guide | undefined {
  if (!id) return undefined;
  return GUIDES.find((g) => g.id === id);
}
