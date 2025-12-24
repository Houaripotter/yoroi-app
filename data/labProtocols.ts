// Protocoles scientifiques actionnables avec checklist

export interface ProtocolItem {
  text: string;
  source: string | null;
}

export interface ProtocolReference {
  author: string;
  year: number;
  journal: string;
  doi: string;
}

export interface LabProtocol {
  id: string;
  title: string;
  category: 'ENTRAÎNEMENT' | 'NUTRITION' | 'RÉCUPÉRATION' | 'PERFORMANCE';
  categoryColor: string;
  items: ProtocolItem[];
  references: ProtocolReference[];
}

export const LAB_PROTOCOLS: LabProtocol[] = [
  {
    id: 'pre-sommeil',
    title: 'PROTOCOLE PRÉ-SOMMEIL',
    category: 'RÉCUPÉRATION',
    categoryColor: '#3B82F6',
    items: [
      { text: 'Température chambre entre 16-19°C', source: 'Okamoto-Mizuno, 2012' },
      { text: 'Arrêt des écrans 60 min avant coucher (lumière bleue)', source: 'Chang et al., 2015' },
      { text: 'Dernière prise de caféine > 6h avant', source: 'Drake et al., 2013' },
      { text: 'Dîner terminé > 2-3h avant coucher', source: 'Kinsey & Ormsbee, 2015' },
      { text: 'Éviter l\'alcool (perturbe le sommeil profond)', source: 'Ebrahim et al., 2013' },
      { text: '5-10 min de respiration diaphragmatique ou méditation', source: 'Black et al., 2015' },
    ],
    references: [
      { author: 'Milewski et al.', year: 2014, journal: 'J Pediatr Orthop', doi: '10.1097/BPO.0000000000000151' },
      { author: 'Chang et al.', year: 2015, journal: 'PNAS', doi: '10.1073/pnas.1418490112' },
      { author: 'Drake et al.', year: 2013, journal: 'J Clin Sleep Med', doi: '10.5664/jcsm.3170' },
    ]
  },

  {
    id: 'jour-competition',
    title: 'PROTOCOLE JOUR DE COMPÉTITION',
    category: 'PERFORMANCE',
    categoryColor: '#EF4444',
    items: [
      { text: 'Dernier repas solide 3-4h avant la compétition', source: 'Thomas et al., 2016' },
      { text: 'Hydratation : 5-7ml/kg dans les 4h précédentes', source: 'ACSM Position Stand, 2007' },
      { text: 'Échauffement progressif 15-20 min (aérobie léger)', source: 'McGowan et al., 2015' },
      { text: 'Activation musculaire spécifique au sport', source: null },
      { text: 'Routine de visualisation mentale 5 min', source: 'Cumming & Williams, 2013' },
      { text: 'Dernière prise de glucides 30-60 min avant (si endurance)', source: 'Jeukendrup, 2014' },
    ],
    references: [
      { author: 'Thomas et al.', year: 2016, journal: 'J Acad Nutr Diet', doi: '10.1016/j.jand.2015.12.006' },
      { author: 'ACSM', year: 2007, journal: 'Med Sci Sports Exerc', doi: '10.1249/mss.0b013e31802ca597' },
    ]
  },

  {
    id: 'recup-post-seance',
    title: 'PROTOCOLE RÉCUPÉRATION POST-SÉANCE',
    category: 'RÉCUPÉRATION',
    categoryColor: '#3B82F6',
    items: [
      { text: 'Réhydratation : 1.5L par kg de poids perdu', source: 'Shirreffs et al., 2004' },
      { text: 'Protéines : 20-40g dans les 2h post-effort', source: 'Morton et al., 2018' },
      { text: 'Glucides : uniquement si re-compétition < 24h', source: 'Burke et al., 2011' },
      { text: 'Étirements légers ou mobilité 5-10 min', source: null },
      { text: 'Bain froid/contraste (si entraînement intense)', source: 'Versey et al., 2013' },
      { text: 'Coucher avant 23h pour maximiser GH nocturne', source: 'Van Cauter et al., 2000' },
    ],
    references: [
      { author: 'Shirreffs et al.', year: 2004, journal: 'J Sports Sci', doi: '10.1080/0264041031000140590' },
      { author: 'Morton et al.', year: 2018, journal: 'Br J Sports Med', doi: '10.1136/bjsports-2017-097608' },
    ]
  },

  {
    id: 'deload-week',
    title: 'PROTOCOLE SEMAINE DE DÉCHARGE',
    category: 'ENTRAÎNEMENT',
    categoryColor: '#EF4444',
    items: [
      { text: 'Réduire le volume total de 40-60% (séries × répétitions)', source: 'Zourdos et al., 2016' },
      { text: 'Maintenir l\'intensité (charges) à 70-80% du max', source: null },
      { text: 'Fréquence : 2-3 séances max dans la semaine', source: null },
      { text: 'Focus sur la technique et la connexion neuromusculaire', source: null },
      { text: 'Privilégier le sommeil (objectif 8-9h)', source: null },
      { text: 'Planifier tous les 4-8 semaines selon fatigue', source: 'Pritchard et al., 2015' },
    ],
    references: [
      { author: 'Zourdos et al.', year: 2016, journal: 'Sports Med', doi: '10.1007/s40279-015-0413-5' },
      { author: 'Pritchard et al.', year: 2015, journal: 'J Strength Cond Res', doi: '10.1519/JSC.0000000000000765' },
    ]
  },
];

// Fonction helper pour obtenir un protocole par ID
export const getProtocolById = (id: string) => {
  return LAB_PROTOCOLS.find(protocol => protocol.id === id);
};

// Fonction helper pour obtenir les protocoles par catégorie
export const getProtocolsByCategory = (category: string) => {
  return LAB_PROTOCOLS.filter(protocol => protocol.category === category);
};
