// ============================================
// HEALTH RANGES - Plages de référence santé
// Basées sur des études scientifiques peer-reviewed
// ============================================

import { MetricRange } from '@/components/stats/charts/MetricRangeIndicator';
import { traduire } from '@/lib/i18n/tr';
import { selonGenre, type GenreFormule } from '@/lib/genreCalcul';

/** bornes neutres au centieme (moyenne exacte des reperes homme et femme) */
const centieme = (v: number) => Math.round(v * 100) / 100;
export { MetricRange } from '@/components/stats/charts/MetricRangeIndicator';

// Translation key type for i18n
export type HealthRangeTranslationKey =
  | 'bodyFat'
  | 'muscleMass'
  | 'waterPercentage'
  | 'visceralFat'
  | 'hrv'
  | 'restingHeartRate'
  | 'sleepDuration'
  | 'recoveryScore'
  | 'bmi'
  | 'waistCircumference'
  | 'boneMass'
  | 'bmr'
  | 'intensity';

// Extended MetricRange with translation key
export interface MetricRangeWithTranslation extends MetricRange {
  translationKey: HealthRangeTranslationKey;
  genderSpecific?: boolean;
  // BMR-specific values for translation interpolation
  bmrValues?: {
    bmrValue: number;
    weight: number;
    height: number;
    age: number;
    sedentary: number;
    lightlyActive: number;
    active: number;
    veryActive: number;
  };
}

// ============================================
// COMPOSITION CORPORELLE
// ============================================

export const BODY_FAT_RANGES_MALE: MetricRangeWithTranslation = {
  min: 3,
  max: 40,
  unit: '%',
  source: 'Gallagher D et al. Am J Clin Nutr 2000, PMID 10966886',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10966886/',
  translationKey: 'bodyFat',
  genderSpecific: true,
  explanation: traduire(`Le pourcentage de masse grasse mesure la proportion de graisse par rapport au poids total.

CLASSIFICATION (Gallagher et al. 2000, n=1626 sujets):
• 3 à 13% : Athlete, niveau competition
• 14 à 17% : Forme, excellente condition
• 18 à 24% : Moyen, population generale en bonne santé
• 25%+ : Eleve, risques metaboliques accrus

PREUVES SCIENTIFIQUES:
• >25% chez l'homme = risque diabete type 2 x2.5 (Prospective Studies Collaboration, Lancet 2009)
• <5% chronique = dysfonction hormonale, immunite affaiblie

PRECISION DES MESURES:
• Impedancemetrie: plus ou moins 3 à 5% d'erreur (Kyle et al. 2004)
• DEXA: plus ou moins 1 à 2% (reference clinique)

CONSEIL:
Suis la TENDANCE sur 4 à 8 semaines plutot que les variations quotidiennes.`),
  zones: [
    { label: 'athlete', start: 3, end: 13, color: '#22C55E', status: 'optimal' },
    { label: 'fit', start: 14, end: 17, color: '#EAB308', status: 'good' },
    { label: 'average', start: 18, end: 24, color: '#F97316', status: 'moderate' },
    { label: 'high', start: 25, end: 40, color: '#EF4444', status: 'attention' },
  ],
};

export const BODY_FAT_RANGES_FEMALE: MetricRangeWithTranslation = {
  min: 10,
  max: 45,
  unit: '%',
  source: 'Gallagher D et al. Am J Clin Nutr 2000, PMID 10966886',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10966886/',
  translationKey: 'bodyFat',
  genderSpecific: true,
  explanation: traduire(`Le pourcentage de masse grasse mesure la proportion de graisse par rapport au poids total.

CLASSIFICATION (Gallagher et al. 2000):
• 10 à 20% : Athlete, niveau competition
• 21 à 24% : Forme, excellente condition
• 25 à 31% : Moyen, population generale
• 32%+ : Eleve, risques metaboliques accrus

DIFFERENCE BIOLOGIQUE HOMMES/FEMMES:
Les femmes ont naturellement 8 à 12% de graisse de plus que les hommes (seins, hanches, reserve reproductive). C'est NORMAL et SAIN.

PREUVES SCIENTIFIQUES:
• <15% prolonge = amenorrhee, infertilite (Loucks AB, J Sports Sci 2004)
• >32% = risque diabete/cardiovasculaire augmente

CONSEIL:
Une perte de 0.5 à 1% par mois est un rythme sain et durable.`),
  zones: [
    { label: 'athlete', start: 10, end: 20, color: '#22C55E', status: 'optimal' },
    { label: 'fit', start: 21, end: 24, color: '#EAB308', status: 'good' },
    { label: 'average', start: 25, end: 31, color: '#F97316', status: 'moderate' },
    { label: 'high', start: 32, end: 45, color: '#EF4444', status: 'attention' },
  ],
};

