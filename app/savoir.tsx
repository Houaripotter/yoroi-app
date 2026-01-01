import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  TouchableOpacity,
  Linking,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import logger from '@/lib/security/logger';
import {
  Heart,
  UtensilsCrossed,
  Bed,
  TrendingUp,
  Droplet,
  Activity,
  ChevronDown,
  ChevronUp,
  Scale,
  Wheat,
  Clock,
  Mountain,
  Footprints,
  Calculator,
  Dumbbell,
  Pill,
  Coffee,
  Flame,
  AlertTriangle,
  Maximize2,
} from 'lucide-react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ScienceCard {
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

interface ProtocolCard {
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

const scienceData: ScienceCard[] = [
  {
    id: '1',
    title: "La Marche Inclinée (LISS)",
    icon: "slope-uphill",
    category: "Cardio",
    content: {
      what: "Marcher sur un tapis avec une inclinaison (12-15%) à vitesse modérée (4-5 km/h).",
      why: "L'inclinaison augmente la dépense énergétique de +50% vs le plat sans l'impact articulaire de la course. Une étude prouve qu'elle recrute massivement la chaîne postérieure (fessiers/ischios) et élève le métabolisme post-effort.",
      how: "Protocole '12-3-30' ou variante : 12% de pente, 5 km/h, 30 min. Idéal en fin de séance musculation.",
      sourceName: "Étude : Ehlen et al. (2011) - J Strength Cond Res",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/21904245/"
    }
  },
  {
    id: '2',
    title: "Déficit Calorique : La Loi Physique",
    icon: "scale-balance",
    category: "Nutrition",
    content: {
      what: "Consommer moins d'énergie que ton corps n'en dépense. C'est la seule condition physiologique obligatoire pour perdre du gras.",
      why: "C'est la Première Loi de la Thermodynamique. Peu importe le régime (Keto, Jeûne, Paleo), s'il n'y a pas de déficit, il n'y a pas de perte de gras. Kevin Hall (NIH) a prouvé que c'est le bilan énergétique qui pilote le poids, pas l'insuline seule.",
      how: "Calcule ton maintien (TDEE) et retire 300 à 500 kcal. Ne descends jamais sous ton métabolisme de base (BMR).",
      sourceName: "Étude : Hall et al. (2017) - NIH / Am J Clin Nutr",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/28765272/"
    }
  },
  {
    id: '3',
    title: "La Zone 2 : Usine à Mitochondries",
    icon: "heart-pulse",
    category: "Endurance",
    content: {
      what: "L'intensité où le lactate reste stable (< 2 mmol/L). Tu peux tenir une conversation.",
      why: "C'est la seule zone qui améliore la 'flexibilité métabolique' : la capacité de tes cellules à utiliser le gras comme carburant principal. San Millán a prouvé que c'est le marqueur #1 de la santé métabolique.",
      how: "45-60 min en continu, 1 à 2 fois/semaine. Reste strict : si tu es essoufflé, tu perds les bénéfices mitochondriaux.",
      sourceName: "Étude : San Millán & Brooks (2018) - Cell Metab",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/29283004/"
    }
  },
  {
    id: '4',
    title: "Protéines & TEF",
    icon: "food-steak",
    category: "Nutrition",
    content: {
      what: "Le macronutriment bâtisseur.",
      why: "L'Effet Thermique (TEF) des protéines est de 20-30%. Pour 100kcal ingérées, 25 sont brûlées par la digestion (contre 3% pour le gras). De plus, elles sont les plus rassasiantes via la sécrétion de l'hormone PYY.",
      how: "Vise 1.6g à 2.2g par kg de poids. Une source à chaque repas.",
      sourceName: "Consensus : ISSN Position Stand (2017)",
      sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8"
    }
  },
  {
    id: '5',
    title: "Fibres : L'Ozempic Naturel",
    icon: "barley",
    category: "Nutrition",
    content: {
      what: "Glucides non digestibles présents dans les végétaux.",
      why: "Les fibres solubles gonflent dans l'estomac et déclenchent la libération de GLP-1 (l'hormone de satiété imitée par les médicaments). Elles nourrissent aussi le microbiote qui régule le poids.",
      how: "Mange 30g de fibres par jour (Légumes verts, avoine, graines de chia, pommes). Mange tes légumes en premier dans le repas.",
      sourceName: "Recherche : Slavin (2005) - Nutrition",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/15797686/"
    }
  },
  {
    id: '6',
    title: "Sommeil & Risque de Blessure",
    icon: "bed-clock",
    category: "Récupération",
    content: {
      what: "Le pilier oublié de la performance.",
      why: "Dormir < 8h augmente le risque de blessure de 1.7x. Le manque de sommeil élève le cortisol (catabolique) et bloque l'hormone de croissance. C'est pendant la nuit que le gras s'oxyde et le muscle se répare.",
      how: "Chambre fraîche (18°C). Pas d'écrans 1h avant (lumière bleue bloque la mélatonine).",
      sourceName: "Étude : Milewski et al. (2014) - J Pediatr Orthop",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/25028798/"
    }
  },
  {
    id: '7',
    title: "Hydratation & Thermogenèse",
    icon: "water",
    category: "Métabolisme",
    content: {
      what: "L'impact de l'eau sur la dépense énergétique.",
      why: "Boire 500ml d'eau augmente le métabolisme de 30% pendant l'heure qui suit (thermogenèse induite par l'eau). Une déshydratation de 2% baisse les performances de 10-20%.",
      how: "Bois 500ml d'eau dès le réveil. Bois 1 verre avant chaque repas.",
      sourceName: "Étude : Boschmann et al. (2003) - JCEM",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/14671205/"
    }
  },
  {
    id: '8',
    title: "NEAT : L'Activité Invisible",
    icon: "walk",
    category: "Activité",
    content: {
      what: "Non-Exercise Activity Thermogenesis (Activité hors sport).",
      why: "Le Dr Levine a prouvé que la différence entre une personne mince et en surpoids réside souvent dans ces 2h de mouvement inconscient par jour. C'est 500 à 800 kcal 'gratuites'.",
      how: "Téléphone debout. Gare-toi loin. Prends les escaliers. Vise 8000 pas hors séance.",
      sourceName: "Recherche : Levine (2002) - Science",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/12468415/"
    }
  },
  {
    id: '9',
    title: "Entraînement en Force & Longévité",
    icon: "dumbbell",
    category: "Force",
    content: {
      what: "La musculation 2-3 fois par semaine augmente l'espérance de vie.",
      why: "Une méta-analyse de 2022 montre que l'entraînement en force réduit la mortalité toutes causes de 15%. Il préserve la masse musculaire (sarcopénie) et améliore la sensibilité à l'insuline.",
      how: "2 séances minimum par semaine. Travaille tous les groupes musculaires. 3 séries de 8-12 répétitions.",
      sourceName: "Méta-analyse : Momma et al. (2022) - Br J Sports Med",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/35228201/"
    }
  },
  {
    id: '10',
    title: "Créatine : Le Supplément #1",
    icon: "supplement",
    category: "Supplémentation",
    content: {
      what: "Composé naturel présent dans la viande, améliore la production d'ATP.",
      why: "C'est le supplément le plus étudié et efficace. +5-15% de force, +2kg de muscle en 8 semaines, améliore la cognition. Plus de 1000 études confirment son efficacité et sa sécurité.",
      how: "5g par jour, tous les jours. Monohydrate (la forme la moins chère est la meilleure). Pas besoin de phase de charge.",
      sourceName: "Position Stand : ISSN (2017) - J Int Soc Sports Nutr",
      sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0173-z"
    }
  },
  {
    id: '11',
    title: "Repos Inter-Séries : La Durée Compte",
    icon: "clock",
    category: "Force",
    content: {
      what: "Le temps de repos entre les séries influence l'hypertrophie.",
      why: "Schoenfeld a démontré que 3 minutes de repos = +20% de gains musculaires vs 1 minute. Le repos permet la restauration des phosphocréatines et maintient l'intensité.",
      how: "Force (1-5 reps) : 3-5 min. Hypertrophie (8-12 reps) : 2-3 min. Endurance (15+ reps) : 1-2 min.",
      sourceName: "Étude : Schoenfeld et al. (2016) - J Strength Cond Res",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/26605807/"
    }
  },
  {
    id: '12',
    title: "Timing Protéines : Le Mythe de la Fenêtre",
    icon: "food-steak",
    category: "Nutrition",
    content: {
      what: "La 'fenêtre anabolique' post-training est surestimée.",
      why: "Aragon & Schoenfeld montrent que le TOTAL protéique quotidien compte plus que le timing. La fenêtre est en réalité de 4-6h, pas 30 minutes.",
      how: "Assure ton quota journalier (1.6-2.2g/kg). Répartis sur 3-4 repas. Le shake post-training n'est pas obligatoire.",
      sourceName: "Review : Aragon & Schoenfeld (2013) - J Int Soc Sports Nutr",
      sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/1550-2783-10-5"
    }
  },
  {
    id: '13',
    title: "Récupération Active vs Passive",
    icon: "activity",
    category: "Récupération",
    content: {
      what: "Bouger légèrement entre les séances accélère la récupération.",
      why: "La récupération active (marche, vélo léger) augmente le flux sanguin et élimine le lactate 2x plus vite que rester assis. Réduit les courbatures (DOMS) de 30%.",
      how: "Jour de repos = 20-30 min de marche ou vélo très léger (Zone 1). Évite le repos total complet.",
      sourceName: "Étude : Menzies et al. (2010) - Sports Med",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/20199122/"
    }
  },
  {
    id: '14',
    title: "Étirements : Quand et Comment",
    icon: "stretch",
    category: "Mobilité",
    content: {
      what: "Les étirements statiques avant l'effort réduisent la force.",
      why: "Behm a prouvé que s'étirer avant diminue la production de force de 5-8%. Par contre, après l'effort, ils améliorent la récupération et la flexibilité.",
      how: "Avant : échauffement dynamique. Après : étirements statiques (30s par muscle). Ou session dédiée mobilité.",
      sourceName: "Review : Behm & Blazevich (2011) - Scand J Med Sci Sports",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/21410544/"
    }
  },
  {
    id: '15',
    title: "Masse Musculaire & Métabolisme au Repos",
    icon: "muscle",
    category: "Force",
    content: {
      what: "Le muscle brûle des calories même au repos.",
      why: "1 kg de muscle brûle ~13 kcal/jour vs 4 kcal pour la graisse. Gagner 5kg de muscle = +65 kcal/jour soit 24 000 kcal/an (3kg de gras potentiels).",
      how: "Programme force 3x/semaine. Surplus calorique modéré (+200-300 kcal). Patience : 0.5-1kg muscle/mois max.",
      sourceName: "Recherche : Wang et al. (2010) - Am J Clin Nutr",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/20200263/"
    }
  },
  {
    id: '16',
    title: "Café & Performance",
    icon: "coffee",
    category: "Performance",
    content: {
      what: "La caféine est l'ergogène légal le plus puissant.",
      why: "3-6 mg/kg de caféine augmente la performance de 3-7% (endurance, force, sprint). Bloque l'adénosine = moins de fatigue perçue.",
      how: "200-400mg (2-4 expressos) 45-60 min avant l'effort. Évite si sensible ou entraînement soir.",
      sourceName: "Position Stand : ISSN (2021) - J Int Soc Sports Nutr",
      sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/s12970-020-00383-4"
    }
  },
  {
    id: '17',
    title: "Progression : Surcharge Progressive",
    icon: "trending-up",
    category: "Force",
    content: {
      what: "Le principe fondamental de tous les gains en force et masse.",
      why: "Sans augmentation du stimulus (poids, reps, volume), le muscle s'adapte et stagne. La surcharge est LA loi de l'adaptation musculaire.",
      how: "Chaque semaine : ajoute 1-2 reps OU +2.5kg OU 1 série supplémentaire. Tiens un carnet d'entraînement.",
      sourceName: "Principe : Kraemer & Ratamess (2004) - Med Sci Sports Exerc",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/15064596/"
    }
  },
  {
    id: '18',
    title: "Cortisol & Stress Chronique",
    icon: "stress",
    category: "Récupération",
    content: {
      what: "L'hormone du stress détruit le muscle si elle reste élevée.",
      why: "Le cortisol chroniquement élevé bloque la testostérone, augmente le stockage abdominal et freine la récupération. C'est l'ennemi #1 de la composition corporelle.",
      how: "Dors 8h. Médite 10 min/jour. Limite le cardio excessif. Prends des jours OFF complets.",
      sourceName: "Étude : Epel et al. (2000) - Psychosom Med",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/11020090/"
    }
  },
];

const protocolData: ProtocolCard[] = [
  {
    id: 'p1',
    title: "Tabata HIIT (4 minutes)",
    icon: "activity",
    category: "Cardio",
    difficulty: 'Intermédiaire',
    content: {
      objective: "Brûler un maximum de calories en 4 minutes et booster le métabolisme pour 24h.",
      duration: "4 minutes",
      protocol: [
        "Choisis un exercice (burpees, sprints, vélo, rameur)",
        "20 secondes ALL-OUT (intensité maximale)",
        "10 secondes de repos",
        "Répète 8 fois (= 4 minutes)",
        "Retour au calme : 2-3 min de marche"
      ],
      frequency: "2-3x par semaine (pas de jours consécutifs)",
      notes: "⚠️ Nécessite une bonne condition physique. Échauffement obligatoire 5-10 min."
    }
  },
  {
    id: 'p2',
    title: "5×5 Stronglifts (Force)",
    icon: "dumbbell",
    category: "Force",
    difficulty: 'Débutant',
    content: {
      objective: "Gagner en force pure avec un programme simple et progressif.",
      duration: "45-60 minutes",
      protocol: [
        "Séance A : Squat 5×5, Bench Press 5×5, Rowing Barre 5×5",
        "Séance B : Squat 5×5, Overhead Press 5×5, Deadlift 1×5",
        "Alterner A/B/A puis B/A/B chaque semaine",
        "Repos 3-5 min entre les séries",
        "Ajoute +2.5kg chaque séance réussie"
      ],
      frequency: "3x par semaine (Lun/Mer/Ven)",
      notes: "Parfait pour débutants. Focus sur la technique avant de charger lourd."
    }
  },
  {
    id: 'p3',
    title: "12-3-30 Marche Inclinée",
    icon: "slope-uphill",
    category: "Cardio",
    difficulty: 'Débutant',
    content: {
      objective: "Cardio faible impact pour brûler du gras sans détruire les articulations.",
      duration: "30 minutes",
      protocol: [
        "Tapis de course : 12% d'inclinaison",
        "Vitesse : 5 km/h (3 mph)",
        "Durée : 30 minutes en continu",
        "Garde le dos droit, ne te tiens pas à la barre",
        "Tu dois pouvoir tenir une conversation"
      ],
      frequency: "4-5x par semaine (ou après musculation)",
      notes: "Populaire sur TikTok. Très efficace pour sécher sans perdre de muscle."
    }
  },
  {
    id: 'p4',
    title: "PPL (Push/Pull/Legs)",
    icon: "muscle",
    category: "Force",
    difficulty: 'Intermédiaire',
    content: {
      objective: "Programme complet pour hypertrophie musculaire équilibrée.",
      duration: "60-75 minutes",
      protocol: [
        "PUSH : Pectoraux, Épaules, Triceps (8-12 reps)",
        "PULL : Dos, Trapèzes, Biceps (8-12 reps)",
        "LEGS : Quadriceps, Ischio, Mollets, Abdos (8-15 reps)",
        "3-4 exercices par groupe musculaire",
        "3-4 séries par exercice, 2-3 min de repos"
      ],
      frequency: "6x par semaine (PPL/PPL) ou 3x (P/P/L)",
      notes: "Excellent pour gagner du volume. Nécessite une bonne récupération."
    }
  },
  {
    id: 'p5',
    title: "Zone 2 Cardio (Mitochondries)",
    icon: "heart-pulse",
    category: "Endurance",
    difficulty: 'Débutant',
    content: {
      objective: "Améliorer la capacité à brûler les graisses et la santé métabolique.",
      duration: "45-60 minutes",
      protocol: [
        "Trouve ton seuil : tu peux parler en phrases complètes",
        "Fréquence cardiaque : 60-70% de ta FC max",
        "Reste STRICT sur l'intensité (pas plus haut)",
        "Course, vélo, rameur, natation",
        "Respiration nasale uniquement (test)"
      ],
      frequency: "1-2x par semaine",
      notes: "C'est l'entraînement préféré des athlètes d'endurance pour la base aérobie."
    }
  },
  {
    id: 'p6',
    title: "Récupération Active",
    icon: "walk",
    category: "Récupération",
    difficulty: 'Débutant',
    content: {
      objective: "Accélérer la récupération musculaire entre les séances intenses.",
      duration: "20-30 minutes",
      protocol: [
        "Marche tranquille ou vélo très léger",
        "Intensité : Zone 1 (50-60% FC max)",
        "Ajoute des étirements dynamiques (5-10 min)",
        "Foam roller sur les zones tendues",
        "Mobilité articulaire (hanches, épaules)"
      ],
      frequency: "Jours de repos entre les séances",
      notes: "Ne sous-estime pas l'importance du repos actif pour les gains à long terme."
    }
  },
  {
    id: 'p7',
    title: "Échauffement Dynamique Complet",
    icon: "stretch",
    category: "Mobilité",
    difficulty: 'Débutant',
    content: {
      objective: "Préparer le corps à l'effort et réduire le risque de blessure.",
      duration: "10-15 minutes",
      protocol: [
        "Cardio léger : 3-5 min (vélo, rameur, corde à sauter)",
        "Mobilité articulaire : cercles bras/jambes (2 min)",
        "Étirements dynamiques : fentes marchées, leg swings (3 min)",
        "Activation musculaire : bandes élastiques (2 min)",
        "Sets d'approche : 50% puis 70% du poids de travail"
      ],
      frequency: "AVANT chaque séance",
      notes: "❌ PAS d'étirements statiques avant l'effort (diminue la force de 5-8%)."
    }
  },
  {
    id: 'p8',
    title: "Étirements Post-Training",
    icon: "stretch",
    category: "Mobilité",
    difficulty: 'Débutant',
    content: {
      objective: "Améliorer la flexibilité et accélérer la récupération musculaire.",
      duration: "10-15 minutes",
      protocol: [
        "Attends 5-10 min après la fin de la séance",
        "Étirements statiques : 30-60 secondes par muscle",
        "Cible les groupes travaillés dans la séance",
        "Respire profondément, ne force pas",
        "Focus : ischios, fléchisseurs hanches, pectoraux, dorsaux"
      ],
      frequency: "APRÈS chaque séance",
      notes: "Les étirements post-effort réduisent les courbatures de ~30%."
    }
  },
  {
    id: 'p9',
    title: "Jeûne Intermittent 16/8",
    icon: "clock",
    category: "Nutrition",
    difficulty: 'Intermédiaire',
    content: {
      objective: "Simplifier l'alimentation et créer un déficit calorique naturel.",
      duration: "Continu",
      protocol: [
        "Fenêtre de jeûne : 16 heures (ex: 20h - 12h)",
        "Fenêtre alimentaire : 8 heures (ex: 12h - 20h)",
        "Première semaine : commence par 14h de jeûne",
        "Pendant le jeûne : eau, thé, café noir (sans sucre)",
        "Casse le jeûne avec des protéines + légumes"
      ],
      frequency: "5-7 jours par semaine",
      notes: "⚠️ Consulte un médecin si tu as des problèmes de santé. Hydrate-toi bien."
    }
  },
  {
    id: 'p10',
    title: "Hydratation Pré/Per/Post Training",
    icon: "water",
    category: "Performance",
    difficulty: 'Débutant',
    content: {
      objective: "Optimiser la performance et la récupération par une hydratation stratégique.",
      duration: "Toute la journée",
      protocol: [
        "PRÉ-TRAINING : 500ml d'eau 2h avant + 250ml juste avant",
        "PER-TRAINING : 150-250ml toutes les 15-20 min",
        "POST-TRAINING : 1.5L par kg de poids perdu",
        "Ajoute une pincée de sel si séance > 60 min",
        "Urine claire = bien hydraté, jaune foncé = déshydraté"
      ],
      frequency: "À chaque séance",
      notes: "2% de déshydratation = -10 à 20% de performance. Ne sous-estime pas l'eau."
    }
  },
  {
    id: 'p11',
    title: "EMOM (Every Minute On the Minute)",
    icon: "clock",
    category: "Force",
    difficulty: 'Avancé',
    content: {
      objective: "Développer force, puissance et capacité de travail sous fatigue.",
      duration: "10-20 minutes",
      protocol: [
        "Choisis 1-3 exercices (ex: thrusters, pull-ups, box jumps)",
        "Définis un nombre de reps (ex: 10 thrusters)",
        "Démarre le chrono : fais tes reps en début de minute",
        "Repose-toi le temps restant",
        "Chaque nouvelle minute = nouvelle série",
        "Continue pendant 10-20 min"
      ],
      frequency: "1-2x par semaine",
      notes: "Si tu ne peux plus finir dans la minute, arrête-toi. Très intense."
    }
  },
  {
    id: 'p12',
    title: "Pyramid Training (Hypertrophie)",
    icon: "trending-up",
    category: "Force",
    difficulty: 'Intermédiaire',
    content: {
      objective: "Maximiser l'hypertrophie en combinant force et volume.",
      duration: "Par exercice",
      protocol: [
        "Série 1 : 12 reps à 60% 1RM",
        "Série 2 : 10 reps à 70% 1RM",
        "Série 3 : 8 reps à 80% 1RM",
        "Série 4 : 6 reps à 85% 1RM",
        "Redescends : 8 reps → 10 reps → 12 reps",
        "Repos : 2-3 min entre séries"
      ],
      frequency: "1 exercice majeur par séance",
      notes: "Excellent pour casser la routine et choquer le muscle."
    }
  }
];

const getIcon = (iconName: string, size: number = 24, color: string) => {
  switch (iconName) {
    case 'heart-pulse':
      return <Heart size={size} color={color} strokeWidth={2.5} />;
    case 'food-steak':
      return <UtensilsCrossed size={size} color={color} strokeWidth={2.5} />;
    case 'bed':
    case 'bed-clock':
      return <Bed size={size} color={color} strokeWidth={2.5} />;
    case 'trending-up':
      return <TrendingUp size={size} color={color} strokeWidth={2.5} />;
    case 'slope-uphill':
      return <Mountain size={size} color={color} strokeWidth={2.5} />;
    case 'scale':
    case 'scale-balance':
      return <Scale size={size} color={color} strokeWidth={2.5} />;
    case 'wheat':
    case 'barley':
      return <Wheat size={size} color={color} strokeWidth={2.5} />;
    case 'water':
      return <Droplet size={size} color={color} strokeWidth={2.5} />;
    case 'activity':
      return <Activity size={size} color={color} strokeWidth={2.5} />;
    case 'walk':
      return <Footprints size={size} color={color} strokeWidth={2.5} />;
    case 'clock':
      return <Clock size={size} color={color} strokeWidth={2.5} />;
    case 'dumbbell':
      return <Dumbbell size={size} color={color} strokeWidth={2.5} />;
    case 'supplement':
      return <Pill size={size} color={color} strokeWidth={2.5} />;
    case 'coffee':
      return <Coffee size={size} color={color} strokeWidth={2.5} />;
    case 'muscle':
      return <Flame size={size} color={color} strokeWidth={2.5} />;
    case 'stress':
      return <AlertTriangle size={size} color={color} strokeWidth={2.5} />;
    case 'stretch':
      return <Maximize2 size={size} color={color} strokeWidth={2.5} />;
    default:
      return <Activity size={size} color={color} strokeWidth={2.5} />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Cardio':
    case 'Endurance':
      return '#FF6B9D'; // Light Red/Pink
    case 'Nutrition':
      return '#90EE90'; // Light Green
    case 'Récupération':
      return '#87CEEB'; // Light Blue (Sleep)
    case 'Métabolisme':
      return '#DDA0DD'; // Light Purple
    case 'Activité':
      return '#FFD700'; // Light Gold/Yellow
    case 'Force':
      return '#FF4500'; // Orange Red
    case 'Supplémentation':
      return '#32CD32'; // Lime Green
    case 'Performance':
      return '#FF1493'; // Deep Pink
    case 'Mobilité':
      return '#00CED1'; // Dark Turquoise
    default:
      return '#D3D3D3'; // Light Gray
  }
};

const getCategoryHeaderColor = (category: string) => {
  switch (category) {
    case 'Cardio':
    case 'Endurance':
      return '#FFE4E1'; // Light Red/Pink background
    case 'Nutrition':
      return '#E8F5E9'; // Light Green background
    case 'Récupération':
      return '#E3F2FD'; // Light Blue background
    case 'Métabolisme':
      return '#F3E5F5'; // Light Purple background
    case 'Activité':
      return '#FFF9C4'; // Light Yellow background
    case 'Force':
      return '#FFE4CC'; // Light Orange background
    case 'Supplémentation':
      return '#E5FFE5'; // Light Lime Green background
    case 'Performance':
      return '#FFE4F2'; // Light Pink background
    case 'Mobilité':
      return '#E0F7FA'; // Light Turquoise background
    default:
      return '#F5F5F5'; // Light Gray background
  }
};

const getDifficultyColor = (difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé') => {
  switch (difficulty) {
    case 'Débutant':
      return '#10B981'; // Green
    case 'Intermédiaire':
      return '#F59E0B'; // Orange
    case 'Avancé':
      return '#EF4444'; // Red
  }
};

export default function SavoirScreen() {
  const router = useRouter();
  const { colors: themeColors, isDark } = useTheme();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(new Set());

  const toggleCard = (cardId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const toggleProtocol = (protocolId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedProtocols((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(protocolId)) {
        newSet.delete(protocolId);
      } else {
        newSet.add(protocolId);
      }
      return newSet;
    });
  };

  const handleSourcePress = async (url: string) => {
    try {
      // Clean URL from markdown format if present
      const cleanUrl = url.replace(/\[([^\]]+)\]\(([^)]+)\)/, '$2');
      const canOpen = await Linking.canOpenURL(cleanUrl);
      if (canOpen) {
        await Linking.openURL(cleanUrl);
      } else {
        logger.error('Impossible d\'ouvrir l\'URL:', cleanUrl);
      }
    } catch (error) {
      logger.error('Erreur lors de l\'ouverture de l\'URL:', error);
    }
  };

  return (
    <ScreenWrapper noPadding>
      <Header title="SAVOIR" showBack />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: themeColors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header description */}
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Outils cliniques & Base de donnees scientifique
          </Text>
        </View>

        {/* SECTION 1: OUTILS CLINIQUES */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>OUTILS CLINIQUES</Text>
          
          <TouchableOpacity
            style={styles.clinicalToolCard}
            onPress={() => router.push('/calculator' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.clinicalToolContent}>
              <View style={styles.clinicalToolIconContainer}>
                <Calculator size={28} color="#1F2937" strokeWidth={2.5} />
              </View>
              <View style={styles.clinicalToolText}>
                <Text style={styles.clinicalToolTitle}>Calculateur Métabolique</Text>
                <Text style={styles.clinicalToolSubtitle}>BMR & TDEE (Mifflin-St Jeor)</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION 2: BASE DE DONNÉES */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>BASE DE DONNÉES</Text>
          
          {/* Scientific Cards - Accordion */}
          <View style={styles.cardsContainer}>
          {scienceData.map((card) => {
            const categoryColor = getCategoryColor(card.category);
            const isExpanded = expandedCards.has(card.id);
            
            const headerBgColor = getCategoryHeaderColor(card.category);
            
            return (
              <View key={card.id} style={[styles.card, { backgroundColor: '#FFFFFF' }]}>
                {/* Header with Colored Background */}
                <TouchableOpacity
                  style={[styles.cardHeaderButton, { backgroundColor: headerBgColor }]}
                  onPress={() => toggleCard(card.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconContainer, { backgroundColor: '#FFFFFF' }]}>
                      {getIcon(card.icon, 24, categoryColor)}
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={[styles.cardCategory, { color: categoryColor }]}>
                        {card.category}
                      </Text>
                      <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
                        {card.title}
                      </Text>
                    </View>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={20} color={categoryColor} strokeWidth={2.5} />
                  ) : (
                    <ChevronDown size={20} color={categoryColor} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>

                {/* Expanded Content - White Background */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {/* C'est quoi ? */}
                    <View style={styles.sectionFirst}>
                      <Text style={[styles.cardSectionHeader, { color: categoryColor }]}>C'est quoi ?</Text>
                      <Text style={[styles.sectionBody, { color: themeColors.textSecondary }]}>
                        {card.content.what}
                      </Text>
                    </View>

                    {/* Pourquoi ça marche ? */}
                    <View style={styles.section}>
                      <Text style={[styles.cardSectionHeader, { color: categoryColor }]}>Pourquoi ça marche ?</Text>
                      <Text style={[styles.sectionBody, { color: themeColors.textSecondary }]}>
                        {card.content.why}
                      </Text>
                    </View>

                    {/* Comment l'appliquer ? */}
                    <View style={styles.section}>
                      <Text style={[styles.cardSectionHeader, { color: categoryColor }]}>Comment l'appliquer ?</Text>
                      <Text style={[styles.sectionBody, { color: themeColors.textSecondary }]}>
                        {card.content.how}
                      </Text>
                    </View>

                    {/* LA SOURCE */}
                    <TouchableOpacity
                      style={[styles.sourceButton, { backgroundColor: `${categoryColor}15` }]}
                      onPress={() => handleSourcePress(card.content.sourceUrl)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.sourceButtonText, { color: categoryColor }]}>
                        {card.content.sourceName}
                      </Text>
                      <Text style={[styles.sourceButtonArrow, { color: categoryColor }]}>→</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          </View>
        </View>

        {/* SECTION 3: PROTOCOLES D'ENTRAÎNEMENT */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>PROTOCOLES D'ENTRAÎNEMENT</Text>

          {/* Protocol Cards - Accordion */}
          <View style={styles.cardsContainer}>
          {protocolData.map((protocol) => {
            const categoryColor = getCategoryColor(protocol.category);
            const isExpanded = expandedProtocols.has(protocol.id);
            const headerBgColor = getCategoryHeaderColor(protocol.category);
            const difficultyColor = getDifficultyColor(protocol.difficulty);

            return (
              <View key={protocol.id} style={[styles.card, { backgroundColor: '#FFFFFF' }]}>
                {/* Header with Colored Background */}
                <TouchableOpacity
                  style={[styles.cardHeaderButton, { backgroundColor: headerBgColor }]}
                  onPress={() => toggleProtocol(protocol.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconContainer, { backgroundColor: '#FFFFFF' }]}>
                      {getIcon(protocol.icon, 24, categoryColor)}
                    </View>
                    <View style={styles.cardHeaderText}>
                      <View style={styles.protocolHeaderRow}>
                        <Text style={[styles.cardCategory, { color: categoryColor }]}>
                          {protocol.category}
                        </Text>
                        <View style={[styles.difficultyBadge, { backgroundColor: `${difficultyColor}20` }]}>
                          <Text style={[styles.difficultyText, { color: difficultyColor }]}>
                            {protocol.difficulty}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
                        {protocol.title}
                      </Text>
                    </View>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={20} color={categoryColor} strokeWidth={2.5} />
                  ) : (
                    <ChevronDown size={20} color={categoryColor} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>

                {/* Expanded Content - White Background */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {/* Objectif */}
                    <View style={styles.sectionFirst}>
                      <Text style={[styles.cardSectionHeader, { color: categoryColor }]}>Objectif</Text>
                      <Text style={[styles.sectionBody, { color: themeColors.textSecondary }]}>
                        {protocol.content.objective}
                      </Text>
                    </View>

                    {/* Durée */}
                    <View style={styles.section}>
                      <Text style={[styles.cardSectionHeader, { color: categoryColor }]}>Durée</Text>
                      <Text style={[styles.sectionBody, { color: themeColors.textSecondary }]}>
                        {protocol.content.duration}
                      </Text>
                    </View>

                    {/* Protocole */}
                    <View style={styles.section}>
                      <Text style={[styles.cardSectionHeader, { color: categoryColor }]}>Protocole</Text>
                      {protocol.content.protocol.map((step, index) => (
                        <View key={index} style={styles.protocolStep}>
                          <Text style={[styles.stepNumber, { color: categoryColor }]}>
                            {index + 1}.
                          </Text>
                          <Text style={[styles.stepText, { color: themeColors.textSecondary }]}>
                            {step}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Fréquence */}
                    <View style={styles.section}>
                      <Text style={[styles.cardSectionHeader, { color: categoryColor }]}>Fréquence</Text>
                      <Text style={[styles.sectionBody, { color: themeColors.textSecondary }]}>
                        {protocol.content.frequency}
                      </Text>
                    </View>

                    {/* Notes */}
                    <View style={[styles.notesBox, { backgroundColor: `${categoryColor}10`, borderColor: `${categoryColor}30` }]}>
                      <Text style={[styles.notesText, { color: themeColors.textSecondary }]}>
                        {protocol.content.notes}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    gap: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    borderRadius: 28,
    padding: 0,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    flex: 1,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeaderText: {
    flex: 1,
    gap: 4,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  sectionFirst: {
    marginTop: 0,
  },
  section: {
    marginTop: 24,
  },
  cardSectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  sourceButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
  },
  sourceButtonArrow: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 40,
  },
  disclaimerBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#424242',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  disclaimerBold: {
    fontWeight: '800',
    color: '#212121',
    fontSize: 15,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  clinicalToolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  clinicalToolContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clinicalToolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clinicalToolText: {
    flex: 1,
    gap: 4,
  },
  clinicalToolTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  clinicalToolSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  protocolHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  protocolStep: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  stepNumber: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 24,
    minWidth: 20,
  },
  stepText: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.1,
    fontWeight: '500',
    flex: 1,
  },
  notesBox: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.1,
    fontWeight: '600',
  },
});
