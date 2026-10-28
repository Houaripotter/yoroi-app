/**
 * Contenu de l'ecran Savoir : fiches scientifiques et protocoles d'entrainement.
 * Repris tel quel de l'ancien ecran (memes identifiants, pour garder la progression de lecture).
 */
import { traduire } from '@/lib/i18n/tr';
export interface ScienceCard {
  id: string;
  title: string;
  icon: string;
  category: string;
  content: {
    what: string;
    why: string;
    how: string;
    sourceName: string;
    sourceUrl: string;
  };
}

export interface ProtocolCard {
  id: string;
  title: string;
  icon: string;
  category: string;
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé';
  content: {
    objective: string;
    duration: string;
    protocol: string[];
    frequency: string;
    notes: string;
  };
}

export const scienceData: ScienceCard[] = [
  {
    id: '1',
    title: traduire("La Marche Inclinée (LISS)"),
    icon: "slope-uphill",
    category: "Cardio",
    content: {
      what: traduire("Marcher sur un tapis avec une inclinaison (12 à 15%) à vitesse modérée (4 à 5 km/h)."),
      why: traduire("Marcher en pente fait travailler ton cœur à intensité modérée, sans les chocs de la course. Une étude sur 12 adultes en surpoids montre qu'en marchant plus lentement avec de la pente (2,7 km/h sur 6°), l'effort reste modéré et la charge sur le genou baisse de 19 à 26 % par rapport à une marche rapide à plat. L'étude est petite."),
      how: traduire("Protocole '12 3 30' ou variante : 12% de pente, 5 km/h, 30 min. Idéal en fin de séance musculation."),
      sourceName: traduire("Étude : Ehlen et al. (2011), Med Sci Sports Exerc"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/21200344/"
    }
  },
  {
    id: '2',
    title: traduire("Déficit Calorique : La Loi Physique"),
    icon: "scale-balance",
    category: traduire("Nutrition"),
    content: {
      what: traduire("Consommer moins d'énergie que ton corps n'en dépense. C'est la seule condition physiologique obligatoire pour perdre du gras."),
      why: traduire("C'est la Première Loi de la Thermodynamique. Peu importe le régime (Keto, Jeûne, Paleo), s'il n'y a pas de déficit, il n'y a pas de perte de gras. Les travaux de Kevin Hall (NIH) montrent que c'est le bilan énergétique qui pilote le poids, pas l'insuline seule."),
      how: traduire("Calcule ton maintien (TDEE) et retire 300 à 500 kcal. Ne descends jamais sous ton métabolisme de base (BMR)."),
      sourceName: traduire("Revue : Hall & Guo (2017), Gastroenterology"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/28193517/"
    }
  },
  {
    id: '3',
    title: traduire("La Zone 2 : Usine à Mitochondries"),
    icon: "heart-pulse",
    category: "Endurance",
    content: {
      what: traduire("L'intensité où le lactate reste stable (< 2 mmol/L). Tu peux tenir une conversation."),
      why: traduire("San Millán et Brooks ont comparé des cyclistes professionnels, des personnes modérément actives et des personnes avec un syndrome métabolique. Plus le lactate monte à l'effort, moins le corps utilise le gras. Le lactate reflète donc ta 'flexibilité métabolique' : la capacité de tes cellules à utiliser le gras comme carburant. L'étude compare des profils, elle ne teste pas un programme d'entraînement."),
      how: traduire("45 à 60 min en continu, 1 à 2 fois/semaine. Reste strict : si tu es essoufflé, tu n'es plus en zone 2."),
      sourceName: traduire("Étude : San Millán & Brooks (2018), Sports Med"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/28623613/"
    }
  },
  {
    id: '4',
    title: traduire("Protéines & TEF"),
    icon: "food-steak",
    category: traduire("Nutrition"),
    content: {
      what: traduire("Le macronutriment bâtisseur."),
      why: traduire("L'Effet Thermique (TEF) des protéines est de 20 à 30%. Pour 100kcal ingérées, 25 sont brûlées par la digestion (contre 3% pour le gras). De plus, elles sont les plus rassasiantes via la sécrétion de l'hormone PYY."),
      how: traduire("Vise 1,4 à 2 g par kg de poids et par jour. Une source à chaque repas."),
      sourceName: "Consensus : ISSN Position Stand (2017)",
      sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8"
    }
  },
  {
    id: '5',
    title: traduire("Fibres : La Satiété Naturelle"),
    icon: "barley",
    category: traduire("Nutrition"),
    content: {
      what: traduire("Glucides non digestibles présents dans les végétaux."),
      why: traduire("Les fibres solubles gonflent dans l'estomac et déclenchent la libération de GLP 1 (l'hormone de satiété imitée par un médicament contre le diabète utilisé pour maigrir). Elles nourrissent aussi le microbiote qui régule le poids."),
      how: traduire("Mange 30g de fibres par jour (Légumes verts, avoine, graines de chia, pommes). Mange tes légumes en premier dans le repas."),
      sourceName: "Recherche : Slavin (2005), Nutrition",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/15797686/"
    }
  },
  {
    id: '6',
    title: traduire("Sommeil & Risque de Blessure"),
    icon: "bed-clock",
    category: traduire("Récupération"),
    content: {
      what: traduire("Le pilier oublié de la performance."),
      why: traduire("Chez des sportifs adolescents, dormir moins de 8 h était associé à un risque de blessure 1,7 fois plus élevé. Le manque de sommeil élève le cortisol (catabolique) et bloque l'hormone de croissance. C'est pendant la nuit que le gras s'oxyde et le muscle se répare."),
      how: traduire("Chambre fraîche (18°C). Pas d'écrans 1h avant (lumière bleue bloque la mélatonine)."),
      sourceName: traduire("Étude : Milewski et al. (2014), J Pediatr Orthop"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/25028798/"
    }
  },
  {
    id: '7',
    title: traduire("Hydratation & Thermogenèse"),
    icon: "water",
    category: traduire("Métabolisme"),
    content: {
      what: traduire("L'impact de l'eau sur la dépense énergétique."),
      why: traduire("Boire de l'eau augmente un peu ta dépense d'énergie, mais l'effet est faible. Une première étude sur 14 personnes avait trouvé +30 % après 500 ml d'eau. Ce chiffre n'a pas été reproduit : une étude suivante a mesuré environ +4,5 % sur une heure avec de l'eau froide, et aucun effet avec de l'eau à température ambiante. Au delà d'une perte de 2 % de ton poids en eau, tes performances d'endurance baissent, surtout à la chaleur (ACSM, 2007)."),
      how: traduire("Bois 500ml d'eau dès le réveil. Bois 1 verre avant chaque repas."),
      sourceName: traduire("Études : Boschmann et al. (2003) et Brown et al. (2006), J Clin Endocrinol Metab"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/16822824/"
    }
  },
  {
    id: '8',
    title: traduire("NEAT : L'Activité Invisible"),
    icon: "walk",
    category: traduire("Activité"),
    content: {
      what: traduire("Non Exercise Activity Thermogenesis (Activité hors sport)."),
      why: traduire("Le Dr Levine a observé que des personnes sédentaires en légère obésité restaient assises environ 2 h de plus par jour que des personnes minces. Bouger autant qu'elles représenterait environ 350 kcal de plus par jour. L'étude est petite (20 personnes)."),
      how: traduire("Téléphone debout. Stationne loin. Prends les escaliers. Vise 8000 pas hors séance."),
      sourceName: "Recherche : Levine et al. (2005), Science",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/15681386/"
    }
  },
  {
    id: '9',
    title: traduire("Entraînement en Force & Longévité"),
    icon: "dumbbell",
    category: "Force",
    content: {
      what: traduire("La musculation régulière est associée à une vie plus longue."),
      why: traduire("Une méta analyse de 2022 (16 études d'observation) montre que la musculation est associée à un risque de mortalité toutes causes environ 15 % plus bas. Le plus grand bénéfice apparaît vers 30 à 60 min par semaine. Elle préserve la masse musculaire (sarcopénie) et améliore la sensibilité à l'insuline."),
      how: traduire("2 séances minimum par semaine. Travaille tous les groupes musculaires. 3 séries de 8 à 12 répétitions."),
      sourceName: traduire("Méta analyse : Momma et al. (2022), Br J Sports Med"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/35228201/"
    }
  },
  {
    id: '10',
    title: traduire("Créatine : Le Supplément #1"),
    icon: "supplement",
    category: traduire("Supplémentation"),
    content: {
      what: traduire("Composé naturel présent dans la viande, améliore la production d'ATP."),
      why: traduire("C'est le complément le plus étudié et l'un des plus efficaces pour les efforts courts et intenses. Après une phase de charge, la performance sur des efforts intenses et répétés progresse souvent de 10 à 20 %. Avec l'entraînement, elle aide aussi à gagner en force et en muscle. Ses effets sur le cerveau sont encore à l'étude."),
      how: traduire("5g par jour, tous les jours. Monohydrate (la forme la moins chère est la meilleure). Pas besoin de phase de charge : sans elle, tes réserves se remplissent en 3 à 4 semaines."),
      sourceName: "Position Stand : ISSN (2017), J Int Soc Sports Nutr",
      sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0173-z"
    }
  },
  {
    id: '11',
    title: traduire("Repos Inter Séries : La Durée Compte"),
    icon: "clock",
    category: "Force",
    content: {
      what: traduire("Le temps de repos entre les séries influence l'hypertrophie."),
      why: traduire("Dans une étude de Schoenfeld sur 21 hommes entraînés pendant 8 semaines, ceux qui se reposaient 3 minutes ont gagné plus de force que ceux qui se reposaient 1 minute, avec une tendance à plus de muscle. L'étude est petite. Le repos permet la restauration des phosphocréatines et maintient l'intensité."),
      how: traduire("Force (1 à 5 reps) : 3 à 5 min. Hypertrophie (8 à 12 reps) : 2 à 3 min. Endurance (15+ reps) : 1 à 2 min."),
      sourceName: traduire("Étude : Schoenfeld et al. (2016), J Strength Cond Res"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/26605807/"
    }
  },
  {
    id: '12',
    title: traduire("Timing Protéines : Le Mythe de la Fenêtre"),
    icon: "food-steak",
    category: traduire("Nutrition"),
    content: {
      what: traduire("La 'fenêtre anabolique' post training est surestimée."),
      why: traduire("Aragon & Schoenfeld montrent que le TOTAL protéique quotidien compte plus que le timing. La fenêtre est en réalité de 4 à 6h, pas 30 minutes."),
      how: traduire("Assure ton quota journalier (1.6 à 2.2g/kg). Répartis sur 3 à 4 repas. Le shake post training n'est pas obligatoire."),
      sourceName: "Review : Aragon & Schoenfeld (2013), J Int Soc Sports Nutr",
      sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/1550-2783-10-5"
    }
  },
  {
    id: '13',
    title: traduire("Récupération Active vs Passive"),
    icon: "activity",
    category: traduire("Récupération"),
    content: {
      what: traduire("Bouger légèrement après un effort intense aide à éliminer le lactate."),
      why: traduire("Après un effort intense, une récupération active (footing ou vélo léger) fait baisser le lactate dans le sang plus vite que rester assis. Dans une petite étude sur 10 hommes, l'élimination la plus rapide venait d'une intensité proche du seuil lactique."),
      how: traduire("Jour de repos = 20 à 30 min de marche ou vélo très léger (Zone 1). Évite le repos total complet."),
      sourceName: traduire("Étude : Menzies et al. (2010), J Sports Sci"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/20544484/"
    }
  },
  {
    id: '14',
    title: traduire("Étirements : Quand et Comment"),
    icon: "stretch",
    category: traduire("Mobilité"),
    content: {
      what: traduire("Les étirements statiques longs juste avant l'effort peuvent réduire la force."),
      why: traduire("Behm montre que des étirements statiques longs juste avant l'effort peuvent baisser un peu la force. Des étirements courts (moins de 90 s au total par muscle) et sans douleur ont peu d'effet, et les étirements dynamiques n'ont pas cet inconvénient. Dans une séance à part, les étirements statiques améliorent la souplesse."),
      how: traduire("Avant : échauffement dynamique. Après : étirements statiques (30s par muscle). Ou session dédiée mobilité."),
      sourceName: "Review : Behm & Chaouachi (2011), Eur J Appl Physiol",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/21373870/"
    }
  },
  {
    id: '15',
    title: traduire("Masse Musculaire & Métabolisme au Repos"),
    icon: "muscle",
    category: "Force",
    content: {
      what: traduire("Le muscle brûle des calories même au repos."),
      why: traduire("Au repos, 1 kg de muscle brûle environ 13 kcal par jour, contre 4,5 kcal pour la graisse. Gagner 5 kg de muscle représente environ 65 kcal de plus par jour. C'est modeste : le vrai bénéfice du muscle, c'est ta santé et ta force."),
      how: traduire("Programme force 3x/semaine. Surplus calorique modéré (+200 à 300 kcal). Patience : 0.5 à 1kg muscle/mois max."),
      sourceName: traduire("Recherche : Wang et al. (2010), Am J Clin Nutr"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/20962155/"
    }
  },
  {
    id: '16',
    title: traduire("Café & Performance"),
    icon: "coffee",
    category: traduire("Performance"),
    content: {
      what: traduire("La caféine est l'ergogène légal le plus puissant."),
      why: traduire("3 à 6 mg/kg de caféine améliore la performance d'endurance d'environ 2 à 4 % en moyenne. Les effets sur la force et le sprint existent aussi, mais varient plus. Bloque l'adénosine = moins de fatigue perçue."),
      how: traduire("200 à 400mg (2 à 4 expressos) 45 à 60 min avant l'effort. Évite si sensible ou entraînement soir."),
      sourceName: "Position Stand : ISSN (2021), J Int Soc Sports Nutr",
      sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/s12970-020-00383-4"
    }
  },
  {
    id: '17',
    title: traduire("Progression : Surcharge Progressive"),
    icon: "trending-up",
    category: "Force",
    content: {
      what: traduire("Le principe fondamental de tous les gains en force et masse."),
      why: traduire("Sans augmentation du stimulus (poids, reps, volume), le muscle s'adapte et stagne. La surcharge est LA loi de l'adaptation musculaire."),
      how: traduire("Chaque semaine : ajoute 1 à 2 reps OU +2.5kg OU 1 série supplémentaire. Tiens un carnet d'entraînement."),
      sourceName: "Principe : Kraemer & Ratamess (2004), Med Sci Sports Exerc",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/15064596/"
    }
  },
  {
    id: '18',
    title: traduire("Cortisol & Stress Chronique"),
    icon: "stress",
    category: traduire("Récupération"),
    content: {
      what: traduire("L'hormone du stress, quand elle reste élevée longtemps, peut freiner ta récupération."),
      why: traduire("Chez des femmes en bonne santé, celles qui stockaient plus de graisse au niveau du ventre sécrétaient plus de cortisol face à un stress. L'étude montre un lien, pas une cause. Un stress qui dure peut aussi gêner ton sommeil et ta récupération."),
      how: traduire("Dors 8h. Médite 10 min/jour. Limite le cardio excessif. Prends des jours OFF complets."),
      sourceName: traduire("Étude : Epel et al. (2000), Psychosom Med"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/11020091/"
    }
  },
  {
    id: '19',
    title: traduire("La Règle des 66 Jours"),
    icon: "brain",
    category: traduire("Mental"),
    content: {
      what: traduire("Le temps moyen nécessaire pour qu'un nouveau comportement devienne automatique. Ce n'est PAS 21 jours (mythe populaire sans fondement scientifique)."),
      why: traduire("Lally et al. (2010) ont suivi 96 personnes pendant 12 semaines. Résultat : 66 jours en médiane pour atteindre l'automaticité. La fourchette va de 18 à 254 jours selon les personnes et l'habitude. Rater un jour ne change presque rien."),
      how: traduire("Commence petit (2 min d'exercice suffit). Attache la nouvelle habitude à une existante (après le café du matin). Ne casse jamais la chaîne 2 jours de suite. Sois patient : les 3 premières semaines sont les plus difficiles."),
      sourceName: traduire("Étude : Lally et al. (2010), Eur J Soc Psychol"),
      sourceUrl: "https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674"
    }
  },
  {
    id: '20',
    title: traduire("Le Sommeil Profond et la Récupération"),
    icon: "bed-clock",
    category: traduire("Récupération"),
    content: {
      what: traduire("Le sommeil profond (stade N3) est la phase où ton corps récupère le plus physiquement. Une grande partie de l'hormone de croissance de la journée est sécrétée pendant cette phase, surtout en début de nuit."),
      why: traduire("Le sommeil fixe les gestes techniques appris dans la journée. Dans une étude de Walker (2002), une séquence de doigts apprise le soir était environ 20 % plus rapide après une nuit de sommeil, contre presque rien après 12 h éveillé. Ce gain était surtout lié au sommeil léger de fin de nuit (stade 2) : une nuit complète compte. Chez la souris, le sommeil aide aussi le cerveau à évacuer ses déchets."),
      how: traduire("Évite l'alcool le soir : il fragmente la fin de nuit et réduit le sommeil paradoxal. Fais du sport, mais évite un effort intense juste avant de dormir. Maintiens une routine horaire. La température idéale est 18 à 19°C."),
      sourceName: "Étude : Walker et al. (2002), Neuron",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/12123620/"
    }
  },
  {
    id: '21',
    title: traduire("Le Sommeil Paradoxal et la Performance"),
    icon: "brain",
    category: traduire("Récupération"),
    content: {
      what: traduire("Le sommeil REM (paradoxal) est la phase des rêves. Il représente environ 20 à 25 % d'une nuit d'adulte, et les cycles de fin de nuit en contiennent le plus."),
      why: traduire("11 basketteurs universitaires ont visé 10 h au lit par nuit pendant 5 à 7 semaines. Leur sprint est passé de 16,2 à 15,5 secondes et leur adresse aux lancers francs et à 3 points a progressé d'environ 9 %. Ils se sentaient aussi moins fatigués. L'étude est petite et sans groupe témoin, mais elle montre que des nuits plus longues peuvent aider."),
      how: traduire("Dors 7 à 9 h, et allonge tes nuits en période de charge si tu peux. Te lever trop tôt coupe les derniers cycles, les plus riches en sommeil paradoxal. L'alcool le soir réduit aussi le sommeil paradoxal."),
      sourceName: traduire("Étude : Mah et al. (2011), Sleep"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/21731144/"
    }
  },

  // ══════════════════════════════════════════════
  // RÈGLES COMBAT, JJB / GRAPPLING (règlement international)
  // ══════════════════════════════════════════════
  {
    id: 'c1',
    title: traduire("Le Barème des Points : Vue d'ensemble"),
    icon: "shield",
    category: traduire("Combat"),
    content: {
      what: traduire("Tableau officiel des points du règlement international de JJB. +2 pts : amenée au sol, renversement, genou sur l'estomac. +3 pts : passage de garde. +4 pts : montée, montée arrière, contrôle du dos. Soumission = victoire immédiate quelle que soit la différence de points."),
      why: traduire("La hiérarchie des positions dicte ta stratégie de match. Une montée (4 pts) vaut deux takedowns. En fin de match serré, les avantages (tiebreaker) décident avant les pénalités."),
      how: traduire("Priorité stratégique : cherche les 4 pts (montée, dos) depuis le passage de garde (3 pts). En cas d'égalité, cumule les avantages. Ne sois jamais passif, les pénalités s'accumulent contre toi."),
      sourceName: "Règlement international de JJB",
      sourceUrl: "https://ibjjf.com/books-videos"
    }
  },
  {
    id: 'c2',
    title: traduire("Amenée au Sol & Renversement (+2 pts)"),
    icon: "swords",
    category: traduire("Combat"),
    content: {
      what: traduire("2 points pour deux actions distinctes. Amenée au sol : projeter/emmener l'adversaire au sol depuis debout en gardant une position de contrôle. Renversement : renverser l'adversaire depuis sa garde (sweep) pour finir dessus en position dominante."),
      why: traduire("Ce sont les actions de transition debout → sol. Maîtriser l'amenée au sol donne 2 pts + position avantageuse immédiatement. Depuis la garde adverse, un renversement retourne entièrement le rapport de force."),
      how: traduire("Amenée au sol : single leg, double leg, arm drag, projections judo. Renversement : butterfly sweep, tripod, scissor sweep, hip bump, berimbolo. Condition obligatoire : contrôle maintenu pendant 3 secondes minimum."),
      sourceName: "Règlement international de JJB",
      sourceUrl: "https://ibjjf.com/books-videos"
    }
  },
  {
    id: 'c3',
    title: traduire("Genou sur l'Estomac (+2 pts)"),
    icon: "shield",
    category: traduire("Combat"),
    content: {
      what: traduire("2 points pour placer son genou sur l'estomac/ventre de l'adversaire en position de contrôle. L'adversaire est au sol, tu es en appui avec ton genou posé sur son abdomen et ton autre pied au sol. Position maintenue 3 secondes minimum."),
      why: traduire("Position de transition stratégique entre side control et montée. Elle force l'adversaire à réagir, créant des opportunités de finition ou de progression vers les 4 pts. Très efficace en no gi pour dicter le rythme."),
      how: traduire("Chaîne classique : side control → genou sur l'estomac (2 pts) → montée (4 pts). Contrôle la ceinture + col/nuque pour maintenir la pression. Attention : le genou doit être SUR l'estomac, s'il glisse sur le côté, les points ne sont pas accordés."),
      sourceName: "Règlement international de JJB, art. 4.3",
      sourceUrl: "https://ibjjf.com/books-videos"
    }
  },
  {
    id: 'c4',
    title: traduire("Passage de Garde (+3 pts)"),
    icon: "swords",
    category: traduire("Combat"),
    content: {
      what: traduire("3 points pour dépasser la garde de l'adversaire et stabiliser une position de contrôle latéral (side control, north south) pendant 3 secondes. L'adversaire ne doit plus être capable d'utiliser ses jambes pour protéger ou attaquer."),
      why: traduire("Action la plus fréquente en compétition, porte d'entrée vers les positions dominantes 4 pts. 3 pts vs 2 pts = avantage potentiellement décisif. En bas niveau, beaucoup de matchs se gagnent uniquement sur les passages de garde."),
      how: traduire("Techniques clés : toreando, leg drag, knee cut, smash pass, over under, stack pass, bull fighter, headquarters. Clé : stabiliser 3 secondes complètes SANS que l'adversaire récupère sa garde, sinon les points sont refusés."),
      sourceName: "Règlement international de JJB",
      sourceUrl: "https://ibjjf.com/books-videos"
    }
  },
  {
    id: 'c5',
    title: traduire("Montée & Contrôle du Dos (+4 pts)"),
    icon: "shield",
    category: traduire("Combat"),
    content: {
      what: traduire("4 points, valeur maximale, pour deux positions distinctes. Montée : être assis sur le torse adverse, cuisses de chaque côté, face à sa tête. Contrôle du dos : être dans le dos de l'adversaire avec les deux crochets (hooks), c'est à dire tes deux talons placés entre ses cuisses, sans croiser les jambes. Montée arrière (4 pts aussi) : adversaire face sol, tu montes dans son dos."),
      why: traduire("Positions les plus haut cotées car elles offrent les meilleures opportunités de soumission. Une montée réussie oblige l'adversaire à dépenser énormément d'énergie pour défendre, même sans finition, c'est un avantage tactique massif."),
      how: traduire("Montée : depuis side control ou KoS → montée. Contrôle du dos : prise de dos depuis turtle, berimbolo, ou basculement depuis la montée. Il faut les deux crochets pour valider. Avec un seul crochet, les jambes croisées ou un triangle de corps (body triangle), tu marques seulement un avantage, pas les 4 points."),
      sourceName: "Règlement international de JJB, art. 4.4",
      sourceUrl: "https://ibjjf.com/books-videos"
    }
  },
  {
    id: 'c6',
    title: traduire("Les Avantages en Compétition"),
    icon: "shield",
    category: traduire("Combat"),
    content: {
      what: traduire("L'avantage est un tiebreaker, il ne s'additionne PAS au score principal. Accordé pour quasi actions non finalisées : quasi soumission, quasi renversement, quasi passage de garde, quasi takedown. Si égalité de points en fin de match, le joueur avec le plus d'avantages gagne."),
      why: traduire("Décisifs en compétition, beaucoup de matchs haut niveau se terminent à égalité de points. Un avantage obtenu à la 1ère minute peut décider du résultat à la dernière seconde. Ne jamais les négliger."),
      how: traduire("Obtenir un avantage : tenter une soumission (même ratée), menacer une passe de garde sans finaliser, quasi sweep. Rappel : 2ème pénalité adversaire = +1 avantage pour toi. Stratégie fin de match : si tu as 1 avantage d'avance sur égalité, joue la montre légalement."),
      sourceName: "Règlement international de JJB, avantages",
      sourceUrl: "https://ibjjf.com/books-videos"
    }
  },
  {
    id: 'c7',
    title: traduire("Les Pénalités en Compétition"),
    icon: "swords",
    category: traduire("Combat"),
    content: {
      what: traduire("Système progressif en 4 niveaux. 1ère pénalité : avertissement simple (aucun point accordé). 2ème pénalité : +1 avantage accordé à l'adversaire. 3ème pénalité : +2 points accordés à l'adversaire. 4ème pénalité : disqualification (DQ) immédiate."),
      why: traduire("Conçues pour punir la passivité, la fuite, les prises dangereuses ou déloyales. Un compétiteur qui accumule 3 pénalités offre 2 pts à l'adversaire, ce qui peut inverser un match jusqu’ici gagné."),
      how: traduire("Éviter : passivité prolongée, fuir hors du tapis, retarder intentionnellement, techniques interdites à son grade. Surveiller les pénalités adversaire : à sa 2ème, tu gagnes un avantage, à sa 3ème, tu gagnes 2 pts. Adapte ta stratégie en conséquence."),
      sourceName: traduire("Règlement international de JJB, pénalités"),
      sourceUrl: "https://ibjjf.com/books-videos"
    }
  },
  {
    id: 'c8',
    title: traduire("Soumissions Autorisées par Grade"),
    icon: "shield",
    category: traduire("Combat"),
    content: {
      what: traduire("Les techniques autorisées varient selon le grade. Chez les adultes, en blanche : étranglements, clés de bras (armbar, kimura, americana, omoplata) et clé de cheville droite. Dès la bleue, la clé de poignet s'ajoute. En bleue et violette, kneebar et toe hold restent interdits. Marron et noire : + kneebar, toe hold, calf slicer et bicep slicer. Heel hooks, clés de genou en torsion et reaping : seulement en no gi, catégorie adulte, ceinture marron et noire."),
      why: traduire("Appliquer une technique interdite à son grade = disqualification immédiate, même si c'est involontaire. En plus, certaines soumissions peuvent blesser un partenaire non préparé à les défendre."),
      how: traduire("Règle pratique : jusqu'à la violette, la seule attaque de jambe permise est la clé de cheville droite. Kneebar et toe hold attendent la marron. Le heel hook reste interdit en kimono, à tous les grades. Chaque tournoi peut avoir son propre règlement, vérifie toujours avant de t'inscrire."),
      sourceName: traduire("Règlement international de JJB, techniques interdites par grade"),
      sourceUrl: "https://ibjjf.com/books-videos"
    }
  },
];

export const protocolData: ProtocolCard[] = [
  {
    id: 'p1',
    title: traduire("Tabata HIIT (4 minutes)"),
    icon: "activity",
    category: "Cardio",
    difficulty: 'Intermédiaire',
    content: {
      objective: traduire("Travailler ton cardio et ta capacité à répéter des efforts très intenses, en 4 minutes."),
      duration: traduire("4 minutes"),
      protocol: [
        traduire("Choisis un exercice (burpees, sprints, vélo, rameur)"),
        traduire("20 secondes ALL OUT (intensité maximale)"),
        traduire("10 secondes de repos"),
        traduire("Répète 8 fois (= 4 minutes)"),
        traduire("Retour au calme : 2 à 3 min de marche")
      ],
      frequency: traduire("2 à 3x par semaine (pas de jours consécutifs)"),
      notes: traduire("Nécessite une bonne condition physique. Échauffement obligatoire 5 à 10 min.")
    }
  },
  {
    id: 'p2',
    title: traduire("Programme 5×5 (Force)"),
    icon: "dumbbell",
    category: "Force",
    difficulty: 'Débutant',
    content: {
      objective: traduire("Gagner en force pure avec un programme connu de 5 séries de 5, simple et progressif."),
      duration: traduire("45 à 60 minutes"),
      protocol: [
        traduire("Séance A : Squat 5×5, Bench Press 5×5, Rowing Barre 5×5"),
        traduire("Séance B : Squat 5×5, Overhead Press 5×5, Deadlift 1×5"),
        traduire("Alterner A/B/A puis B/A/B chaque semaine"),
        traduire("Repos 3 à 5 min entre les séries"),
        traduire("Ajoute +2.5kg chaque séance réussie")
      ],
      frequency: traduire("3x par semaine (Lun/Mer/Ven)"),
      notes: traduire("Parfait pour débutants. Focus sur la technique avant de charger lourd.")
    }
  },
  {
    id: 'p3',
    title: traduire("Marche Inclinée 12 3 30"),
    icon: "slope-uphill",
    category: "Cardio",
    difficulty: 'Débutant',
    content: {
      objective: traduire("Cardio faible impact pour brûler du gras sans détruire les articulations."),
      duration: traduire("30 minutes"),
      protocol: [
        traduire("Tapis de course : 12% d'inclinaison"),
        traduire("Vitesse : 5 km/h (3 mph)"),
        traduire("Durée : 30 minutes en continu"),
        traduire("Garde le dos droit, ne te tiens pas à la barre"),
        traduire("Tu dois pouvoir tenir une conversation")
      ],
      frequency: traduire("4 à 5x par semaine (ou après musculation)"),
      notes: traduire("Populaire sur les réseaux sociaux. Doux pour les articulations. Garde la musculation à côté pour conserver ton muscle.")
    }
  },
  {
    id: 'p4',
    title: traduire("PPL (Push/Pull/Legs)"),
    icon: "muscle",
    category: "Force",
    difficulty: 'Intermédiaire',
    content: {
      objective: traduire("Programme complet pour hypertrophie musculaire équilibrée."),
      duration: traduire("60 à 75 minutes"),
      protocol: [
        traduire("PUSH : Pectoraux, Épaules, Triceps (8 à 12 reps)"),
        traduire("PULL : Dos, Trapèzes, Biceps (8 à 12 reps)"),
        "LEGS : Quadriceps, Ischio, Mollets, Abdos (8 à 15 reps)",
        traduire("3 à 4 exercices par groupe musculaire"),
        traduire("3 à 4 séries par exercice, 2 à 3 min de repos")
      ],
      frequency: traduire("6x par semaine (PPL/PPL) ou 3x (P/P/L)"),
      notes: traduire("Excellent pour gagner du volume. Nécessite une bonne récupération.")
    }
  },
  {
    id: 'p5',
    title: traduire("Zone 2 Cardio (Mitochondries)"),
    icon: "heart-pulse",
    category: "Endurance",
    difficulty: 'Débutant',
    content: {
      objective: traduire("Améliorer la capacité à brûler les graisses et la santé métabolique."),
      duration: traduire("45 à 60 minutes"),
      protocol: [
        traduire("Trouve ton seuil : tu peux parler en phrases complètes"),
        traduire("Fréquence cardiaque : 60 à 70% de ta FC max"),
        traduire("Reste STRICT sur l'intensité (pas plus haut)"),
        traduire("Course, vélo, rameur, natation"),
        "Respiration nasale uniquement (test)"
      ],
      frequency: traduire("1 à 2x par semaine"),
      notes: traduire("C'est l'entraînement préféré des athlètes d'endurance pour la base aérobie.")
    }
  },
  {
    id: 'p6',
    title: traduire("Récupération Active"),
    icon: "walk",
    category: traduire("Récupération"),
    difficulty: 'Débutant',
    content: {
      objective: traduire("Accélérer la récupération musculaire entre les séances intenses."),
      duration: traduire("20 à 30 minutes"),
      protocol: [
        traduire("Marche tranquille ou vélo très léger"),
        traduire("Intensité : Zone 1 (50 à 60% FC max)"),
        traduire("Ajoute des étirements dynamiques (5 à 10 min)"),
        traduire("Foam roller sur les zones tendues"),
        traduire("Mobilité articulaire (hanches, épaules)")
      ],
      frequency: traduire("Jours de repos entre les séances"),
      notes: traduire("Ne néglige pas l'importance du repos actif pour les gains à long terme.")
    }
  },
  {
    id: 'p7',
    title: traduire("Échauffement Dynamique Complet"),
    icon: "stretch",
    category: traduire("Mobilité"),
    difficulty: 'Débutant',
    content: {
      objective: traduire("Préparer le corps à l'effort et réduire le risque de blessure."),
      duration: traduire("10 à 15 minutes"),
      protocol: [
        traduire("Cardio léger : 3 à 5 min (vélo, rameur, corde à sauter)"),
        traduire("Mobilité articulaire : cercles bras/jambes (2 min)"),
        traduire("Étirements dynamiques : fentes marchées, leg swings (3 min)"),
        traduire("Activation musculaire : bandes élastiques (2 min)"),
        traduire("Sets d'approche : 50% puis 70% du poids de travail")
      ],
      frequency: traduire("AVANT chaque séance"),
      notes: traduire("PAS d'étirements statiques longs juste avant l'effort : ils peuvent baisser un peu ta force.")
    }
  },
  {
    id: 'p8',
    title: traduire("Étirements Post Training"),
    icon: "stretch",
    category: traduire("Mobilité"),
    difficulty: 'Débutant',
    content: {
      objective: traduire("Améliorer la flexibilité et accélérer la récupération musculaire."),
      duration: traduire("10 à 15 minutes"),
      protocol: [
        traduire("Attends 5 à 10 min après la fin de la séance"),
        traduire("Étirements statiques : 30 à 60 secondes par muscle"),
        traduire("Cible les groupes travaillés dans la séance"),
        traduire("Respire profondément, ne force pas"),
        traduire("Focus : ischios, fléchisseurs hanches, pectoraux, dorsaux")
      ],
      frequency: traduire("APRÈS chaque séance"),
      notes: traduire("Les étirements après l'effort entretiennent ta souplesse, mais réduisent très peu les courbatures.")
    }
  },
  {
    id: 'p9',
    title: traduire("Jeûne Intermittent 16/8"),
    icon: "clock",
    category: traduire("Nutrition"),
    difficulty: 'Intermédiaire',
    content: {
      objective: traduire("Simplifier l'alimentation et créer un déficit calorique naturel."),
      duration: "Continu",
      protocol: [
        traduire("Fenêtre de jeûne : 16 heures (ex: 20h, 12h)"),
        traduire("Fenêtre alimentaire : 8 heures (ex: 12h, 20h)"),
        traduire("Première semaine : commence par 14h de jeûne"),
        traduire("Pendant le jeûne : eau, thé, café noir (sans sucre)"),
        traduire("Casse le jeûne avec des protéines + légumes")
      ],
      frequency: traduire("5 à 7 jours par semaine"),
      notes: traduire("Consulte un médecin si tu as des problèmes de santé. Bois bien.")
    }
  },
  {
    id: 'p10',
    title: traduire("Hydratation Pré/Per/Post Training"),
    icon: "water",
    category: traduire("Performance"),
    difficulty: 'Débutant',
    content: {
      objective: traduire("Optimiser la performance et la récupération par une hydratation stratégique."),
      duration: traduire("Toute la journée"),
      protocol: [
        traduire("PRÉ TRAINING : 500ml d'eau 2h avant + 250ml juste avant"),
        traduire("PER TRAINING : 150 à 250ml toutes les 15 à 20 min"),
        traduire("POST TRAINING : 1.5L par kg de poids perdu"),
        traduire("Ajoute une pincée de sel si séance > 60 min"),
        traduire("Urine claire = bien hydraté, jaune foncé = déshydraté")
      ],
      frequency: traduire("À chaque séance"),
      notes: traduire("Passé 2 % de ton poids perdu en eau, ta performance d'endurance baisse, surtout à la chaleur. Ne néglige pas l'eau.")
    }
  },
  {
    id: 'p11',
    title: traduire("EMOM (Every Minute On the Minute)"),
    icon: "clock",
    category: "Force",
    difficulty: 'Avancé',
    content: {
      objective: traduire("Développer force, puissance et capacité de travail sous fatigue."),
      duration: traduire("10 à 20 minutes"),
      protocol: [
        traduire("Choisis 1 à 3 exercices (ex: thrusters, pull ups, box jumps)"),
        traduire("Définis un nombre de reps (ex: 10 thrusters)"),
        traduire("Démarre le chrono : fais tes reps en début de minute"),
        traduire("Repos le temps restant"),
        traduire("Chaque nouvelle minute = nouvelle série"),
        traduire("Continue pendant 10 à 20 min")
      ],
      frequency: traduire("1 à 2x par semaine"),
      notes: traduire("Si tu ne peux plus finir dans la minute, arrête. Très intense.")
    }
  },
  {
    id: 'p12',
    title: traduire("Pyramid Training (Hypertrophie)"),
    icon: "trending-up",
    category: "Force",
    difficulty: 'Intermédiaire',
    content: {
      objective: traduire("Maximiser l'hypertrophie en combinant force et volume."),
      duration: traduire("Par exercice"),
      protocol: [
        traduire("Série 1 : 12 reps à 60% 1RM"),
        traduire("Série 2 : 10 reps à 70% 1RM"),
        traduire("Série 3 : 8 reps à 80% 1RM"),
        traduire("Série 4 : 6 reps à 85% 1RM"),
        "Redescends : 8 reps → 10 reps → 12 reps",
        traduire("Repos : 2 à 3 min entre séries")
      ],
      frequency: traduire("1 exercice majeur par séance"),
      notes: traduire("Excellent pour casser la routine et choquer le muscle.")
    }
  },
  {
    id: 'p13',
    title: traduire("Protocole Pré Sommeil"),
    icon: "bed-clock",
    category: traduire("Récupération"),
    difficulty: 'Débutant',
    content: {
      objective: traduire("Optimiser la qualité du sommeil et la récupération nocturne."),
      duration: traduire("60 à 90 min avant coucher"),
      protocol: [
        traduire("Température chambre entre 16 et 19°C"),
        traduire("Arrêt des écrans 60 min avant coucher (lumière bleue)"),
        traduire("Dernière prise de caféine > 6h avant"),
        traduire("Dîner terminé > 2 à 3h avant coucher"),
        traduire("Éviter l'alcool (perturbe la fin de nuit et le sommeil paradoxal)"),
        traduire("5 à 10 min de respiration diaphragmatique ou méditation")
      ],
      frequency: traduire("Tous les soirs"),
      notes: traduire("Dormir < 8h = risque de blessure x1.7 (Milewski et al., 2014)")
    }
  },
  {
    id: 'p14',
    title: traduire("Protocole Jour de Compétition"),
    icon: "activity",
    category: traduire("Performance"),
    difficulty: 'Intermédiaire',
    content: {
      objective: traduire("Préparer le corps et l'esprit pour une performance optimale le jour J."),
      duration: traduire("Les 4h avant compétition"),
      protocol: [
        traduire("Dernier repas solide 3 à 4h avant la compétition"),
        traduire("Hydratation : 5 à 7ml/kg dans les 4h précédentes"),
        traduire("Échauffement progressif 15 à 20 min (aérobie léger)"),
        traduire("Activation musculaire spécifique au sport"),
        traduire("Routine de visualisation mentale 5 min"),
        traduire("Dernière prise de glucides 30 à 60 min avant (si endurance)")
      ],
      frequency: traduire("Chaque jour de compétition"),
      notes: traduire("Sources : Thomas et al. (2016), ACSM Position Stand (2007)")
    }
  },
  {
    id: 'p15',
    title: traduire("Protocole Récupération Post Séance"),
    icon: "activity",
    category: traduire("Récupération"),
    difficulty: 'Débutant',
    content: {
      objective: traduire("Maximiser la récupération après un entraînement intense."),
      duration: "2h post training",
      protocol: [
        traduire("Réhydratation : 1.5L par kg de poids perdu"),
        traduire("Protéines : 20 à 40g dans les 2h post effort"),
        traduire("Glucides : uniquement si re compétition < 24h"),
        traduire("Étirements légers ou mobilité 5 à 10 min"),
        traduire("Bain froid/contraste (si entraînement intense)"),
        traduire("Coucher avant 23h pour maximiser GH nocturne")
      ],
      frequency: traduire("Après chaque séance intense"),
      notes: traduire("Sources : Shirreffs et al. (2004), Morton et al. (2018)")
    }
  },
  {
    id: 'p16',
    title: traduire("Protocole Semaine de Décharge (Deload)"),
    icon: "trending-up",
    category: "Force",
    difficulty: 'Intermédiaire',
    content: {
      objective: traduire("Permettre la récupération complète et prévenir le surentraînement."),
      duration: "1 semaine",
      protocol: [
        traduire("Réduire nettement le volume total (séries × répétitions)"),
        traduire("Garder des charges modérées, sans aller à l'échec"),
        traduire("Moins de séances que d'habitude dans la semaine"),
        traduire("Focus sur la technique et la connexion neuromusculaire"),
        traduire("Privilégier le sommeil"),
        traduire("La planifier régulièrement, selon ta fatigue")
      ],
      frequency: traduire("Régulièrement, selon ta fatigue"),
      notes: traduire("Pratique courante chez les sportifs de force, à adapter à ta fatigue.")
    }
  }
];