export const MUSCLE_MASS_RANGES_MALE: MetricRangeWithTranslation = {
  min: 30,
  max: 60,
  unit: '%',
  source: 'Janssen I et al. J Appl Physiol 2000, PMID 10846039',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10846039/',
  translationKey: 'muscleMass',
  genderSpecific: true,
  explanation: traduire(`La masse musculaire squelettique (SMM) represente les muscles volontaires de ton corps.

CLASSIFICATION (Janssen et al. 2000, etude IRM sur 468 sujets):
• <38% : Faible, sarcopenie probable
• 38 à 44% : Normal, population sedentaire
• 44 à 52% : Bon, activité physique reguliere
• 52%+ : Excellent, niveau sportif

PREUVES SCIENTIFIQUES:
• +10% de masse musculaire = -11% risque de mortalite toutes causes (Srikanthan P, Am J Med 2016)
• Muscle = organe metabolique: secrete myokines anti inflammatoires
• Sensibilite a l'insuline correlee positivement

SARCOPENIE (Cruz Jentoft AJ, Lancet 2019):
Perte de 3 à 8% de muscle par decennie apres 30 ans.
La musculation est le traitement n°1 valide scientifiquement.

RECOMMANDATIONS (ACSM):
2 à 3 séances de musculation/semaine, tous les groupes musculaires.`),
  zones: [
    { label: 'low', start: 30, end: 38, color: '#EF4444', status: 'attention' },
    { label: 'normal', start: 39, end: 44, color: '#F97316', status: 'moderate' },
    { label: 'good', start: 45, end: 52, color: '#EAB308', status: 'good' },
    { label: 'excellent', start: 53, end: 60, color: '#22C55E', status: 'optimal' },
  ],
};

export const MUSCLE_MASS_RANGES_FEMALE: MetricRangeWithTranslation = {
  min: 25,
  max: 55,
  unit: '%',
  source: 'Janssen I et al. J Appl Physiol 2000, PMID 10846039',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10846039/',
  translationKey: 'muscleMass',
  genderSpecific: true,
  explanation: traduire(`La masse musculaire squelettique (SMM) represente les muscles volontaires de ton corps.

CLASSIFICATION (Janssen et al. 2000):
• <31% : Faible, sarcopenie probable
• 31 à 36% : Normal, population sedentaire
• 36 à 42% : Bon, activité physique reguliere
• 42%+ : Excellent, niveau sportif

DIFFERENCE BIOLOGIQUE:
Les femmes ont naturellement 30 à 40% moins de masse musculaire que les hommes (testosterone 10 à 20x plus basse). C'est NORMAL.

PREUVES SCIENTIFIQUES:
• Musculation = prevention osteoporose post menopause (Kohrt WM, Med Sci Sports 2004)
• Pas de "prise de volume" chez les femmes sans steroides
• Ameliore sensibilite insuline et metabolisme

RECOMMANDATIONS (ACSM):
2 à 3 séances de musculation/semaine. Les charges lourdes sont sures et efficaces.`),
  zones: [
    { label: 'low', start: 25, end: 33, color: '#EF4444', status: 'attention' },
    { label: 'normal', start: 34, end: 39, color: '#F97316', status: 'moderate' },
    { label: 'good', start: 40, end: 46, color: '#EAB308', status: 'good' },
    { label: 'excellent', start: 47, end: 55, color: '#22C55E', status: 'optimal' },
  ],
};

