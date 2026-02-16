// ============================================
// HEALTH RANGES - Plages de référence santé
// Basées sur des études scientifiques peer-reviewed
// ============================================

import { MetricRange } from '@/components/stats/charts/MetricRangeIndicator';
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
  source: 'Gallagher D et al. Am J Clin Nutr 2000 - PMID: 10966886',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10966886/',
  translationKey: 'bodyFat',
  genderSpecific: true,
  explanation: `Le pourcentage de masse grasse mesure la proportion de graisse par rapport au poids total.

CLASSIFICATION (Gallagher et al. 2000, n=1626 sujets):
- 3-13% : Athlete - Niveau competition
- 14-17% : Forme - Excellente condition
- 18-24% : Moyen - Population generale en bonne sante
- 25%+ : Eleve - Risques metaboliques accrus

PREUVES SCIENTIFIQUES:
- >25% chez l'homme = risque diabete type 2 x2.5 (Prospective Studies Collaboration, Lancet 2009)
- <5% chronique = dysfonction hormonale, immunite affaiblie

PRECISION DES MESURES:
- Impedancemetrie: +/-3-5% d'erreur (Kyle et al. 2004)
- DEXA: +/-1-2% (reference clinique)

CONSEIL:
Suis la TENDANCE sur 4-8 semaines plutot que les variations quotidiennes.`,
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
  source: 'Gallagher D et al. Am J Clin Nutr 2000 - PMID: 10966886',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10966886/',
  translationKey: 'bodyFat',
  genderSpecific: true,
  explanation: `Le pourcentage de masse grasse mesure la proportion de graisse par rapport au poids total.

CLASSIFICATION (Gallagher et al. 2000):
- 10-20% : Athlete - Niveau competition
- 21-24% : Forme - Excellente condition
- 25-31% : Moyen - Population generale
- 32%+ : Eleve - Risques metaboliques accrus

DIFFERENCE BIOLOGIQUE HOMMES/FEMMES:
Les femmes ont naturellement 8-12% de graisse de plus que les hommes (seins, hanches, reserve reproductive). C'est NORMAL et SAIN.

PREUVES SCIENTIFIQUES:
- <15% prolonge = amenorrhee, infertilite (Loucks AB, J Sports Sci 2004)
- >32% = risque diabete/cardiovasculaire augmente

CONSEIL:
Une perte de 0.5-1% par mois est un rythme sain et durable.`,
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
  source: 'Janssen I et al. J Appl Physiol 2000 - PMID: 10846039',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10846039/',
  translationKey: 'muscleMass',
  genderSpecific: true,
  explanation: `La masse musculaire squelettique (SMM) represente les muscles volontaires de ton corps.

CLASSIFICATION (Janssen et al. 2000, etude IRM sur 468 sujets):
- <38% : Faible - Sarcopenie probable
- 38-44% : Normal - Population sedentaire
- 44-52% : Bon - Activite physique reguliere
- 52%+ : Excellent - Niveau sportif

PREUVES SCIENTIFIQUES:
- +10% de masse musculaire = -11% risque de mortalite toutes causes (Srikanthan P, Am J Med 2016)
- Muscle = organe metabolique: secrete myokines anti-inflammatoires
- Sensibilite a l'insuline correlee positivement

SARCOPENIE (Cruz-Jentoft AJ, Lancet 2019):
Perte de 3-8% de muscle par decennie apres 30 ans.
La musculation est le traitement n°1 valide scientifiquement.

RECOMMANDATIONS (ACSM):
2-3 seances de musculation/semaine, tous les groupes musculaires.`,
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
  source: 'Janssen I et al. J Appl Physiol 2000 - PMID: 10846039',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10846039/',
  translationKey: 'muscleMass',
  genderSpecific: true,
  explanation: `La masse musculaire squelettique (SMM) represente les muscles volontaires de ton corps.

CLASSIFICATION (Janssen et al. 2000):
- <31% : Faible - Sarcopenie probable
- 31-36% : Normal - Population sedentaire
- 36-42% : Bon - Activite physique reguliere
- 42%+ : Excellent - Niveau sportif

DIFFERENCE BIOLOGIQUE:
Les femmes ont naturellement 30-40% moins de masse musculaire que les hommes (testosterone 10-20x plus basse). C'est NORMAL.

PREUVES SCIENTIFIQUES:
- Musculation = prevention osteoporose post-menopause (Kohrt WM, Med Sci Sports 2004)
- Pas de "prise de volume" chez les femmes sans steroides
- Ameliore sensibilite insuline et metabolisme

RECOMMANDATIONS (ACSM):
2-3 seances de musculation/semaine. Les charges lourdes sont sures et efficaces.`,
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
  source: 'Watson PE et al. Am J Clin Nutr 1980 - PMID: 6986753',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/6986753/',
  translationKey: 'waterPercentage',
  explanation: `L'eau corporelle totale (TBW) represente environ 60% du poids chez l'homme adulte et 50-55% chez la femme.

CLASSIFICATION (Watson et al. 1980):
- <50% : Deshydratation probable
- 50-54% : Legerement bas
- 55-60% : Normal
- 61-70% : Optimal - Excellente hydratation

PREUVES SCIENTIFIQUES:
- Muscle = 73% d'eau, Graisse = 10% d'eau (Wang Z, Am J Clin Nutr 1999)
- Deshydratation de 2% = -10-20% de performance (Sawka MN, Med Sci Sports 2007)

CE QUI INFLUENCE LA MESURE:
- Moment de la journee
- Repas recents
- Exercice, temperature
- Cafeine, alcool

BESOINS QUOTIDIENS (IOM 2004):
- Hommes: environ 3.7L/jour (toutes sources)
- Femmes: environ 2.7L/jour (toutes sources)

CONSEIL:
Surveille la couleur de l'urine: jaune pale = bien hydrate.`,
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
  source: 'Despres JP et al. Obesity Reviews 2008 - PMID: 18331423',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/18331423/',
  translationKey: 'visceralFat',
  explanation: `La graisse viscerale est la graisse profonde qui entoure les organes (foie, intestins, coeur).

CLASSIFICATION SCIENTIFIQUE:
- Score 1-9 : Optimal - Risque cardiometabolique minimal
- Score 10-14 : Eleve - Syndrome metabolique probable
- Score 15+ : Tres eleve - Risque cardiovasculaire significatif

PREUVES SCIENTIFIQUES (Despres et al. 2008):
La graisse viscerale est le facteur n°1 du "syndrome metabolique":
- Augmente l'inflammation systemique (CRP, IL-6)
- Resistance a l'insuline conduisant au prediabete
- Risque cardiovasculaire x2 a x3

CE QUI FONCTIONNE (meta-analyses):
- Exercice aerobie: reduction moyenne de 6.1% (Vissers et al. 2013)
- Deficit calorique modere: cible en priorite la graisse viscerale
- Reduction du stress (cortisol = stockage visceral)

MESURE:
L'IRM reste la reference. L'impedancemetrie donne une estimation correlee mais pas exacte.`,
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
  source: 'Task Force ESC/NASPE, Circulation 1996 - PMID: 8598068',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/8598068/',
  translationKey: 'hrv',
  explanation: `La VFC (HRV) mesure les variations entre chaque battement cardiaque en millisecondes.

CLASSIFICATION (RMSSD, valeurs moyennes):
- 70+ ms : Excellent - Recuperation optimale
- 50-69 ms : Bon - Bonne adaptation
- 30-49 ms : Normal - Recuperation en cours
- 10-29 ms : Fatigue - Stress physiologique

VARIABILITE INDIVIDUELLE:
Compare a TA moyenne sur 7-14 jours. Les valeurs absolues varient selon l'age, la forme physique, la genetique.

PREUVES (Task Force 1996 + meta-analyses):
- HRV bas = predicteur independant de mortalite CV (Thayer JF, Neurosci Biobehav Rev 2012)
- HRV reflete l'equilibre sympathique/parasympathique

CE QUI BAISSE L'HRV:
- Surentrainement
- Alcool (meme modere)
- Stress chronique
- Infection/maladie
- Manque de sommeil

AMELIORATION:
- Entrainement aerobie regulier
- Respiration lente (6/min)
- Sommeil 7-9h

MESURE:
Matin au reveil, memes conditions, pendant 1-5 min.`,
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
  source: 'Fox K et al. Eur Heart J 2007 - PMID: 17303589',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/17303589/',
  translationKey: 'restingHeartRate',
  explanation: `La frequence cardiaque au repos est un predicteur independant de mortalite cardiovasculaire.

CLASSIFICATION (Fox et al. 2007, meta-analyse 46 etudes):
- 40-60 bpm : Athlete - Coeur tres efficace
- 61-70 bpm : Excellent
- 71-80 bpm : Normal - Moyenne population
- 81-100 bpm : Eleve - Risque CV augmente

PREUVES SCIENTIFIQUES:
- +10 bpm de FC repos = +20% risque mortalite CV (Cooney MT, Eur J Prev Cardiol 2010)
- FC <60 bpm associee a meilleure survie long terme

EFFET DE L'ENTRAINEMENT:
- Endurance reguliere: -10 a -15 bpm en 3-6 mois
- Athletes elite: 35-45 bpm (bradycardie physiologique)

FACTEURS AIGUS:
Stress, cafeine, deshydratation, fievre, manque de sommeil

MESURE:
Matin au reveil, avant de te lever, pendant 1 minute.`,
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
  source: 'Cappuccio FP et al. Sleep 2010 - PMID: 20469800',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/20469800/',
  translationKey: 'sleepDuration',
  explanation: `La duree de sommeil optimale pour la sante.

CLASSIFICATION (Cappuccio et al. 2010, meta-analyse 16 etudes):
- <6h : Insuffisant - +48% risque mortalite
- 6-7h : Court - Risque legerement augmente
- 7-9h : Optimal - Mortalite minimale
- >9h : Long - +30% mortalite (peut indiquer pathologie)

PREUVES SCIENTIFIQUES:
1.3 million de sujets analyses:
- <5h/nuit = +52% risque cardiovasculaire
- 6-8h = risque minimal
- >9h = associe a depression, inflammation

BESOINS INDIVIDUELS:
- Athletes: 9-10h pour recuperation optimale (Mah CD, Sleep 2011)
- Genetique: 3-5% sont "short sleepers" vrais

HYGIENE DU SOMMEIL:
- Horaires reguliers
- Pas d'ecrans 1h avant
- Chambre 18-20 degres C
- Eviter cafeine apres 14h`,
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
  source: 'Plews DJ et al. Int J Sports Physiol Perform 2013 - PMID: 23628627',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/23628627/',
  translationKey: 'recoveryScore',
  explanation: `Le score de recuperation estime ta capacite a performer et t'entrainer.

CLASSIFICATION:
- 0-33% : Rouge - Repos recommande
- 34-66% : Jaune - Entrainement modere possible
- 67-100% : Vert - Capacite optimale

BASE SCIENTIFIQUE (Plews et al. 2013):
Le score combine plusieurs indicateurs:
- HRV (variabilite cardiaque)
- Qualite du sommeil
- FC repos
- Fatigue percue

INTERPRETATION:
- Score bas occasionnel = normal apres effort intense
- Score bas chronique = risque de surentrainement

CONSEIL:
Adapte l'intensite de ton entrainement a ton score de recuperation.`,
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
  source: 'Prospective Studies Collaboration, Lancet 2009 - PMID: 19299006',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/19299006/',
  translationKey: 'bmi',
  explanation: `L'Indice de Masse Corporelle (IMC) = Poids (kg) / Taille au carre (m2)

CLASSIFICATION (Prospective Studies Collaboration 2009):
Meta-analyse de 57 etudes, 894 576 sujets:
- < 18.5 : Sous-poids - Mortalite augmentee
- 18.5-25 : Normal - Mortalite minimale
- 25-30 : Surpoids - +30% environ mortalite
- 30+ : Obesite - +70% environ mortalite

PREUVES SCIENTIFIQUES:
- IMC optimal = 22.5-25 pour mortalite minimale
- +5 kg/m2 au-dessus de 25 = +30% mortalite cardiovasculaire

LIMITES RECONNUES:
- Ne distingue pas muscle/graisse
- Moins fiable: athletes, personnes agees, ethnies asiatiques

CONSEIL:
Complete avec tour de taille (WHtR) et pourcentage de masse grasse pour une evaluation complete.`,
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
  source: 'Ashwell M et al. Obes Rev 2012 - PMID: 22106927',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/22106927/',
  translationKey: 'waistCircumference',
  genderSpecific: true,
  explanation: `Le tour de taille mesure la graisse abdominale, facteur de risque cardiovasculaire.

ATTENTION: Les seuils absolus (90cm, 102cm) sont des reperes GENERAUX.

METHODE PLUS PRECISE - Ratio Tour de taille/Taille (WHtR):
Divise ton tour de taille par ta taille:
- < 0.4 : Sous-poids possible
- 0.4-0.5 : Zone ideale
- 0.5-0.6 : Risque modere
- > 0.6 : Risque eleve

EXEMPLES CONCRETS:
- 1m75 de taille --> Tour de taille ideal: 70-87cm
- 1m90 de taille --> Tour de taille ideal: 76-95cm
- 2m10 de taille --> Tour de taille ideal: 84-105cm

PREUVES (Ashwell et al. 2012, meta-analyse):
Le WHtR predit MIEUX le risque cardiometabolique que l'IMC ou le tour de taille seul.
"Keep your waist to less than half your height"

MESURE:
Au niveau du nombril, debout, apres expiration normale.`,
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
  source: 'Ashwell M et al. Obes Rev 2012 - PMID: 22106927',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/22106927/',
  translationKey: 'waistCircumference',
  genderSpecific: true,
  explanation: `Le tour de taille mesure la graisse abdominale, facteur de risque cardiovasculaire.

ATTENTION: Les seuils absolus (80cm, 88cm) sont des reperes GENERAUX.

METHODE PLUS PRECISE - Ratio Tour de taille/Taille (WHtR):
Divise ton tour de taille par ta taille:
- < 0.4 : Sous-poids possible
- 0.4-0.5 : Zone ideale
- 0.5-0.6 : Risque modere
- > 0.6 : Risque eleve

EXEMPLES CONCRETS:
- 1m60 de taille --> Tour de taille ideal: 64-80cm
- 1m70 de taille --> Tour de taille ideal: 68-85cm
- 1m80 de taille --> Tour de taille ideal: 72-90cm

PREUVES (Ashwell et al. 2012):
Le WHtR est un meilleur predicteur du risque cardiometabolique que l'IMC ou le tour de taille seul.

MESURE:
Au niveau du nombril, debout, apres expiration normale.`,
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
  source: 'Kanis JA et al. Lancet 2002 - PMID: 12049882',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/12049882/',
  translationKey: 'boneMass',
  genderSpecific: true,
  explanation: `La masse osseuse represente le poids mineral de ton squelette.

CLASSIFICATION (proportionnelle au poids corporel):
- <2.8 kg : Faible - Risque osteoporotique
- 2.8-3.2 kg : Normal
- >3.2 kg : Bon - Densite optimale

VARIATION SELON LE POIDS:
- 60kg = environ 2.6 kg d'os attendu (environ 4.3%)
- 80kg = environ 3.3 kg d'os attendu
- 100kg = environ 3.8 kg d'os attendu

PREUVES SCIENTIFIQUES (Kanis et al. Lancet 2002):
- Pic de masse osseuse atteint vers 25-30 ans
- Perte de 0.5-1% par an apres 40 ans
- Osteoporose = T-score < -2.5 (DEXA)

INTERVENTIONS VALIDEES:
- Musculation: +1-3% de densite osseuse (Martyn-St James M, Br J Sports Med 2009)
- Calcium 1000-1200mg/j + Vitamine D 800-1000 UI/j
- Sports d'impact: course, sauts

LIMITES:
L'impedancemetrie estime la masse, pas la densite. DEXA = reference.`,
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
  source: 'Kanis JA et al. Lancet 2002 - PMID: 12049882',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/12049882/',
  translationKey: 'boneMass',
  genderSpecific: true,
  explanation: `La masse osseuse represente le poids mineral de ton squelette.

CLASSIFICATION (proportionnelle au poids corporel):
- <2.2 kg : Faible - Risque osteoporotique
- 2.2-2.5 kg : Normal
- >2.5 kg : Bon - Densite optimale

RISQUE FEMININ (Kanis et al. Lancet 2002):
- 1 femme sur 3 aura une fracture osteoporotique apres 50 ans
- Chute d'oestrogenes a la menopause = perte de 2-3%/an pendant 5-10 ans

PREUVES SCIENTIFIQUES:
- Pic de masse osseuse: 25-30 ans
- Musculation = intervention n1 validee
- Calcium + Vitamine D = essentiels

PREVENTION:
- Musculation avec charges 2-3x/semaine
- Calcium 1000-1200mg/j
- Vitamine D 800-1000 UI/j
- Eviter regimes hypocaloriques prolonges

CONSEIL:
Construis ta "banque osseuse" avant 30 ans. Apres, l'objectif est de MAINTENIR.`,
  zones: [
    { label: 'low', start: 1.5, end: 2.2, color: '#EF4444', status: 'danger' },
    { label: 'normal', start: 2.3, end: 2.5, color: '#EAB308', status: 'moderate' },
    { label: 'good', start: 2.6, end: 3.5, color: '#22C55E', status: 'optimal' },
  ],
};

