// Base de données des articles scientifiques du LABO
// Tous les articles sont basés sur des études peer-reviewed

export interface Reference {
  id: number;
  author: string;
  year: number;
  title: string;
  journal: string;
  volume?: string;
  pages?: string;
  doi?: string;
  pubmedId?: string;
}

export interface ActionLink {
  screen: string;
  title: string;
  subtitle: string;
}

export interface ArticleContent {
  what: string;
  why: string;
  how: string;
}

export interface LabArticle {
  id: string;
  category: 'ENTRAÎNEMENT' | 'NUTRITION' | 'RÉCUPÉRATION' | 'MÉTABOLISME' | 'MENTAL';
  categoryColor: string;
  title: string;
  readTime: number;
  content: ArticleContent;
  references: Reference[];
  actionLinks: ActionLink[];
}

export const LAB_ARTICLES: LabArticle[] = [
  // ═══════════════════════════════════════════════════════════
  // CATÉGORIE : ENTRAÎNEMENT
  // ═══════════════════════════════════════════════════════════
  {
    id: 'zone-2',
    category: 'ENTRAÎNEMENT',
    categoryColor: '#EF4444',
    title: 'Zone 2 : L\'Usine à Mitochondries',
    readTime: 4,
    content: {
      what: 'L\'intensité où le lactate sanguin reste stable (< 2 mmol/L). Tu peux tenir une conversation sans être essoufflé.',
      why: 'C\'est la seule zone qui améliore la "flexibilité métabolique" : la capacité de tes cellules à utiliser le gras comme carburant principal. San Millán a prouvé que c\'est le marqueur #1 de la santé métabolique. Les mitochondries se multiplient et deviennent plus efficaces.',
      how: '45-60 min en continu, 1-2 fois/semaine. Reste strict : si tu es essoufflé, tu perds les bénéfices mitochondriaux. Test simple : tu dois pouvoir parler en phrases complètes.',
    },
    references: [
      {
        id: 1,
        author: 'San Millán I, Brooks GA',
        year: 2018,
        title: 'Assessment of Metabolic Flexibility by Means of Measuring Blood Lactate, Fat, and Carbohydrate Oxidation Responses to Exercise in Professional Endurance Athletes and Less-Fit Individuals',
        journal: 'Sports Medicine',
        volume: '48(2)',
        pages: '467-479',
        doi: '10.1007/s40279-017-0751-x',
        pubmedId: '28623613',
      }
    ],
    actionLinks: [
      { screen: 'timer', title: 'Lancer un timer Zone 2', subtitle: '45 min recommandées' }
    ]
  },

  {
    id: 'neat',
    category: 'ENTRAÎNEMENT',
    categoryColor: '#EF4444',
    title: 'NEAT : L\'Activité Invisible',
    readTime: 3,
    content: {
      what: 'Non-Exercise Activity Thermogenesis. Toutes les calories brûlées en dehors de l\'exercice volontaire : marcher, taper au clavier, faire la vaisselle, gigoter, monter les escaliers...',
      why: 'Le NEAT peut représenter 15-50% de ta dépense totale quotidienne. Levine (2005) a montré que les personnes "naturellement minces" ont un NEAT jusqu\'à 350 kcal/jour supérieur aux personnes obèses, malgré une alimentation similaire.',
      how: 'Vise 8000-10000 pas/jour minimum. Utilise un bureau debout. Marche pendant les appels téléphoniques. Prends systématiquement les escaliers. Gare-toi plus loin. Chaque mouvement compte.',
    },
    references: [
      {
        id: 1,
        author: 'Levine JA, Eberhardt NL, Jensen MD',
        year: 2005,
        title: 'Interindividual variation in posture allocation: possible role in human obesity',
        journal: 'Science',
        volume: '307(5709)',
        pages: '584-586',
        doi: '10.1126/science.1106561',
        pubmedId: '15681386',
      }
    ],
    actionLinks: []
  },

  // ═══════════════════════════════════════════════════════════
  // CATÉGORIE : NUTRITION
  // ═══════════════════════════════════════════════════════════
  {
    id: 'deficit-calorique',
    category: 'NUTRITION',
    categoryColor: '#10B981',
    title: 'Déficit Calorique : La Loi Physique',
    readTime: 5,
    content: {
      what: 'La différence entre les calories consommées et les calories dépensées. C\'est la SEULE variable qui détermine la perte de poids. Tout le reste est secondaire.',
      why: '1 kg de graisse = 7700 kcal. Un déficit de 500 kcal/jour = -0.5 kg/semaine théorique. Hall et al. (2011) ont modélisé précisément cette relation avec une précision de 95%. Aucune autre méthode ne contourne cette loi thermodynamique.',
      how: '1. Calcule ton TDEE (dépense totale quotidienne)\n2. Soustrais 300-500 kcal pour un déficit modéré\n3. Suis ton poids sur 2-4 semaines\n4. Ajuste si plateau ou perte trop rapide',
    },
    references: [
      {
        id: 1,
        author: 'Hall KD, Sacks G, Chandramohan D, et al.',
        year: 2011,
        title: 'Quantification of the effect of energy imbalance on bodyweight',
        journal: 'The Lancet',
        volume: '378(9793)',
        pages: '826-837',
        doi: '10.1016/S0140-6736(11)60812-X',
        pubmedId: '21872751',
      }
    ],
    actionLinks: [
      { screen: 'calculators', title: 'Calculer mon TDEE', subtitle: 'Formule Mifflin-St Jeor validée' }
    ]
  },

  {
    id: 'proteines-tef',
    category: 'NUTRITION',
    categoryColor: '#10B981',
    title: 'Protéines & TEF',
    readTime: 4,
    content: {
      what: 'TEF = Thermic Effect of Food. L\'énergie dépensée pour digérer les aliments. Les protéines ont le TEF le plus élevé : 20-30% de leur valeur calorique.',
      why: 'Pour 100 kcal de protéines consommées, tu n\'absorbes que 70-80 kcal net. En comparaison : glucides (5-10%), lipides (0-3%). Morton et al. (2018) recommandent 1.6-2.2g/kg pour optimiser la synthèse protéique musculaire en déficit calorique.',
      how: 'Vise 1.6-2.2g de protéines/kg de poids corporel par jour. Répartis sur 4-5 prises quotidiennes (25-40g par repas). Sources : viande maigre, poisson, œufs, légumineuses, whey.',
    },
    references: [
      {
        id: 1,
        author: 'Morton RW, Murphy KT, McKellar SR, et al.',
        year: 2018,
        title: 'A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults',
        journal: 'British Journal of Sports Medicine',
        volume: '52(6)',
        pages: '376-384',
        doi: '10.1136/bjsports-2017-097608',
        pubmedId: '28698222',
      },
      {
        id: 2,
        author: 'Westerterp KR',
        year: 2004,
        title: 'Diet induced thermogenesis',
        journal: 'Nutrition & Metabolism',
        volume: '1(1)',
        pages: '5',
        doi: '10.1186/1743-7075-1-5',
        pubmedId: '15507147',
      }
    ],
    actionLinks: []
  },

  // ═══════════════════════════════════════════════════════════
  // CATÉGORIE : RÉCUPÉRATION
  // ═══════════════════════════════════════════════════════════
  {
    id: 'sommeil-blessure',
    category: 'RÉCUPÉRATION',
    categoryColor: '#3B82F6',
    title: 'Sommeil & Risque de Blessure',
    readTime: 4,
    content: {
      what: 'Le sommeil est la période où ton corps se régénère : réparation musculaire, consolidation de la mémoire motrice, régulation hormonale. Sans lui, tu régresses.',
      why: 'Milewski et al. (2014) ont suivi 112 athlètes adolescents : ceux dormant < 8h/nuit avaient un risque de blessure 1.7× plus élevé. Le manque de sommeil élève le cortisol (catabolique) et inhibe l\'hormone de croissance (anabolique).',
      how: 'Vise 7-9h de sommeil par nuit, de préférence avant minuit. Chambre fraîche (16-19°C). Pas d\'écrans 60 min avant (lumière bleue). Routine constante (même heure de coucher/réveil).',
    },
    references: [
      {
        id: 1,
        author: 'Milewski MD, Skaggs DL, Bishop GA, et al.',
        year: 2014,
        title: 'Chronic lack of sleep is associated with increased sports injuries in adolescent athletes',
        journal: 'Journal of Pediatric Orthopaedics',
        volume: '34(2)',
        pages: '129-133',
        doi: '10.1097/BPO.0000000000000151',
        pubmedId: '25028798',
      },
      {
        id: 2,
        author: 'Vitale KC, Owens R, Hopkins SR, Malhotra A',
        year: 2019,
        title: 'Sleep Hygiene for Optimizing Recovery in Athletes',
        journal: 'International Journal of Sports Medicine',
        volume: '40(8)',
        pages: '535-543',
        doi: '10.1055/a-0905-3103',
        pubmedId: '31288293',
      }
    ],
    actionLinks: []
  },

  // ═══════════════════════════════════════════════════════════
  // CATÉGORIE : MÉTABOLISME
  // ═══════════════════════════════════════════════════════════
  {
    id: 'hydratation-thermo',
    category: 'MÉTABOLISME',
    categoryColor: '#F59E0B',
    title: 'Hydratation & Thermogenèse',
    readTime: 3,
    content: {
      what: 'L\'eau participe à presque toutes les réactions métaboliques. Une déshydratation de seulement 2% du poids corporel impacte déjà significativement les performances physiques et cognitives.',
      why: 'Boschmann et al. (2003) ont montré que boire 500ml d\'eau augmente le métabolisme de 30% pendant 30-40 minutes. L\'eau froide (4°C) a un effet thermogénique légèrement supérieur car le corps doit la réchauffer.',
      how: 'Minimum : 35ml/kg de poids corporel par jour (ex: 70kg = 2.5L). Ajoute 500-1000ml par heure d\'entraînement intense. Vérifie la couleur de tes urines : jaune pâle = hydratation optimale.',
    },
    references: [
      {
        id: 1,
        author: 'Boschmann M, Steiniger J, Hille U, et al.',
        year: 2003,
        title: 'Water-induced thermogenesis',
        journal: 'Journal of Clinical Endocrinology & Metabolism',
        volume: '88(12)',
        pages: '6015-6019',
        doi: '10.1210/jc.2003-030780',
        pubmedId: '14671205',
      }
    ],
    actionLinks: [
      { screen: 'hydration', title: 'Voir mon suivi hydratation', subtitle: 'Objectif quotidien et progression' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // CATÉGORIE : MENTAL
  // ═══════════════════════════════════════════════════════════
  {
    id: 'habitudes-66-jours',
    category: 'MENTAL',
    categoryColor: '#8B5CF6',
    title: 'La Règle des 66 Jours',
    readTime: 3,
    content: {
      what: 'Le temps moyen nécessaire pour qu\'un nouveau comportement devienne automatique. Ce n\'est PAS 21 jours (mythe populaire sans fondement scientifique).',
      why: 'Lally et al. (2010) ont suivi 96 personnes pendant 12 semaines. Résultat : en moyenne 66 jours pour atteindre l\'automaticité. La fourchette va de 18 à 254 jours selon la complexité de l\'habitude.',
      how: 'Commence petit (2 min d\'exercice suffit). Attache la nouvelle habitude à une existante (après le café du matin). Ne casse jamais la chaîne 2 jours de suite. Sois patient : les 3 premières semaines sont les plus difficiles.',
    },
    references: [
      {
        id: 1,
        author: 'Lally P, van Jaarsveld CHM, Potts HWW, Wardle J',
        year: 2010,
        title: 'How are habits formed: Modelling habit formation in the real world',
        journal: 'European Journal of Social Psychology',
        volume: '40(6)',
        pages: '998-1009',
        doi: '10.1002/ejsp.674',
      }
    ],
    actionLinks: []
  },
];

// Fonction helper pour obtenir les articles par catégorie
export const getArticlesByCategory = (category: string) => {
  return LAB_ARTICLES.filter(article => article.category === category);
};

// Fonction helper pour obtenir un article par ID
export const getArticleById = (id: string) => {
  return LAB_ARTICLES.find(article => article.id === id);
};