export const WATER_PERCENTAGE_RANGES: MetricRangeWithTranslation = {
  min: 40,
  max: 70,
  unit: '%',
  source: 'Watson PE et al. Am J Clin Nutr 1980, PMID 6986753',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/6986753/',
  translationKey: 'waterPercentage',
  explanation: traduire(`L'eau corporelle totale (TBW) represente environ 60% du poids chez l'homme adulte et 50 à 55% chez la femme.

CLASSIFICATION (Watson et al. 1980):
• <50% : Deshydratation probable
• 50 à 54% : Legerement bas
• 55 à 60% : Normal
• 61 à 70% : Optimal, excellente hydratation

PREUVES SCIENTIFIQUES:
• Muscle = 73% d'eau, Graisse = 10% d'eau (Wang Z, Am J Clin Nutr 1999)
• Deshydratation de 2% = -10 20% de performance (Sawka MN, Med Sci Sports 2007)

CE QUI INFLUENCE LA MESURE:
• Moment de la journee
• Repas recents
• Exercice, temperature
• Cafeine, alcool

BESOINS QUOTIDIENS (IOM 2004):
• Hommes: environ 3.7L/jour (toutes sources)
• Femmes: environ 2.7L/jour (toutes sources)

CONSEIL:
Surveille la couleur de l'urine: jaune pale = bien hydrate.`),
  zones: [
    { label: 'danger', start: 40, end: 49, color: '#EF4444', status: 'danger' },
    { label: 'low', start: 50, end: 54, color: '#F97316', status: 'moderate' },
    { label: 'normal', start: 55, end: 60, color: '#EAB308', status: 'good' },
    { label: 'optimal', start: 61, end: 70, color: '#22C55E', status: 'optimal' },
  ],
};

export const VISCERAL_FAT_RANGES: MetricRangeWithTranslation = {
  min: 1,
  max: 20,
  unit: '/20',
  source: 'Despres JP et al. Obesity Reviews 2008, PMID 18331423',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/18331423/',
  translationKey: 'visceralFat',
  explanation: traduire(`La graisse viscerale est la graisse profonde qui entoure les organes (foie, intestins, coeur).

CLASSIFICATION SCIENTIFIQUE:
• Score 1 à 9 : Optimal, risque cardiometabolique minimal
• Score 10 à 14 : Eleve, syndrome metabolique probable
• Score 15+ : Tres eleve, risque cardiovasculaire significatif

PREUVES SCIENTIFIQUES (Despres et al. 2008):
La graisse viscerale est le facteur n°1 du "syndrome metabolique":
• Augmente l'inflammation systemique (CRP, IL 6)
• Resistance a l'insuline conduisant au prediabete
• Risque cardiovasculaire x2 a x3

CE QUI FONCTIONNE (meta analyses):
• Exercice aerobie: reduction moyenne de 6.1% (Vissers et al. 2013)
• Deficit calorique modere: cible en priorite la graisse viscerale
• Reduction du stress (cortisol = stockage visceral)

MESURE:
L'IRM reste la reference. L'impedancemetrie donne une estimation correlee mais pas exacte.`),
  zones: [
    { label: 'optimal', start: 1, end: 9, color: '#22C55E', status: 'optimal' },
    { label: 'elevated', start: 10, end: 14, color: '#F97316', status: 'moderate' },
    { label: 'veryHigh', start: 15, end: 20, color: '#EF4444', status: 'danger' },
  ],
};

// ============================================
// VITALITÉ & RÉCUPÉRATION
// ============================================

export const HRV_RANGES: MetricRangeWithTranslation = {
  min: 10,
  max: 100,
  unit: 'ms',
  source: 'Task Force ESC/NASPE, Circulation 1996, PMID 8598068',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/8598068/',
  translationKey: 'hrv',
  explanation: traduire(`La VFC (HRV) mesure les variations entre chaque battement cardiaque en millisecondes.

CLASSIFICATION (RMSSD, valeurs moyennes):
• 70+ ms : Excellent, récupération optimale
• 50 à 69 ms : Bon, bonne adaptation
• 30 à 49 ms : Normal, récupération en cours
• 10 à 29 ms : Fatigue, stress physiologique

VARIABILITE INDIVIDUELLE:
Compare a TA moyenne sur 7 à 14 jours. Les valeurs absolues varient selon l'age, la forme physique, la genetique.

PREUVES (Task Force 1996 + meta analyses):
• HRV bas = predicteur independant de mortalite CV (Thayer JF, Neurosci Biobehav Rev 2012)
• HRV reflete l'equilibre sympathique/parasympathique

CE QUI BAISSE L'HRV:
• Surentrainement
• Alcool (meme modere)
• Stress chronique
• Infection/maladie
• Manque de sommeil

AMELIORATION:
• Entraînement aerobie regulier
• Respiration lente (6/min)
• Sommeil 7 à 9h

MESURE:
Matin au reveil, memes conditions, pendant 1 à 5 min.`),
  zones: [
    { label: 'poor', start: 10, end: 29, color: '#EF4444', status: 'attention' },
    { label: 'normal', start: 30, end: 49, color: '#F97316', status: 'moderate' },
    { label: 'good', start: 50, end: 69, color: '#EAB308', status: 'good' },
    { label: 'excellent', start: 70, end: 100, color: '#22C55E', status: 'optimal' },
  ],
};

