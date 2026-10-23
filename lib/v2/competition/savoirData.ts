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
      what: traduire("Marcher sur un tapis avec une inclinaison (12-15%) à vitesse modérée (4-5 km/h)."),
      why: traduire("L'inclinaison augmente la dépense énergétique de +50% vs le plat sans l'impact articulaire de la course. Une étude prouve qu'elle recrute massivement la chaîne postérieure (fessiers/ischios) et élève le métabolisme post-effort."),
      how: traduire("Protocole '12-3-30' ou variante : 12% de pente, 5 km/h, 30 min. Idéal en fin de séance musculation."),
      sourceName: traduire("Étude : Ehlen et al. (2011), J Strength Cond Res"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/21904245/"
    }
  },
  {
    id: '2',
    title: traduire("Déficit Calorique : La Loi Physique"),
    icon: "scale-balance",
    category: traduire("Nutrition"),
    content: {
      what: traduire("Consommer moins d'énergie que ton corps n'en dépense. C'est la seule condition physiologique obligatoire pour perdre du gras."),
      why: traduire("C'est la Première Loi de la Thermodynamique. Peu importe le régime (Keto, Jeûne, Paleo), s'il n'y a pas de déficit, il n'y a pas de perte de gras. Kevin Hall (NIH) a prouvé que c'est le bilan énergétique qui pilote le poids, pas l'insuline seule."),
      how: traduire("Calcule ton maintien (TDEE) et retire 300 à 500 kcal. Ne descends jamais sous ton métabolisme de base (BMR)."),
      sourceName: traduire("Étude : Hall et al. (2017), NIH / Am J Clin Nutr"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/28765272/"
    }
  },
  {
    id: '3',
    title: traduire("La Zone 2 : Usine à Mitochondries"),
    icon: "heart-pulse",
    category: "Endurance",
    content: {
      what: traduire("L'intensité où le lactate reste stable (< 2 mmol/L). Tu peux tenir une conversation."),
      why: traduire("C'est la seule zone qui améliore la 'flexibilité métabolique' : la capacité de tes cellules à utiliser le gras comme carburant principal. San Millán a prouvé que c'est le marqueur #1 de la santé métabolique."),
      how: traduire("45-60 min en continu, 1 à 2 fois/semaine. Reste strict : si tu es essoufflé, tu perds les bénéfices mitochondriaux."),
      sourceName: traduire("Étude : San Millán & Brooks (2018), Cell Metab"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/29283004/"
    }
  },
  {
    id: '4',
    title: traduire("Protéines & TEF"),
    icon: "food-steak",
    category: traduire("Nutrition"),
    content: {
      what: traduire("Le macronutriment bâtisseur."),
      why: traduire("L'Effet Thermique (TEF) des protéines est de 20-30%. Pour 100kcal ingérées, 25 sont brûlées par la digestion (contre 3% pour le gras). De plus, elles sont les plus rassasiantes via la sécrétion de l'hormone PYY."),
      how: traduire("Vise 1.6g à 2.2g par kg de poids. Une source à chaque repas."),
      sourceName: "Consensus : ISSN Position Stand (2017)",
      sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8"
    }
  },
  {
    id: '5',
    title: traduire("Fibres : L'Ozempic Naturel"),
    icon: "barley",
    category: traduire("Nutrition"),
    content: {
      what: traduire("Glucides non digestibles présents dans les végétaux."),
      why: traduire("Les fibres solubles gonflent dans l'estomac et déclenchent la libération de GLP-1 (l'hormone de satiété imitée par les médicaments). Elles nourrissent aussi le microbiote qui régule le poids."),
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
      why: traduire("Dormir < 8h augmente le risque de blessure de 1.7x. Le manque de sommeil élève le cortisol (catabolique) et bloque l'hormone de croissance. C'est pendant la nuit que le gras s'oxyde et le muscle se répare."),
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
      why: traduire("Boire 500ml d'eau augmente le métabolisme de 30% pendant l'heure qui suit (thermogenèse induite par l'eau). Une déshydratation de 2% baisse les performances de 10-20%."),
      how: traduire("Bois 500ml d'eau dès le réveil. Bois 1 verre avant chaque repas."),
      sourceName: traduire("Étude : Boschmann et al. (2003), JCEM"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/14671205/"
    }
  },
  {
    id: '8',
    title: traduire("NEAT : L'Activité Invisible"),
    icon: "walk",
    category: traduire("Activité"),
    content: {
      what: traduire("Non-Exercise Activity Thermogenesis (Activité hors sport)."),
      why: traduire("Le Dr Levine a prouvé que la différence entre une personne mince et en surpoids réside souvent dans ces 2h de mouvement inconscient par jour. C'est 500 à 800 kcal 'gratuites'."),
      how: traduire("Téléphone debout. Gare-toi loin. Prends les escaliers. Vise 8000 pas hors séance."),
      sourceName: "Recherche : Levine (2002), Science",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/12468415/"
    }
  },
  {
    id: '9',
    title: traduire("Entraînement en Force & Longévité"),
    icon: "dumbbell",
    category: "Force",
    content: {
      what: traduire("La musculation 2-3 fois par semaine augmente l'espérance de vie."),
      why: traduire("Une méta-analyse de 2022 montre que l'entraînement en force réduit la mortalité toutes causes de 15%. Il préserve la masse musculaire (sarcopénie) et améliore la sensibilité à l'insuline."),
      how: traduire("2 séances minimum par semaine. Travaille tous les groupes musculaires. 3 séries de 8-12 répétitions."),
      sourceName: traduire("Méta-analyse : Momma et al. (2022), Br J Sports Med"),
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
      why: traduire("C'est le supplément le plus étudié et efficace. +5-15% de force, +2kg de muscle en 8 semaines, améliore la cognition. Plus de 1000 études confirment son efficacité et sa sécurité."),
      how: traduire("5g par jour, tous les jours. Monohydrate (la forme la moins chère est la meilleure). Pas besoin de phase de charge."),
      sourceName: "Position Stand : ISSN (2017), J Int Soc Sports Nutr",
      sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0173-z"
    }
  },
  {
    id: '11',
    title: traduire("Repos Inter-Séries : La Durée Compte"),
    icon: "clock",
    category: "Force",
    content: {
      what: traduire("Le temps de repos entre les séries influence l'hypertrophie."),
      why: traduire("Schoenfeld a démontré que 3 minutes de repos = +20% de gains musculaires vs 1 minute. Le repos permet la restauration des phosphocréatines et maintient l'intensité."),
      how: traduire("Force (1-5 reps) : 3-5 min. Hypertrophie (8-12 reps) : 2-3 min. Endurance (15+ reps) : 1-2 min."),
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
      what: traduire("La 'fenêtre anabolique' post-training est surestimée."),
      why: traduire("Aragon & Schoenfeld montrent que le TOTAL protéique quotidien compte plus que le timing. La fenêtre est en réalité de 4-6h, pas 30 minutes."),
      how: traduire("Assure ton quota journalier (1.6-2.2g/kg). Répartis sur 3-4 repas. Le shake post-training n'est pas obligatoire."),
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
      what: traduire("Bouger légèrement entre les séances accélère la récupération."),
      why: traduire("La récupération active (marche, vélo léger) augmente le flux sanguin et élimine le lactate 2x plus vite que rester assis. Réduit les courbatures (DOMS) de 30%."),
      how: traduire("Jour de repos = 20-30 min de marche ou vélo très léger (Zone 1). Évite le repos total complet."),
      sourceName: traduire("Étude : Menzies et al. (2010), Sports Med"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/20199122/"
    }
  },
  {
    id: '14',
    title: traduire("Étirements : Quand et Comment"),
    icon: "stretch",
    category: traduire("Mobilité"),
    content: {
      what: traduire("Les étirements statiques avant l'effort réduisent la force."),
      why: traduire("Behm a prouvé que s'étirer avant diminue la production de force de 5-8%. Par contre, après l'effort, ils améliorent la récupération et la flexibilité."),
      how: traduire("Avant : échauffement dynamique. Après : étirements statiques (30s par muscle). Ou session dédiée mobilité."),
      sourceName: "Review : Behm & Blazevich (2011), Scand J Med Sci Sports",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/21410544/"
    }
  },
  {
    id: '15',
    title: traduire("Masse Musculaire & Métabolisme au Repos"),
    icon: "muscle",
    category: "Force",
    content: {
      what: traduire("Le muscle brûle des calories même au repos."),
      why: traduire("1 kg de muscle brûle ~13 kcal/jour vs 4 kcal pour la graisse. Gagner 5kg de muscle = +65 kcal/jour soit 24 000 kcal/an (3kg de gras potentiels)."),
      how: traduire("Programme force 3x/semaine. Surplus calorique modéré (+200-300 kcal). Patience : 0.5-1kg muscle/mois max."),
      sourceName: traduire("Recherche : Wang et al. (2010), Am J Clin Nutr"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/20200263/"
    }
  },
  {
    id: '16',
    title: traduire("Café & Performance"),
    icon: "coffee",
    category: traduire("Performance"),
    content: {
      what: traduire("La caféine est l'ergogène légal le plus puissant."),
      why: traduire("3-6 mg/kg de caféine augmente la performance de 3-7% (endurance, force, sprint). Bloque l'adénosine = moins de fatigue perçue."),
      how: traduire("200-400mg (2-4 expressos) 45-60 min avant l'effort. Évite si sensible ou entraînement soir."),
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
      how: traduire("Chaque semaine : ajoute 1-2 reps OU +2.5kg OU 1 série supplémentaire. Tiens un carnet d'entraînement."),
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
      what: traduire("L'hormone du stress détruit le muscle si elle reste élevée."),
      why: traduire("Le cortisol chroniquement élevé bloque la testostérone, augmente le stockage abdominal et freine la récupération. C'est l'ennemi #1 de la composition corporelle."),
      how: traduire("Dors 8h. Médite 10 min/jour. Limite le cardio excessif. Prends des jours OFF complets."),
      sourceName: traduire("Étude : Epel et al. (2000), Psychosom Med"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/11020090/"
    }
  },
  {
    id: '19',
    title: traduire("La Règle des 66 Jours"),
    icon: "brain",
    category: traduire("Mental"),
    content: {
      what: traduire("Le temps moyen nécessaire pour qu'un nouveau comportement devienne automatique. Ce n'est PAS 21 jours (mythe populaire sans fondement scientifique)."),
      why: traduire("Lally et al. (2010) ont suivi 96 personnes pendant 12 semaines. Résultat : en moyenne 66 jours pour atteindre l'automaticité. La fourchette va de 18 à 254 jours selon la complexité de l'habitude."),
      how: traduire("Commence petit (2 min d'exercice suffit). Attache la nouvelle habitude à une existante (après le café du matin). Ne casse jamais la chaîne 2 jours de suite. Sois patient : les 3 premières semaines sont les plus difficiles."),
      sourceName: traduire("Étude : Lally et al. (2010), Eur J Soc Psychol"),
      sourceUrl: "https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674"
    }
  },
  {
    id: '20',
    title: traduire("Dormir Moins Bête : Le Sommeil Profond"),
    icon: "bed-clock",
    category: traduire("Récupération"),
    content: {
      what: traduire("Le sommeil profond (stades N3) est la phase où ton corps se répare physiquement. C'est pendant cette phase que l'hormone de croissance est sécrétée (80% de la production quotidienne)."),
      why: traduire("Walker (2017) a démontré que le sommeil profond consolide la mémoire procédurale (mouvements techniques). Sans lui, tu oublies 40% de ce que tu as appris. Il nettoie aussi les toxines cérébrales (système glymphatique)."),
      how: traduire("Évite l'alcool (réduit le sommeil profond de 20-40%). Fais du sport mais pas tard (augmente le sommeil profond de 75%). Maintiens une routine horaire. La température idéale est 18-19°C."),
      sourceName: "Livre : Matthew Walker, Why We Sleep (2017)",
      sourceUrl: "https://www.sleepdiplomat.com/"
    }
  },
  {
    id: '21',
    title: traduire("Dormir Moins Bête : Le REM et la Performance"),
    icon: "brain",
    category: traduire("Récupération"),
    content: {
      what: traduire("Le sommeil REM (paradoxal) est la phase des rêves. C'est là que ton cerveau intègre les stratégies et résout les problèmes complexes."),
      why: traduire("Une étude de Harvard montre que les athlètes privés de REM perdent 30% de leur capacité à prendre des décisions tactiques. Le REM représente 25% d'une nuit normale, chaque cycle de 90 min en contient plus en fin de nuit."),
      how: traduire("Dors 7-9h pour avoir suffisamment de REM (les cycles tardifs en contiennent plus). La mélatonine naturelle aide, pas les somnifères qui suppriment le REM."),
      sourceName: traduire("Étude : Mah et al. (2011), Sleep"),
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/21731144/"
    }
  },

  // ══════════════════════════════════════════════
  // RÈGLES COMBAT, JJB / GRAPPLING (CFJJB)
  // ══════════════════════════════════════════════
  {
    id: 'c1',
    title: traduire("Le Barème CFJJB : Vue d'ensemble"),
    icon: "shield",
    category: traduire("Combat"),
    content: {
      what: traduire("Tableau officiel des points CFJJB. +2 pts : amenée au sol, renversement, genou sur l'estomac. +3 pts : passage de garde. +4 pts : montée, montée arrière, contrôle du dos. Soumission = victoire immédiate quelle que soit la différence de points."),
      why: traduire("La hiérarchie des positions dicte ta stratégie de match. Une montée (4 pts) vaut deux takedowns. En fin de match serré, les avantages (tiebreaker) décident avant les pénalités."),
      how: traduire("Priorité stratégique : cherche les 4 pts (montée, dos) depuis le passage de garde (3 pts). En cas d'égalité, cumule les avantages. Ne sois jamais passif, les pénalités s'accumulent contre toi."),
      sourceName: traduire("Règlement Officiel CFJJB, Guide Général de Compétition"),
      sourceUrl: "https://cfjjb.com"
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
      sourceName: "CFJJB Art. 4.1 & 4.2",
      sourceUrl: "https://cfjjb.com"
    }
  },
  {
    id: 'c3',
    title: traduire("Genou sur l'Estomac (+2 pts)"),
    icon: "shield",
    category: traduire("Combat"),
    content: {
      what: traduire("2 points pour placer son genou sur l'estomac/ventre de l'adversaire en position de contrôle. L'adversaire est au sol, tu es en appui avec ton genou posé sur son abdomen et ton autre pied au sol. Position maintenue 3 secondes minimum."),
      why: traduire("Position de transition stratégique entre side control et montée. Elle force l'adversaire à réagir, créant des opportunités de finition ou de progression vers les 4 pts. Très efficace en no-gi pour dicter le rythme."),
      how: traduire("Chaîne classique : side control → genou sur l'estomac (2 pts) → montée (4 pts). Contrôle la ceinture + col/nuque pour maintenir la pression. Attention : le genou doit être SUR l'estomac, s'il glisse sur le côté, les points ne sont pas accordés."),
      sourceName: "CFJJB Art. 4.3",
      sourceUrl: "https://cfjjb.com"
    }
  },
  {
    id: 'c4',
    title: traduire("Passage de Garde (+3 pts)"),
    icon: "swords",
    category: traduire("Combat"),
    content: {
      what: traduire("3 points pour dépasser la garde de l'adversaire et stabiliser une position de contrôle latéral (side control, north-south) pendant 3 secondes. L'adversaire ne doit plus être capable d'utiliser ses jambes pour protéger ou attaquer."),
      why: traduire("Action la plus fréquente en compétition, porte d'entrée vers les positions dominantes 4 pts. 3 pts vs 2 pts = avantage potentiellement décisif. En bas niveau, beaucoup de matchs se gagnent uniquement sur les passages de garde."),
      how: traduire("Techniques clés : toreando, leg drag, knee cut, smash pass, over-under, stack pass, bull fighter, headquarters. Clé : stabiliser 3 secondes complètes SANS que l'adversaire récupère sa garde, sinon les points sont refusés."),
      sourceName: "CFJJB Art. 4.5",
      sourceUrl: "https://cfjjb.com"
    }
  },
  {
    id: 'c5',
    title: traduire("Montée & Contrôle du Dos (+4 pts)"),
    icon: "shield",
    category: traduire("Combat"),
    content: {
      what: traduire("4 points, valeur maximale, pour deux positions distinctes. Montée : être assis sur le torse adverse, cuisses de chaque côté, face à sa tête. Contrôle du dos : être dans le dos de l'adversaire avec au minimum un crochet (hook) de jambe inséré. Montée arrière (4 pts aussi) : adversaire face sol, tu montes dans son dos."),
      why: traduire("Positions les plus haut cotées car elles offrent les meilleures opportunités de soumission. Une montée réussie oblige l'adversaire à dépenser énormément d'énergie pour défendre, même sans finition, c'est un avantage tactique massif."),
      how: traduire("Montée : depuis side control ou KoS → montée. Contrôle du dos : prise de dos depuis turtle, berimbolo, ou basculement depuis la montée. Minimum un crochet pour valider. Body triangle = variation du contrôle dos (4 pts identiques)."),
      sourceName: "CFJJB Art. 4.4",
      sourceUrl: "https://cfjjb.com"
    }
  },
  {
    id: 'c6',
    title: traduire("Les Avantages CFJJB"),
    icon: "shield",
    category: traduire("Combat"),
    content: {
      what: traduire("L'avantage est un tiebreaker, il ne s'additionne PAS au score principal. Accordé pour quasi-actions non finalisées : quasi-soumission, quasi-renversement, quasi-passage de garde, quasi-takedown. Si égalité de points en fin de match, le joueur avec le plus d'avantages gagne."),
      why: traduire("Décisifs en compétition, beaucoup de matchs haut niveau se terminent à égalité de points. Un avantage obtenu à la 1ère minute peut décider du résultat à la dernière seconde. Ne jamais les négliger."),
      how: traduire("Obtenir un avantage : tenter une soumission (même ratée), menacer une passe de garde sans finaliser, quasi-sweep. Rappel : 2ème pénalité adversaire = +1 avantage pour toi. Stratégie fin de match : si tu as 1 avantage d'avance sur égalité, joue la montre légalement."),
      sourceName: "CFJJB Art. 4.6, Avantages",
      sourceUrl: "https://cfjjb.com"
    }
  },
  {
    id: 'c7',
    title: traduire("Les Pénalités CFJJB"),
    icon: "swords",
    category: traduire("Combat"),
    content: {
      what: traduire("Système progressif en 4 niveaux. 1ère pénalité : avertissement simple (aucun point accordé). 2ème pénalité : +1 avantage accordé à l'adversaire. 3ème pénalité : +2 points accordés à l'adversaire. 4ème pénalité : disqualification (DQ) immédiate."),
      why: traduire("Conçues pour punir la passivité, la fuite, les prises dangereuses ou déloyales. Un compétiteur qui accumule 3 pénalités offre 2 pts à l'adversaire, ce qui peut inverser un match jusque-là gagné."),
      how: traduire("Éviter : passivité prolongée, fuir hors du tapis, retarder intentionnellement, techniques interdites à son grade. Surveiller les pénalités adversaire : à sa 2ème, tu gagnes un avantage, à sa 3ème, tu gagnes 2 pts. Adapte ta stratégie en conséquence."),
      sourceName: traduire("CFJJB Art. 6, Pénalités"),
      sourceUrl: "https://cfjjb.com"
    }
  },
  {
    id: 'c8',
    title: traduire("Soumissions Autorisées par Grade (CFJJB)"),
    icon: "shield",
    category: traduire("Combat"),
    content: {
      what: traduire("Les techniques autorisées varient selon le grade. Blanche : étranglements + locks de bras uniquement (armbar, kimura, americana, omoplata). Bleue/Violette : + locks de genoux sans rotation (kneebar, toehold, ankle lock droit). Marron/Noire : + heel hooks (intérieur et extérieur, reaping autorisé)."),
      why: traduire("Appliquer une technique interdite à son grade = disqualification immédiate, même si c'est involontaire. En plus, certaines soumissions peuvent blesser un partenaire non préparé à les défendre."),
      how: traduire("Règle pratique : en blanc, reste bras + étranglements. Bleu+, les genoux sans rotation sont disponibles. Jamais de heel hook rotatif avant marron/noir. En no-gi les règles sont souvent différentes, vérifie toujours le règlement du tournoi avant de t'inscrire."),
      sourceName: traduire("CFJJB Annexe, Techniques autorisées par grade"),
      sourceUrl: "https://cfjjb.com"
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
      objective: traduire("Brûler un maximum de calories en 4 minutes et booster le métabolisme pour 24h."),
      duration: traduire("4 minutes"),
      protocol: [
        traduire("Choisis un exercice (burpees, sprints, vélo, rameur)"),
        traduire("20 secondes ALL-OUT (intensité maximale)"),
        traduire("10 secondes de repos"),
        traduire("Répète 8 fois (= 4 minutes)"),
        traduire("Retour au calme : 2-3 min de marche")
      ],
      frequency: traduire("2-3x par semaine (pas de jours consécutifs)"),
      notes: traduire("Nécessite une bonne condition physique. Échauffement obligatoire 5-10 min.")
    }
  },
  {
    id: 'p2',
    title: traduire("5×5 Stronglifts (Force)"),
    icon: "dumbbell",
    category: "Force",
    difficulty: 'Débutant',
    content: {
      objective: traduire("Gagner en force pure avec un programme simple et progressif."),
      duration: traduire("45-60 minutes"),
      protocol: [
        traduire("Séance A : Squat 5×5, Bench Press 5×5, Rowing Barre 5×5"),
        traduire("Séance B : Squat 5×5, Overhead Press 5×5, Deadlift 1×5"),
        traduire("Alterner A/B/A puis B/A/B chaque semaine"),
        traduire("Repos 3-5 min entre les séries"),
        traduire("Ajoute +2.5kg chaque séance réussie")
      ],
      frequency: traduire("3x par semaine (Lun/Mer/Ven)"),
      notes: traduire("Parfait pour débutants. Focus sur la technique avant de charger lourd.")
    }
  },
  {
    id: 'p3',
    title: traduire("12-3-30 Marche Inclinée"),
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
      frequency: traduire("4-5x par semaine (ou après musculation)"),
      notes: traduire("Populaire sur TikTok. Très efficace pour sécher sans perdre de muscle.")
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
      duration: traduire("60-75 minutes"),
      protocol: [
        traduire("PUSH : Pectoraux, Épaules, Triceps (8-12 reps)"),
        traduire("PULL : Dos, Trapèzes, Biceps (8-12 reps)"),
        "LEGS : Quadriceps, Ischio, Mollets, Abdos (8-15 reps)",
        traduire("3-4 exercices par groupe musculaire"),
        traduire("3-4 séries par exercice, 2-3 min de repos")
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
      duration: traduire("45-60 minutes"),
      protocol: [
        traduire("Trouve ton seuil : tu peux parler en phrases complètes"),
        traduire("Fréquence cardiaque : 60-70% de ta FC max"),
        traduire("Reste STRICT sur l'intensité (pas plus haut)"),
        traduire("Course, vélo, rameur, natation"),
        "Respiration nasale uniquement (test)"
      ],
      frequency: traduire("1-2x par semaine"),
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
      duration: traduire("20-30 minutes"),
      protocol: [
        traduire("Marche tranquille ou vélo très léger"),
        traduire("Intensité : Zone 1 (50-60% FC max)"),
        traduire("Ajoute des étirements dynamiques (5-10 min)"),
        traduire("Foam roller sur les zones tendues"),
        traduire("Mobilité articulaire (hanches, épaules)")
      ],
      frequency: traduire("Jours de repos entre les séances"),
      notes: traduire("Ne sous-estime pas l'importance du repos actif pour les gains à long terme.")
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
      duration: traduire("10-15 minutes"),
      protocol: [
        traduire("Cardio léger : 3-5 min (vélo, rameur, corde à sauter)"),
        traduire("Mobilité articulaire : cercles bras/jambes (2 min)"),
        traduire("Étirements dynamiques : fentes marchées, leg swings (3 min)"),
        traduire("Activation musculaire : bandes élastiques (2 min)"),
        traduire("Sets d'approche : 50% puis 70% du poids de travail")
      ],
      frequency: traduire("AVANT chaque séance"),
      notes: traduire("PAS d'étirements statiques avant l'effort (diminue la force de 5-8%).")
    }
  },
  {
    id: 'p8',
    title: traduire("Étirements Post-Training"),
    icon: "stretch",
    category: traduire("Mobilité"),
    difficulty: 'Débutant',
    content: {
      objective: traduire("Améliorer la flexibilité et accélérer la récupération musculaire."),
      duration: traduire("10-15 minutes"),
      protocol: [
        traduire("Attends 5-10 min après la fin de la séance"),
        traduire("Étirements statiques : 30-60 secondes par muscle"),
        traduire("Cible les groupes travaillés dans la séance"),
        traduire("Respire profondément, ne force pas"),
        traduire("Focus : ischios, fléchisseurs hanches, pectoraux, dorsaux")
      ],
      frequency: traduire("APRÈS chaque séance"),
      notes: traduire("Les étirements post-effort réduisent les courbatures de ~30%.")
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
      frequency: traduire("5-7 jours par semaine"),
      notes: traduire("Consulte un médecin si tu as des problèmes de santé. Hydrate-toi bien.")
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
        traduire("PRÉ-TRAINING : 500ml d'eau 2h avant + 250ml juste avant"),
        traduire("PER-TRAINING : 150-250ml toutes les 15-20 min"),
        traduire("POST-TRAINING : 1.5L par kg de poids perdu"),
        traduire("Ajoute une pincée de sel si séance > 60 min"),
        traduire("Urine claire = bien hydraté, jaune foncé = déshydraté")
      ],
      frequency: traduire("À chaque séance"),
      notes: traduire("2% de déshydratation = -10 à 20% de performance. Ne sous-estime pas l'eau.")
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
      duration: traduire("10-20 minutes"),
      protocol: [
        traduire("Choisis 1-3 exercices (ex: thrusters, pull-ups, box jumps)"),
        traduire("Définis un nombre de reps (ex: 10 thrusters)"),
        traduire("Démarre le chrono : fais tes reps en début de minute"),
        traduire("Repose-toi le temps restant"),
        traduire("Chaque nouvelle minute = nouvelle série"),
        traduire("Continue pendant 10-20 min")
      ],
      frequency: traduire("1-2x par semaine"),
      notes: traduire("Si tu ne peux plus finir dans la minute, arrête-toi. Très intense.")
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
        traduire("Repos : 2-3 min entre séries")
      ],
      frequency: traduire("1 exercice majeur par séance"),
      notes: traduire("Excellent pour casser la routine et choquer le muscle.")
    }
  },
  {
    id: 'p13',
    title: traduire("Protocole Pré-Sommeil"),
    icon: "bed-clock",
    category: traduire("Récupération"),
    difficulty: 'Débutant',
    content: {
      objective: traduire("Optimiser la qualité du sommeil et la récupération nocturne."),
      duration: traduire("60-90 min avant coucher"),
      protocol: [
        traduire("Température chambre entre 16-19°C"),
        traduire("Arrêt des écrans 60 min avant coucher (lumière bleue)"),
        traduire("Dernière prise de caféine > 6h avant"),
        traduire("Dîner terminé > 2-3h avant coucher"),
        traduire("Éviter l'alcool (perturbe le sommeil profond)"),
        traduire("5-10 min de respiration diaphragmatique ou méditation")
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
        traduire("Dernier repas solide 3-4h avant la compétition"),
        traduire("Hydratation : 5-7ml/kg dans les 4h précédentes"),
        traduire("Échauffement progressif 15-20 min (aérobie léger)"),
        traduire("Activation musculaire spécifique au sport"),
        traduire("Routine de visualisation mentale 5 min"),
        traduire("Dernière prise de glucides 30-60 min avant (si endurance)")
      ],
      frequency: traduire("Chaque jour de compétition"),
      notes: traduire("Sources : Thomas et al. (2016), ACSM Position Stand (2007)")
    }
  },
  {
    id: 'p15',
    title: traduire("Protocole Récupération Post-Séance"),
    icon: "activity",
    category: traduire("Récupération"),
    difficulty: 'Débutant',
    content: {
      objective: traduire("Maximiser la récupération après un entraînement intense."),
      duration: "2h post-training",
      protocol: [
        traduire("Réhydratation : 1.5L par kg de poids perdu"),
        traduire("Protéines : 20-40g dans les 2h post-effort"),
        traduire("Glucides : uniquement si re-compétition < 24h"),
        traduire("Étirements légers ou mobilité 5-10 min"),
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
        traduire("Réduire le volume total de 40-60% (séries × répétitions)"),
        traduire("Maintenir l'intensité (charges) à 70-80% du max"),
        traduire("Fréquence : 2-3 séances max dans la semaine"),
        traduire("Focus sur la technique et la connexion neuromusculaire"),
        traduire("Privilégier le sommeil (objectif 8-9h)"),
        traduire("Planifier tous les 4-8 semaines selon fatigue")
      ],
      frequency: traduire("Toutes les 4-8 semaines"),
      notes: traduire("Sources : Zourdos et al. (2016), Pritchard et al. (2015)")
    }
  }
];