// ============================================
// BMR (Metabolisme de base)
// ============================================

export const getBMRRange = (weight: number, height: number, age: number, gender: 'male' | 'female'): MetricRangeWithTranslation => {
  // Formule Mifflin-St Jeor
  const idealBMR = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  const min = Math.floor(idealBMR * 0.7);
  const max = Math.ceil(idealBMR * 1.3);

  return {
    min,
    max,
    unit: 'kcal',
    source: 'Mifflin MD et al. Am J Clin Nutr 1990 - PMID: 2305711',
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
    explanation: `Le metabolisme de base (BMR) = energie brulee au repos complet pendant 24h.

TON BMR ESTIME: environ ${Math.round(idealBMR)} kcal/jour
(Base sur: ${weight}kg, ${height}cm, ${age} ans)

EQUATION MIFFLIN-ST JEOR (Mifflin et al. 1990):
Validee sur 498 sujets, precision +/-10% vs calorimetrie indirecte.

DEPENSE TOTALE (facteurs d'activite valides):
- Sedentaire (1.2): environ ${Math.round(idealBMR * 1.2)} kcal
- Peu actif (1.375): environ ${Math.round(idealBMR * 1.375)} kcal
- Actif (1.55): environ ${Math.round(idealBMR * 1.55)} kcal
- Tres actif (1.725): environ ${Math.round(idealBMR * 1.725)} kcal

FACTEURS D'INFLUENCE:
- Masse musculaire: +13 kcal/kg muscle/jour
- Age: -2% par decennie apres 20 ans
- Genetique: +/-5-10% de variation

CONSEIL:
Augmente ton BMR via la masse musculaire!`,
    zones: [
      { label: 'low', start: min, end: Math.floor(idealBMR * 0.85), color: '#F97316', status: 'moderate' },
      { label: 'normal', start: Math.floor(idealBMR * 0.85) + 1, end: Math.floor(idealBMR * 1.15), color: '#22C55E', status: 'optimal' },
      { label: 'high', start: Math.floor(idealBMR * 1.15) + 1, end: max, color: '#EAB308', status: 'good' },
    ],
  };
};