export const RESTING_HEART_RATE_RANGES: MetricRangeWithTranslation = {
  min: 40,
  max: 100,
  unit: 'bpm',
  source: 'Fox K et al. Eur Heart J 2007, PMID 17303589',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/17303589/',
  translationKey: 'restingHeartRate',
  explanation: traduire(`La fréquence cardiaque au repos est un predicteur independant de mortalite cardiovasculaire.

CLASSIFICATION (Fox et al. 2007, meta analyse 46 etudes):
• 40 à 60 bpm : Athlete, coeur tres efficace
• 61 à 70 bpm : Excellent
• 71 à 80 bpm : Normal, moyenne population
• 81 à 100 bpm : Eleve, risque CV augmente

PREUVES SCIENTIFIQUES:
• +10 bpm de FC repos = +20% risque mortalite CV (Cooney MT, Eur J Prev Cardiol 2010)
• FC <60 bpm associee a meilleure survie long terme

EFFET DE L'ENTRAÎNEMENT:
• Endurance reguliere: -10 a -15 bpm en 3 à 6 mois
• Athletes elite: 35 à 45 bpm (bradycardie physiologique)

FACTEURS AIGUS:
Stress, cafeine, deshydratation, fievre, manque de sommeil

MESURE:
Matin au reveil, avant de te lever, pendant 1 minute.`),
  zones: [
    { label: 'athlete', start: 40, end: 60, color: '#22C55E', status: 'optimal' },
    { label: 'excellent', start: 61, end: 70, color: '#EAB308', status: 'good' },
    { label: 'normal', start: 71, end: 80, color: '#F97316', status: 'moderate' },
    { label: 'high', start: 81, end: 100, color: '#EF4444', status: 'attention' },
  ],
};

export const SLEEP_DURATION_RANGES: MetricRangeWithTranslation = {
  min: 4,
  max: 11,
  unit: 'h',
  source: 'Cappuccio FP et al. Sleep 2010, PMID 20469800',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/20469800/',
  translationKey: 'sleepDuration',
  explanation: traduire(`La durée de sommeil optimale pour la santé.

CLASSIFICATION (Cappuccio et al. 2010, meta analyse 16 etudes):
• <6h : Insuffisant, +48% risque mortalite
• 6 à 7h : Court, risque legerement augmente
• 7 à 9h : Optimal, mortalite minimale
• >9h : Long, +30% mortalite (peut indiquer pathologie)

PREUVES SCIENTIFIQUES:
1.3 million de sujets analyses:
• <5h/nuit = +52% risque cardiovasculaire
• 6 à 8h = risque minimal
• >9h = associe a depression, inflammation

BESOINS INDIVIDUELS:
• Athletes: 9 à 10h pour récupération optimale (Mah CD, Sleep 2011)
• Genetique: 3 à 5% sont "short sleepers" vrais

HYGIENE DU SOMMEIL:
• Horaires reguliers
• Pas d'ecrans 1h avant
• Chambre 18 à 20 degres C
• Eviter cafeine apres 14h`),
  zones: [
    { label: 'danger', start: 4, end: 6, color: '#EF4444', status: 'danger' },
    { label: 'low', start: 6.1, end: 6.9, color: '#F97316', status: 'moderate' },
    { label: 'optimal', start: 7, end: 9, color: '#22C55E', status: 'optimal' },
    { label: 'high', start: 9.1, end: 11, color: '#F97316', status: 'moderate' },
  ],
};

export const RECOVERY_SCORE_RANGES: MetricRangeWithTranslation = {
  min: 0,
  max: 100,
  unit: '%',
  source: 'Plews DJ et al. Int J Sports Physiol Perform 2013, PMID 23628627',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/23628627/',
  translationKey: 'recoveryScore',
  explanation: traduire(`Le score de récupération estime ta capacite a performer et t'entrainer.

CLASSIFICATION:
• 0 à 33% : Rouge, repos recommande
• 34 à 66% : Jaune, entraînement modere possible
• 67 à 100% : Vert, capacite optimale

BASE SCIENTIFIQUE (Plews et al. 2013):
Le score combine plusieurs indicateurs:
• HRV (variabilite cardiaque)
• Qualité du sommeil
• FC repos
• Fatigue percue

INTERPRETATION:
• Score bas occasionnel = normal apres effort intense
• Score bas chronique = risque de surentrainement

CONSEIL:
Adapte l'intensite de ton entraînement a ton score de récupération.`),
  zones: [
    { label: 'danger', start: 0, end: 33, color: '#EF4444', status: 'danger' },
    { label: 'moderate', start: 34, end: 66, color: '#EAB308', status: 'moderate' },
    { label: 'optimal', start: 67, end: 100, color: '#22C55E', status: 'optimal' },
  ],
};

// ============================================
// POIDS & IMC
// ============================================

export const BMI_RANGES: MetricRangeWithTranslation = {
  min: 15,
  max: 35,
  unit: '',
  source: 'Prospective Studies Collaboration, Lancet 2009, PMID 19299006',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/19299006/',
  translationKey: 'bmi',
  explanation: traduire(`L'Indice de Masse Corporelle (IMC) = Poids (kg) / Taille au carre (m2)

CLASSIFICATION (Prospective Studies Collaboration 2009):
Meta analyse de 57 etudes, 894 576 sujets:
• < 18.5 : Sous poids, mortalite augmentee
• 18.5 à 25 : Normal, mortalite minimale
• 25 à 30 : Surpoids, +30% environ mortalite
• 30+ : Obesite, +70% environ mortalite

PREUVES SCIENTIFIQUES:
• IMC optimal = 22.5 à 25 pour mortalite minimale
• +5 kg/m2 au dessus de 25 = +30% mortalite cardiovasculaire

LIMITES RECONNUES:
• Ne distingue pas muscle/graisse
• Moins fiable: athletes, personnes agees, ethnies asiatiques

CONSEIL:
Complete avec tour de taille (WHtR) et pourcentage de masse grasse pour une evaluation complete.`),
  zones: [
    { label: 'underweight', start: 15, end: 18.49, color: '#F97316', status: 'attention' },
    { label: 'normal', start: 18.5, end: 24.99, color: '#22C55E', status: 'optimal' },
    { label: 'overweight', start: 25, end: 29.99, color: '#EAB308', status: 'moderate' },
    { label: 'obese', start: 30, end: 35, color: '#EF4444', status: 'danger' },
  ],
};

// ============================================
// MENSURATIONS
// ============================================

export const WAIST_CIRCUMFERENCE_RANGES_MALE: MetricRangeWithTranslation = {
  min: 60,
  max: 120,
  unit: 'cm',
  source: 'Ashwell M et al. Obes Rev 2012, PMID 22106927',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/22106927/',
  translationKey: 'waistCircumference',
  genderSpecific: true,
  explanation: traduire(`Le tour de taille mesure la graisse abdominale, facteur de risque cardiovasculaire.

ATTENTION: Les seuils absolus (90cm, 102cm) sont des reperes GENERAUX.

METHODE PLUS PRECISE, ratio Tour de taille/Taille (WHtR):
Divise ton tour de taille par ta taille:
• < 0.4 : Sous poids possible
• 0.4 à 0.5 : Zone ideale
• 0.5 à 0.6 : Risque modere
• > 0.6 : Risque eleve

EXEMPLES CONCRETS:
• 1m75 de taille --> Tour de taille ideal: 70 à 87cm
• 1m90 de taille --> Tour de taille ideal: 76 à 95cm
• 2m10 de taille --> Tour de taille ideal: 84 à 105cm

PREUVES (Ashwell et al. 2012, meta analyse):
Le WHtR predit MIEUX le risque cardiometabolique que l'IMC ou le tour de taille seul.
"Keep your waist to less than half your height"

MESURE:
Au niveau du nombril, debout, apres expiration normale.`),
  zones: [
    { label: 'optimal', start: 60, end: 89, color: '#22C55E', status: 'optimal' },
    { label: 'attention', start: 90, end: 101, color: '#EAB308', status: 'moderate' },
    { label: 'danger', start: 102, end: 120, color: '#EF4444', status: 'danger' },
  ],
};