// ============================================
// ENTRAINEMENT
// ============================================

export const INTENSITY_RANGES: MetricRangeWithTranslation = {
  min: 0,
  max: 100,
  unit: '%',
  source: 'Banister EW, Med Sci Sports Exerc 1991 - PMID: 2017016',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/2017016/',
  translationKey: 'intensity',
  explanation: `L'intensite d'entrainement mesure l'effort relatif par rapport a ta capacite maximale.

CLASSIFICATION (Banister TRIMP model):
- 0-50% : Leger - Recuperation active
- 50-70% : Modere - Zone aerobie, endurance fondamentale
- 70-85% : Intense - Zone seuil lactique
- 85-100% : Maximal - Zone anaerobie

PREUVES SCIENTIFIQUES:
- 80% du volume en zone 1-2 + 20% en zone 4-5 = distribution polarisee optimale (Seiler S, Int J Sports Physiol 2010)
- Surentrainement = trop de volume en zone 3 (no man's land)

CONSEIL:
La majorite de tes entrainements devraient etre en zone facile (conversation possible).`,
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
export const getBodyFatRange = (gender: 'male' | 'female'): MetricRangeWithTranslation => {
  return gender === 'male' ? BODY_FAT_RANGES_MALE : BODY_FAT_RANGES_FEMALE;
};

export const getMuscleMassRange = (gender: 'male' | 'female'): MetricRangeWithTranslation => {
  return gender === 'male' ? MUSCLE_MASS_RANGES_MALE : MUSCLE_MASS_RANGES_FEMALE;
};

export const getWaistCircumferenceRange = (gender: 'male' | 'female'): MetricRangeWithTranslation => {
  return gender === 'male' ? WAIST_CIRCUMFERENCE_RANGES_MALE : WAIST_CIRCUMFERENCE_RANGES_FEMALE;
};

export const getBoneMassRange = (gender: 'male' | 'female'): MetricRangeWithTranslation => {
  return gender === 'male' ? BONE_MASS_RANGES_MALE : BONE_MASS_RANGES_FEMALE;
};

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
export const getExplanationKey = (range: MetricRangeWithTranslation, gender?: 'male' | 'female'): string => {
  if (range.genderSpecific && gender) {
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