export const WAIST_CIRCUMFERENCE_RANGES_FEMALE: MetricRangeWithTranslation = {
  min: 55,
  max: 110,
  unit: 'cm',
  source: 'Ashwell M et al. Obes Rev 2012, PMID 22106927',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/22106927/',
  translationKey: 'waistCircumference',
  genderSpecific: true,
  explanation: traduire(`Le tour de taille mesure la graisse abdominale, facteur de risque cardiovasculaire.

ATTENTION: Les seuils absolus (80cm, 88cm) sont des reperes GENERAUX.

METHODE PLUS PRECISE, ratio Tour de taille/Taille (WHtR):
Divise ton tour de taille par ta taille:
• < 0.4 : Sous poids possible
• 0.4 à 0.5 : Zone ideale
• 0.5 à 0.6 : Risque modere
• > 0.6 : Risque eleve

EXEMPLES CONCRETS:
• 1m60 de taille --> Tour de taille ideal: 64 à 80cm
• 1m70 de taille --> Tour de taille ideal: 68 à 85cm
• 1m80 de taille --> Tour de taille ideal: 72 à 90cm

PREUVES (Ashwell et al. 2012):
Le WHtR est un meilleur predicteur du risque cardiometabolique que l'IMC ou le tour de taille seul.

MESURE:
Au niveau du nombril, debout, apres expiration normale.`),
  zones: [
    { label: 'optimal', start: 55, end: 79, color: '#22C55E', status: 'optimal' },
    { label: 'attention', start: 80, end: 87, color: '#EAB308', status: 'moderate' },
    { label: 'danger', start: 88, end: 110, color: '#EF4444', status: 'danger' },
  ],
};

// ============================================
// MASSE OSSEUSE
// ============================================

export const BONE_MASS_RANGES_MALE: MetricRangeWithTranslation = {
  min: 2.0,
  max: 4.5,
  unit: 'kg',
  source: 'Kanis JA et al. Lancet 2002, PMID 12049882',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/12049882/',
  translationKey: 'boneMass',
  genderSpecific: true,
  explanation: traduire(`La masse osseuse represente le poids mineral de ton squelette.

CLASSIFICATION (proportionnelle au poids corporel):
• <2.8 kg : Faible, risque osteoporotique
• 2.8 à 3.2 kg : Normal
• >3.2 kg : Bon, densite optimale

VARIATION SELON LE POIDS:
• 60kg = environ 2.6 kg d'os attendu (environ 4.3%)
• 80kg = environ 3.3 kg d'os attendu
• 100kg = environ 3.8 kg d'os attendu

PREUVES SCIENTIFIQUES (Kanis et al. Lancet 2002):
• Pic de masse osseuse atteint vers 25 à 30 ans
• Perte de 0.5 à 1% par an apres 40 ans
• Osteoporose = T score < -2.5 (DEXA)

INTERVENTIONS VALIDEES:
• Musculation: +1 à 3% de densite osseuse (Martyn St James M, Br J Sports Med 2009)
• Calcium 1000 à 1200mg/j + Vitamine D 800 à 1000 UI/j
• Sports d'impact: course, sauts

LIMITES:
L'impedancemetrie estime la masse, pas la densite. DEXA = reference.`),
  zones: [
    { label: 'low', start: 2.0, end: 2.8, color: '#EF4444', status: 'danger' },
    { label: 'normal', start: 2.9, end: 3.2, color: '#EAB308', status: 'moderate' },
    { label: 'good', start: 3.3, end: 4.5, color: '#22C55E', status: 'optimal' },
  ],
};

export const BONE_MASS_RANGES_FEMALE: MetricRangeWithTranslation = {
  min: 1.5,
  max: 3.5,
  unit: 'kg',
  source: 'Kanis JA et al. Lancet 2002, PMID 12049882',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/12049882/',
  translationKey: 'boneMass',
  genderSpecific: true,
  explanation: traduire(`La masse osseuse represente le poids mineral de ton squelette.

CLASSIFICATION (proportionnelle au poids corporel):
• <2.2 kg : Faible, risque osteoporotique
• 2.2 à 2.5 kg : Normal
• >2.5 kg : Bon, densite optimale

RISQUE FEMININ (Kanis et al. Lancet 2002):
• 1 femme sur 3 aura une fracture osteoporotique apres 50 ans
• Chute d'oestrogenes a la menopause = perte de 2 à 3%/an pendant 5 à 10 ans

PREUVES SCIENTIFIQUES:
• Pic de masse osseuse: 25 à 30 ans
• Musculation = intervention n1 validee
• Calcium + Vitamine D = essentiels

PREVENTION:
• Musculation avec charges 2 à 3x/semaine
• Calcium 1000 à 1200mg/j
• Vitamine D 800 à 1000 UI/j
• Eviter regimes hypocaloriques prolonges

CONSEIL:
Construis ta "banque osseuse" avant 30 ans. Apres, l'objectif est de MAINTENIR.`),
  zones: [
    { label: 'low', start: 1.5, end: 2.2, color: '#EF4444', status: 'danger' },
    { label: 'normal', start: 2.3, end: 2.5, color: '#EAB308', status: 'moderate' },
    { label: 'good', start: 2.6, end: 3.5, color: '#22C55E', status: 'optimal' },
  ],
};

// ============================================
// BMR (Metabolisme de base)
// ============================================

export const getBMRRange = (weight: number, height: number, age: number, gender: GenreFormule): MetricRangeWithTranslation => {
  // Formule Mifflin-St Jeor (neutre : la moyenne homme et femme)
  const idealBMR = 10 * weight + 6.25 * height - 5 * age + selonGenre(gender, 5, -161);

  const min = Math.floor(idealBMR * 0.7);
  const max = Math.ceil(idealBMR * 1.3);

  return {
    min,
    max,
    unit: 'kcal',
    source: 'Mifflin MD et al. Am J Clin Nutr 1990, PMID 2305711',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
    translationKey: 'bmr',
    // BMR values for translation interpolation
    bmrValues: {
      bmrValue: Math.round(idealBMR),
      weight,
      height,
      age,
      sedentary: Math.round(idealBMR * 1.2),
      lightlyActive: Math.round(idealBMR * 1.375),
      active: Math.round(idealBMR * 1.55),
      veryActive: Math.round(idealBMR * 1.725),
    },
    explanation: traduire("Le metabolisme de base (BMR) = énergie brulee au repos complet pendant 24h.\n\nTON BMR ESTIME: environ {0} kcal/jour\n(Base sur: {1}kg, {2}cm, {3} ans)\n\nEQUATION MIFFLIN ST JEOR (Mifflin et al. 1990):\nValidee sur 498 sujets, precision +/-10% vs calorimetrie indirecte.\n\nDEPENSE TOTALE (facteurs d'activité valides):\n• Sedentaire (1.2): environ {4} kcal\n• Peu actif (1.375): environ {5} kcal\n• Actif (1.55): environ {6} kcal\n• Tres actif (1.725): environ {7} kcal\n\nFACTEURS D'INFLUENCE:\n• Masse musculaire: +13 kcal/kg muscle/jour\n• Age: moins 2% par decennie apres 20 ans\n• Genetique: plus ou moins 5 à 10% de variation\n\nCONSEIL:\nAugmente ton BMR via la masse musculaire!", Math.round(idealBMR), weight, height, age, Math.round(idealBMR * 1.2), Math.round(idealBMR * 1.375), Math.round(idealBMR * 1.55), Math.round(idealBMR * 1.725)),
    zones: [
      { label: 'low', start: min, end: Math.floor(idealBMR * 0.85), color: '#F97316', status: 'moderate' },
      { label: 'normal', start: Math.floor(idealBMR * 0.85) + 1, end: Math.floor(idealBMR * 1.15), color: '#22C55E', status: 'optimal' },
      { label: 'high', start: Math.floor(idealBMR * 1.15) + 1, end: max, color: '#EAB308', status: 'good' },
    ],
  };
};

// ============================================
// ENTRAÎNEMENT
// ============================================

export const INTENSITY_RANGES: MetricRangeWithTranslation = {
  min: 0,
  max: 100,
  unit: '%',
  source: 'Banister EW, Med Sci Sports Exerc 1991, PMID 2017016',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/2017016/',
  translationKey: 'intensity',
  explanation: traduire(`L'intensite d'entraînement mesure l'effort relatif par rapport a ta capacite maximale.

CLASSIFICATION (Banister TRIMP model):
• 0 à 50% : Leger, récupération active
• 50 à 70% : Modere, zone aerobie, endurance fondamentale
• 70 à 85% : Intense, zone seuil lactique
• 85 à 100% : Maximal, zone anaerobie

PREUVES SCIENTIFIQUES:
• 80% du volume en zone 1 à 2 + 20% en zone 4 à 5 = distribution polarisee optimale (Seiler S, Int J Sports Physiol 2010)
• Surentrainement = trop de volume en zone 3 (no man's land)

CONSEIL:
La majorite de tes entraînements devraient etre en zone facile (conversation possible).`),
  zones: [
    { label: 'low', start: 0, end: 50, color: '#EAB308', status: 'good' },
    { label: 'moderate', start: 51, end: 70, color: '#22C55E', status: 'optimal' },
    { label: 'high', start: 71, end: 85, color: '#F97316', status: 'moderate' },
    { label: 'veryHigh', start: 86, end: 100, color: '#EF4444', status: 'attention' },
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Obtenir le range approprié selon le genre
 */
/**
 * 28 octobre 2026 : reperes neutres, la moyenne exacte des reperes homme et femme (memes zones, bornes moyennes au
 * centieme), avec une explication qui le dit. Les deux reperes ont les memes zones dans le meme ordre.
 */
export const moyenneRange = (h: MetricRangeWithTranslation, f: MetricRangeWithTranslation): MetricRangeWithTranslation => ({
  ...h,
  min: centieme((h.min + f.min) / 2),
  max: centieme((h.max + f.max) / 2),
  genderSpecific: false,
  explanation: `${traduire('Repères neutres : la moyenne des repères homme et femme, un peu moins précis.')}\n\n${h.explanation}`,
  zones: h.zones.map((z, i) => {
    const zf = f.zones[i] ?? z;
    return { ...z, start: centieme((z.start + zf.start) / 2), end: centieme((z.end + zf.end) / 2) };
  }),
});

const parGenre = (gender: GenreFormule, h: MetricRangeWithTranslation, f: MetricRangeWithTranslation) => (gender === 'male' ? h : gender === 'female' ? f : moyenneRange(h, f));

export const getBodyFatRange = (gender: GenreFormule): MetricRangeWithTranslation => parGenre(gender, BODY_FAT_RANGES_MALE, BODY_FAT_RANGES_FEMALE);

export const getMuscleMassRange = (gender: GenreFormule): MetricRangeWithTranslation => parGenre(gender, MUSCLE_MASS_RANGES_MALE, MUSCLE_MASS_RANGES_FEMALE);

export const getWaistCircumferenceRange = (gender: GenreFormule): MetricRangeWithTranslation => parGenre(gender, WAIST_CIRCUMFERENCE_RANGES_MALE, WAIST_CIRCUMFERENCE_RANGES_FEMALE);

export const getBoneMassRange = (gender: GenreFormule): MetricRangeWithTranslation => parGenre(gender, BONE_MASS_RANGES_MALE, BONE_MASS_RANGES_FEMALE);

/**
 * Calculer le statut d'une métrique
 * The label returned is a translation key (e.g., 'athlete', 'optimal', 'danger')
 * Components should use t(`healthRanges.zones.${label}`) to get the localized text
 */
export const getMetricStatus = (value: number, range: MetricRange | MetricRangeWithTranslation): {
  status: 'optimal' | 'good' | 'moderate' | 'attention' | 'danger';
  color: string;
  label: string;
} => {
  const zone = range.zones.find(z => value >= z.start && value <= z.end);
  if (!zone) {
    return {
      status: 'moderate',
      color: '#94A3B8',
      label: 'unknown',
    };
  }
  return {
    status: zone.status,
    color: zone.color,
    label: zone.label,
  };
};

/**
 * Helper to get the localized explanation for a metric
 * Usage: t(`healthRanges.${range.translationKey}.explanation`, range.bmrValues)
 * For gender-specific metrics: t(`healthRanges.${range.translationKey}.explanation${gender === 'male' ? 'Male' : 'Female'}`)
 */
export const getExplanationKey = (range: MetricRangeWithTranslation, gender?: GenreFormule): string => {
  if (range.genderSpecific && gender && gender !== 'neutral') {
    return `healthRanges.${range.translationKey}.explanation${gender === 'male' ? 'Male' : 'Female'}`;
  }
  return `healthRanges.${range.translationKey}.explanation`;
};

/**
 * Helper to get the localized title for a metric
 * Usage: t(getTitleKey(range))
 */
export const getTitleKey = (range: MetricRangeWithTranslation): string => {
  return `healthRanges.${range.translationKey}.title`;
};

/**
 * Helper to get the localized zone label
 * Usage: t(getZoneLabelKey(zone.label))
 */
export const getZoneLabelKey = (label: string): string => {
  return `healthRanges.zones.${label}`;
};
