// ============================================
// METRIC RANGES - Ranges scientifiques pour chaque métrique
// Avec sources et explications
// ============================================

import { MetricRange } from '@/components/stats/charts/MetricRangeIndicator';

// ============================================
// COMPOSITION CORPORELLE
// ============================================

export const VISCERAL_FAT_RANGE: MetricRange = {
  min: 1,
  max: 20,
  zones: [
    {
      label: 'Optimal',
      start: 1,
      end: 9,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Élevé',
      start: 9,
      end: 14,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Très élevé',
      start: 14,
      end: 20,
      color: '#EF4444',
      status: 'danger',
    },
  ],
  unit: '/20',
  source: 'Després JP et al. Obesity Reviews 2008 - PMID: 18331423',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/18331423/',
  explanation: `La graisse viscerale est la graisse profonde qui entoure tes organes (foie, intestins, coeur).

CLASSIFICATION SCIENTIFIQUE:
- Score 1-9 : Optimal - Risque cardiometabolique minimal
- Score 10-14 : Eleve - Syndrome metabolique probable
- Score 15+ : Tres eleve - Risque cardiovasculaire significatif

PREUVES SCIENTIFIQUES (Despres et al. 2008):
La graisse viscerale est le facteur n1 du "syndrome metabolique":
- Augmente l'inflammation systemique (CRP, IL-6)
- Resistance a l'insuline conduisant au prediabete
- Risque cardiovasculaire x2 a x3

CE QUI FONCTIONNE (meta-analyses):
- Exercice aerobie: reduction moyenne de 6.1% (Vissers et al. 2013)
- Deficit calorique modere: cible en priorite la graisse viscerale
- Reduction du stress (cortisol = stockage visceral)

MESURE:
L'IRM reste la reference. L'impedancemetrie donne une estimation correlee mais pas exacte.`,
};

export const BODY_FAT_RANGE_MALE: MetricRange = {
  min: 2,
  max: 35,
  zones: [
    {
      label: 'Athlète',
      start: 2,
      end: 13,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Fitness',
      start: 13,
      end: 17,
      color: '#22C55E',
      status: 'good',
    },
    {
      label: 'Acceptable',
      start: 17,
      end: 24,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Obésité',
      start: 24,
      end: 35,
      color: '#EF4444',
      status: 'danger',
    },
  ],
  unit: '%',
  source: 'Gallagher D et al. Am J Clin Nutr 2000 - PMID: 10966886',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10966886/',
  explanation: `Le pourcentage de masse grasse mesure la proportion de graisse par rapport au poids total.

CLASSIFICATION (Gallagher et al. 2000, n=1626 sujets):
- 2-5% : Graisse essentielle (minimum physiologique)
- 6-13% : Athlete - Niveau competition
- 14-17% : Fitness - Excellente condition
- 18-24% : Moyenne population en bonne sante
- 25%+ : Surpoids/Obesite - Risques metaboliques accrus

PREUVES SCIENTIFIQUES:
- >25% chez l'homme = risque diabete type 2 x2.5 (Prospective Studies Collaboration, Lancet 2009)
- <5% chronique = dysfonction hormonale, immunite affaiblie

PRECISION DES MESURES:
- Impedancemetrie: +/-3-5% d'erreur (Kyle et al. 2004)
- DEXA: +/-1-2% (reference clinique)
- Plis cutanes: +/-3-4% si bien realises

CONSEIL:
Suis la TENDANCE sur 4-8 semaines plutot que les variations quotidiennes.`,
};

export const BODY_FAT_RANGE_FEMALE: MetricRange = {
  min: 10,
  max: 40,
  zones: [
    {
      label: 'Athlète',
      start: 10,
      end: 20,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Fitness',
      start: 20,
      end: 24,
      color: '#22C55E',
      status: 'good',
    },
    {
      label: 'Acceptable',
      start: 24,
      end: 31,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Obésité',
      start: 31,
      end: 40,
      color: '#EF4444',
      status: 'danger',
    },
  ],
  unit: '%',
  source: 'Gallagher D et al. Am J Clin Nutr 2000 - PMID: 10966886',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10966886/',
  explanation: `Le pourcentage de masse grasse mesure la proportion de graisse par rapport au poids total.

CLASSIFICATION (Gallagher et al. 2000):
- 10-13% : Graisse essentielle (minimum physiologique)
- 14-20% : Athlete - Niveau competition
- 21-24% : Fitness - Excellente condition
- 25-31% : Moyenne population en bonne sante
- 32%+ : Surpoids/Obesite - Risques metaboliques accrus

DIFFERENCE BIOLOGIQUE HOMMES/FEMMES:
Les femmes ont environ 8-12% de graisse de plus que les hommes (seins, hanches, reserve reproductive). C'est NORMAL et SAIN.

PREUVES SCIENTIFIQUES:
- <15% prolonge = amenorrhee, infertilite (Loucks AB, J Sports Sci 2004)
- >32% = risque diabete/cardiovasculaire augmente

PRECISION:
L'impedancemetrie varie avec l'hydratation, le cycle menstruel. Mesure toujours dans les memes conditions.

CONSEIL:
Une perte de 0.5-1% par mois est un rythme sain et durable.`,
};

export const MUSCLE_MASS_RANGE_MALE: MetricRange = {
  min: 30,
  max: 60,
  zones: [
    {
      label: 'Faible',
      start: 30,
      end: 38,
      color: '#EF4444',
      status: 'danger',
    },
    {
      label: 'Normal',
      start: 38,
      end: 44,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Bon',
      start: 44,
      end: 52,
      color: '#22C55E',
      status: 'good',
    },
    {
      label: 'Athlète',
      start: 52,
      end: 60,
      color: '#10B981',
      status: 'optimal',
    },
  ],
  unit: '%',
  source: 'Janssen I et al. J Appl Physiol 2000 - PMID: 10846039',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10846039/',
  explanation: `La masse musculaire squelettique (SMM) represente les muscles volontaires de ton corps.

CLASSIFICATION (Janssen et al. 2000, etude IRM sur 468 sujets):
- <38% : Faible - Sarcopenie probable
- 38-44% : Normal - Population sedentaire
- 44-52% : Bon - Activite physique reguliere
- 52%+ : Athlete - Niveau sportif

PREUVES SCIENTIFIQUES:
- +10% de masse musculaire = -11% risque de mortalite toutes causes (Srikanthan P, Am J Med 2016)
- Muscle = organe metabolique: secrete myokines anti-inflammatoires
- Sensibilite a l'insuline correlee positivement

SARCOPENIE (Cruz-Jentoft AJ, Lancet 2019):
Perte de 3-8% de muscle par decennie apres 30 ans.
La musculation est le traitement n1 valide scientifiquement.

CALCUL:
Homme 75kg x 45% = 33.75 kg de muscles squelettiques.

RECOMMANDATIONS (ACSM):
2-3 seances de musculation/semaine, tous les groupes musculaires.`,
};

export const MUSCLE_MASS_RANGE_FEMALE: MetricRange = {
  min: 24,
  max: 50,
  zones: [
    {
      label: 'Faible',
      start: 24,
      end: 31,
      color: '#EF4444',
      status: 'danger',
    },
    {
      label: 'Normal',
      start: 31,
      end: 36,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Bon',
      start: 36,
      end: 42,
      color: '#22C55E',
      status: 'good',
    },
    {
      label: 'Athlète',
      start: 42,
      end: 50,
      color: '#10B981',
      status: 'optimal',
    },
  ],
  unit: '%',
  source: 'Janssen I et al. J Appl Physiol 2000 - PMID: 10846039',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/10846039/',
  explanation: `La masse musculaire squelettique (SMM) represente les muscles volontaires de ton corps.

CLASSIFICATION (Janssen et al. 2000):
- <31% : Faible - Sarcopenie probable
- 31-36% : Normal - Population sedentaire
- 36-42% : Bon - Activite physique reguliere
- 42%+ : Athlete - Niveau sportif

DIFFERENCE BIOLOGIQUE:
Les femmes ont environ 30-40% moins de masse musculaire que les hommes (testosterone 10-20x plus basse). C'est NORMAL.

PREUVES SCIENTIFIQUES:
- Musculation = prevention osteoporose post-menopause (Kohrt WM, Med Sci Sports 2004)
- Pas de "prise de volume" chez les femmes sans steroides
- Ameliore sensibilite insuline et metabolisme

APRES LA MENOPAUSE:
Perte acceleree de muscle si pas d'exercice de resistance.

RECOMMANDATIONS (ACSM):
2-3 seances de musculation/semaine. Les charges lourdes sont sures et efficaces.`,
};

export const BONE_MASS_RANGE_MALE: MetricRange = {
  min: 2.0,
  max: 4.5,
  zones: [
    {
      label: 'Faible',
      start: 2.0,
      end: 2.8,
      color: '#EF4444',
      status: 'danger',
    },
    {
      label: 'Normal',
      start: 2.8,
      end: 3.2,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Bon',
      start: 3.2,
      end: 4.5,
      color: '#10B981',
      status: 'optimal',
    },
  ],
  unit: 'kg',
  source: 'Kanis JA et al. Lancet 2002 - PMID: 12049882',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/12049882/',
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
};

export const BONE_MASS_RANGE_FEMALE: MetricRange = {
  min: 1.5,
  max: 3.5,
  zones: [
    {
      label: 'Faible',
      start: 1.5,
      end: 2.2,
      color: '#EF4444',
      status: 'danger',
    },
    {
      label: 'Normal',
      start: 2.2,
      end: 2.5,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Bon',
      start: 2.5,
      end: 3.5,
      color: '#10B981',
      status: 'optimal',
    },
  ],
  unit: 'kg',
  source: 'Kanis JA et al. Lancet 2002 - PMID: 12049882',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/12049882/',
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
};

export const WATER_PERCENTAGE_RANGE_MALE: MetricRange = {
  min: 40,
  max: 70,
  zones: [
    {
      label: 'Déshydraté',
      start: 40,
      end: 50,
      color: '#EF4444',
      status: 'danger',
    },
    {
      label: 'Bas',
      start: 50,
      end: 55,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Optimal',
      start: 55,
      end: 65,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Élevé',
      start: 65,
      end: 70,
      color: '#22C55E',
      status: 'good',
    },
  ],
  unit: '%',
  source: 'Watson PE et al. Am J Clin Nutr 1980 - PMID: 6986753',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/6986753/',
  explanation: `L'eau corporelle totale (TBW) represente environ 60% du poids chez l'homme adulte.

CLASSIFICATION (Watson et al. 1980):
- <50% : Deshydratation probable
- 50-55% : Legerement bas
- 55-65% : Optimal
- >65% : Excellente hydratation

PREUVES SCIENTIFIQUES:
- Muscle = 73% d'eau, Graisse = 10% d'eau (Wang Z, Am J Clin Nutr 1999)
- Deshydratation de 2% = -10-20% de performance (Sawka MN, Med Sci Sports 2007)

CE QUI INFLUENCE LA MESURE:
- Moment de la journee
- Repas recents
- Exercice, temperature
- Cafeine, alcool

BESOINS QUOTIDIENS (IOM 2004):
Environ 3.7L/jour pour hommes (toutes sources: eau, boissons, aliments).
Environ 20% vient de l'alimentation.

CONSEIL:
Surveille la couleur de l'urine: jaune pale = bien hydrate.`,
};

export const WATER_PERCENTAGE_RANGE_FEMALE: MetricRange = {
  min: 40,
  max: 65,
  zones: [
    {
      label: 'Déshydraté',
      start: 40,
      end: 45,
      color: '#EF4444',
      status: 'danger',
    },
    {
      label: 'Bas',
      start: 45,
      end: 50,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Optimal',
      start: 50,
      end: 60,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Élevé',
      start: 60,
      end: 65,
      color: '#22C55E',
      status: 'good',
    },
  ],
  unit: '%',
  source: 'Watson PE et al. Am J Clin Nutr 1980 - PMID: 6986753',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/6986753/',
  explanation: `L'eau corporelle totale (TBW) represente environ 50-55% du poids chez la femme adulte.

CLASSIFICATION (Watson et al. 1980):
- <45% : Deshydratation probable
- 45-50% : Legerement bas
- 50-60% : Optimal
- >60% : Excellente hydratation

POURQUOI MOINS D'EAU QUE LES HOMMES:
Plus de masse grasse essentielle (graisse = 10% d'eau vs muscle = 73%).

VARIATIONS HORMONALES:
- Phase luteale: retention +1-2kg d'eau
- Fluctuations de 2-3% normales pendant le cycle

BESOINS QUOTIDIENS (IOM 2004):
Environ 2.7L/jour pour femmes (toutes sources).

CONSEIL:
Boire regulierement, pas de grandes quantites d'un coup.`,
};

// ============================================
// MÉTABOLISME
// ============================================

export const BMR_RANGE_MALE: (weight: number, height: number, age: number) => MetricRange = (
  weight,
  height,
  age
) => {
  // Formule Mifflin-St Jeor pour hommes: BMR = 10*weight + 6.25*height - 5*age + 5
  const idealBMR = 10 * weight + 6.25 * height - 5 * age + 5;
  const min = Math.floor(idealBMR * 0.7);
  const max = Math.ceil(idealBMR * 1.3);

  return {
    min,
    max,
    zones: [
      {
        label: 'Faible',
        start: min,
        end: idealBMR * 0.85,
        color: '#F59E0B',
        status: 'moderate',
      },
      {
        label: 'Normal',
        start: idealBMR * 0.85,
        end: idealBMR * 1.15,
        color: '#10B981',
        status: 'optimal',
      },
      {
        label: 'Élevé',
        start: idealBMR * 1.15,
        end: max,
        color: '#22C55E',
        status: 'good',
      },
    ],
    unit: 'kcal',
    source: 'Mifflin MD et al. Am J Clin Nutr 1990 - PMID: 2305711',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
    explanation: `Le metabolisme de base (BMR) = energie brulee au repos complet pendant 24h.

TON BMR ESTIME: environ ${Math.round(idealBMR)} kcal/jour
(Base sur: ${weight}kg, ${height}cm, ${age} ans)

EQUATION MIFFLIN-ST JEOR (Mifflin et al. 1990):
Validee sur 498 sujets, precision +/-10% vs calorimetrie indirecte.
BMR = 10 x poids + 6.25 x taille - 5 x age + 5

DEPENSE TOTALE (facteurs d'activite valides):
- Sedentaire (1.2): environ ${Math.round(idealBMR * 1.2)} kcal
- Peu actif (1.375): environ ${Math.round(idealBMR * 1.375)} kcal
- Actif (1.55): environ ${Math.round(idealBMR * 1.55)} kcal
- Tres actif (1.725): environ ${Math.round(idealBMR * 1.725)} kcal

FACTEURS D'INFLUENCE:
- Masse musculaire: +13 kcal/kg muscle/jour
- Age: -2% par decennie apres 20 ans
- Genetique: +/-5-10% de variation

DEFICIT/SURPLUS RECOMMANDE:
- Perte de poids: -300 a -500 kcal/jour
- Prise de muscle: +200 a +300 kcal/jour`,
  };
};

export const BMR_RANGE_FEMALE: (weight: number, height: number, age: number) => MetricRange = (
  weight,
  height,
  age
) => {
  // Formule Mifflin-St Jeor pour femmes: BMR = 10*weight + 6.25*height - 5*age - 161
  const idealBMR = 10 * weight + 6.25 * height - 5 * age - 161;
  const min = Math.floor(idealBMR * 0.7);
  const max = Math.ceil(idealBMR * 1.3);

  return {
    min,
    max,
    zones: [
      {
        label: 'Faible',
        start: min,
        end: idealBMR * 0.85,
        color: '#F59E0B',
        status: 'moderate',
      },
      {
        label: 'Normal',
        start: idealBMR * 0.85,
        end: idealBMR * 1.15,
        color: '#10B981',
        status: 'optimal',
      },
      {
        label: 'Élevé',
        start: idealBMR * 1.15,
        end: max,
        color: '#22C55E',
        status: 'good',
      },
    ],
    unit: 'kcal',
    source: 'Mifflin MD et al. Am J Clin Nutr 1990 - PMID: 2305711',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
    explanation: `Le metabolisme de base (BMR) = energie brulee au repos complet pendant 24h.

TON BMR ESTIME: environ ${Math.round(idealBMR)} kcal/jour
(Base sur: ${weight}kg, ${height}cm, ${age} ans)

EQUATION MIFFLIN-ST JEOR (Mifflin et al. 1990):
Validee sur 498 sujets, precision +/-10%.
BMR = 10 x poids + 6.25 x taille - 5 x age - 161

DEPENSE TOTALE:
- Sedentaire (1.2): environ ${Math.round(idealBMR * 1.2)} kcal
- Peu active (1.375): environ ${Math.round(idealBMR * 1.375)} kcal
- Active (1.55): environ ${Math.round(idealBMR * 1.55)} kcal
- Tres active (1.725): environ ${Math.round(idealBMR * 1.725)} kcal

ATTENTION:
Ne JAMAIS descendre sous ton BMR (${Math.round(idealBMR)} kcal).
Risque: carences, perte musculaire, effet yo-yo.

CONSEIL:
Augmente ton BMR via la masse musculaire!`,
  };
};

// ============================================
// SANTÉ CARDIOVASCULAIRE
// ============================================

export const RESTING_HR_RANGE: MetricRange = {
  min: 40,
  max: 100,
  zones: [
    {
      label: 'Athlète',
      start: 40,
      end: 55,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Excellent',
      start: 55,
      end: 60,
      color: '#22C55E',
      status: 'good',
    },
    {
      label: 'Bon',
      start: 60,
      end: 70,
      color: '#84CC16',
      status: 'good',
    },
    {
      label: 'Moyen',
      start: 70,
      end: 80,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Élevé',
      start: 80,
      end: 100,
      color: '#EF4444',
      status: 'danger',
    },
  ],
  unit: 'bpm',
  source: 'Fox K et al. Eur Heart J 2007 - PMID: 17303589',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/17303589/',
  explanation: `La frequence cardiaque au repos est un predicteur independant de mortalite cardiovasculaire.

CLASSIFICATION (Fox et al. 2007, meta-analyse 46 etudes):
- 40-55 bpm : Athlete - Coeur tres efficace
- 55-60 bpm : Excellent
- 60-70 bpm : Bon - Moyenne population
- 70-80 bpm : Moyen
- 80-100 bpm : Eleve - Risque CV augmente
- >100 bpm : Tachycardie - Consultation

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
};

export const VO2_MAX_RANGE_MALE: (age: number) => MetricRange = (age) => {
  // VO2 max diminue avec l'âge
  const maxForAge = age < 30 ? 55 : age < 40 ? 50 : age < 50 ? 45 : age < 60 ? 40 : 35;

  return {
    min: 20,
    max: 65,
    zones: [
      {
        label: 'Faible',
        start: 20,
        end: maxForAge * 0.6,
        color: '#EF4444',
        status: 'danger',
      },
      {
        label: 'Moyen',
        start: maxForAge * 0.6,
        end: maxForAge * 0.8,
        color: '#F59E0B',
        status: 'moderate',
      },
      {
        label: 'Bon',
        start: maxForAge * 0.8,
        end: maxForAge,
        color: '#22C55E',
        status: 'good',
      },
      {
        label: 'Excellent',
        start: maxForAge,
        end: 65,
        color: '#10B981',
        status: 'optimal',
      },
    ],
    unit: 'ml/kg/min',
    source: 'Kodama S et al. JAMA 2009 - PMID: 19454641',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/19454641/',
    explanation: `La VO2 max = capacite maximale d'utilisation d'oxygene a l'effort.

CLASSIFICATION POUR TON AGE (${age} ans):
- <${Math.round(maxForAge * 0.6)} : Faible
- ${Math.round(maxForAge * 0.6)}-${Math.round(maxForAge * 0.8)} : Moyen
- ${Math.round(maxForAge * 0.8)}-${maxForAge} : Bon
- >${maxForAge} : Excellent

PREUVES SCIENTIFIQUES (Kodama et al. JAMA 2009):
Meta-analyse 33 etudes, 102 980 sujets:
- +1 MET (3.5 ml/kg/min) = -13% mortalite toutes causes
- +1 MET = -15% mortalite cardiovasculaire

DECLIN AVEC L'AGE:
-1% par an apres 25 ans (Hawkins S, Sports Med 2003)
L'entrainement ralentit ce declin d'environ 50%.

VALEURS DE REFERENCE:
- Sedentaire: 25-35 ml/kg/min
- Actif: 40-50 ml/kg/min
- Athlete: 55-70 ml/kg/min
- Elite: 70-90 ml/kg/min

AMELIORATION:
HIIT: +15-20% en 8-12 semaines (Milanovic Z, Sports Med 2015)`,
  };
};

// ============================================
// MENSURATIONS
// ============================================

// Tour de taille avec ratio taille/hauteur - PLUS PRÉCIS que les valeurs absolues
export const WAIST_CIRCUMFERENCE_RANGE_MALE: MetricRange = {
  min: 60,
  max: 120,
  zones: [
    {
      label: 'Optimal',
      start: 60,
      end: 90,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Attention',
      start: 90,
      end: 102,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Risque élevé',
      start: 102,
      end: 120,
      color: '#EF4444',
      status: 'danger',
    },
  ],
  unit: 'cm',
  source: 'Ashwell M et al. Obes Rev 2012 - PMID: 22106927',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/22106927/',
  explanation: `TOUR DE TAILLE - Les seuils absolus (90cm, 102cm) sont des reperes GENERAUX.

METHODE PLUS PRECISE - Ratio Tour de taille/Hauteur (WHtR):
Divise ton tour de taille par ta taille (hauteur):
- < 0.4 : Sous-poids possible
- 0.4-0.5 : Zone ideale
- 0.5-0.6 : Risque modere
- > 0.6 : Risque eleve

EXEMPLES CONCRETS:
- 1m75 de hauteur = Tour de taille ideal: 70-87cm
- 1m90 de hauteur = Tour de taille ideal: 76-95cm
- 2m10 de hauteur = Tour de taille ideal: 84-105cm

PREUVES (Ashwell et al. 2012, meta-analyse):
Le WHtR predit MIEUX le risque cardiometabolique que l'IMC ou le tour de taille seul.
"Keep your waist to less than half your height"

RISQUE CARDIOVASCULAIRE:
- WHtR <0.5: risque faible
- WHtR >0.5: risque augmente
- WHtR >0.6: risque eleve

MESURE DU TOUR DE TAILLE:
Au niveau du nombril, debout, apres expiration normale.`,
};

export const WAIST_CIRCUMFERENCE_RANGE_FEMALE: MetricRange = {
  min: 55,
  max: 110,
  zones: [
    {
      label: 'Optimal',
      start: 55,
      end: 80,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Attention',
      start: 80,
      end: 88,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Risque élevé',
      start: 88,
      end: 110,
      color: '#EF4444',
      status: 'danger',
    },
  ],
  unit: 'cm',
  source: 'Ashwell M et al. Obes Rev 2012 - PMID: 22106927',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/22106927/',
  explanation: `TOUR DE TAILLE - Les seuils absolus (80cm, 88cm) sont des reperes GENERAUX.

METHODE PLUS PRECISE - Ratio Tour de taille/Hauteur (WHtR):
Divise ton tour de taille par ta taille (hauteur):
- < 0.4 : Sous-poids possible
- 0.4-0.5 : Zone ideale
- 0.5-0.6 : Risque modere
- > 0.6 : Risque eleve

EXEMPLES CONCRETS:
- 1m60 de hauteur = Tour de taille ideal: 64-80cm
- 1m70 de hauteur = Tour de taille ideal: 68-85cm
- 1m80 de hauteur = Tour de taille ideal: 72-90cm

PREUVES (Ashwell et al. 2012):
Le WHtR est un meilleur predicteur du risque cardiometabolique que l'IMC ou le tour de taille seul.

MESURE DU TOUR DE TAILLE:
Au niveau du nombril, debout, apres expiration normale.`,
};

export const WAIST_HIP_RATIO_MALE: MetricRange = {
  min: 0.7,
  max: 1.1,
  zones: [
    {
      label: 'Excellent',
      start: 0.7,
      end: 0.85,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Bon',
      start: 0.85,
      end: 0.95,
      color: '#22C55E',
      status: 'good',
    },
    {
      label: 'Modéré',
      start: 0.95,
      end: 1.0,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Risque élevé',
      start: 1.0,
      end: 1.1,
      color: '#EF4444',
      status: 'danger',
    },
  ],
  unit: '',
  source: 'Yusuf S et al. Lancet 2005 - PMID: 16271645 (INTERHEART)',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/16271645/',
  explanation: `Le ratio tour de taille/hanches (WHR) = tour de taille / tour de hanches.

CLASSIFICATION (etude INTERHEART, 27 000 sujets):
- <0.85 : Excellent - Risque CV faible
- 0.85-0.95 : Bon - Risque modere
- 0.95-1.0 : Modere - Surveillance
- >1.0 : Risque eleve

PREUVES (Yusuf et al. Lancet 2005):
- WHR = meilleur predicteur d'infarctus que l'IMC
- WHR >0.9 = risque x2-3 d'infarctus
- Etude multicentrique 52 pays

COMMENT MESURER:
- Tour de taille: au nombril
- Tour de hanches: point le plus large

INTERPRETATION:
"Forme pomme" (WHR eleve) = plus de risques
"Forme poire" (WHR bas) = moins de risques

AVANTAGE:
Fonctionne pour toutes morphologies (proportions, pas valeurs absolues).`,
};

export const WAIST_HIP_RATIO_FEMALE: MetricRange = {
  min: 0.65,
  max: 1.0,
  zones: [
    {
      label: 'Excellent',
      start: 0.65,
      end: 0.75,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Bon',
      start: 0.75,
      end: 0.80,
      color: '#22C55E',
      status: 'good',
    },
    {
      label: 'Modéré',
      start: 0.80,
      end: 0.85,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Risque élevé',
      start: 0.85,
      end: 1.0,
      color: '#EF4444',
      status: 'danger',
    },
  ],
  unit: '',
  source: 'Yusuf S et al. Lancet 2005 - PMID: 16271645 (INTERHEART)',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/16271645/',
  explanation: `Le ratio tour de taille/hanches (WHR) = tour de taille / tour de hanches.

CLASSIFICATION (etude INTERHEART):
- <0.75 : Excellent - Risque CV faible
- 0.75-0.80 : Bon - Risque modere
- 0.80-0.85 : Modere - Surveillance
- >0.85 : Risque eleve

PREUVES (Yusuf et al. Lancet 2005):
- WHR = meilleur predicteur d'infarctus que l'IMC
- Etude sur 27 000 sujets dans 52 pays

MORPHOLOGIE FEMININE:
WHR naturellement plus bas (hanches plus larges).
Un WHR <0.75 ("silhouette en sablier") est associe a un risque CV faible.

AVANTAGE:
Fonctionne pour toutes morphologies car compare des proportions.`,
};

// ============================================
// IMC (BMI)
// ============================================

export const BMI_RANGE: MetricRange = {
  min: 15,
  max: 40,
  zones: [
    {
      label: 'Sous-poids',
      start: 15,
      end: 18.5,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Normal',
      start: 18.5,
      end: 25,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Surpoids',
      start: 25,
      end: 30,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Obésité',
      start: 30,
      end: 40,
      color: '#EF4444',
      status: 'danger',
    },
  ],
  unit: '',
  source: 'Prospective Studies Collaboration, Lancet 2009 - PMID: 19299006',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/19299006/',
  explanation: `L'Indice de Masse Corporelle (IMC) = Poids (kg) / Taille au carre (m2)

CLASSIFICATION (Prospective Studies Collaboration 2009):
Meta-analyse de 57 etudes, 894 576 sujets:
- < 18.5 : Sous-poids - Mortalite augmentee
- 18.5-25 : Normal - Mortalite minimale
- 25-30 : Surpoids - +environ 30% mortalite
- 30-35 : Obesite I - +environ 70% mortalite
- 35-40 : Obesite II - Risques eleves
- > 40 : Obesite III - Risques tres eleves

PREUVES SCIENTIFIQUES:
- IMC optimal = 22.5-25 pour mortalite minimale
- +5 kg/m2 au-dessus de 25 = +30% mortalite cardiovasculaire

LIMITES RECONNUES:
- Ne distingue pas muscle/graisse
- Moins fiable: athletes, ages, ethnies asiatiques

CONSEIL:
Complete avec tour de taille (WHtR) et % masse grasse pour une evaluation complete.`,
};

// ============================================
// SOMMEIL ET RÉCUPÉRATION
// ============================================

export const SLEEP_HOURS_RANGE: MetricRange = {
  min: 4,
  max: 12,
  zones: [
    {
      label: 'Insuffisant',
      start: 4,
      end: 6,
      color: '#EF4444',
      status: 'danger',
    },
    {
      label: 'Court',
      start: 6,
      end: 7,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Optimal',
      start: 7,
      end: 9,
      color: '#10B981',
      status: 'optimal',
    },
    {
      label: 'Long',
      start: 9,
      end: 12,
      color: '#22C55E',
      status: 'good',
    },
  ],
  unit: 'h',
  source: 'Cappuccio FP et al. Sleep 2010 - PMID: 20469800',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/20469800/',
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
};

export const SLEEP_QUALITY_RANGE: MetricRange = {
  min: 0,
  max: 100,
  zones: [
    {
      label: 'Mauvaise',
      start: 0,
      end: 50,
      color: '#EF4444',
      status: 'danger',
    },
    {
      label: 'Moyenne',
      start: 50,
      end: 70,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Bonne',
      start: 70,
      end: 85,
      color: '#22C55E',
      status: 'good',
    },
    {
      label: 'Excellente',
      start: 85,
      end: 100,
      color: '#10B981',
      status: 'optimal',
    },
  ],
  unit: '%',
  source: 'Ohayon M et al. Sleep Med Rev 2017 - PMID: 27568340',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/27568340/',
  explanation: `La qualite du sommeil = efficacite (temps endormi / temps au lit).

CLASSIFICATION (consensus NSF, Ohayon et al. 2017):
- <50% : Mauvaise - Insomnie clinique probable
- 50-70% : Moyenne - Sommeil fragmente
- 70-85% : Bonne - Sommeil correct
- >85% : Excellente - Sommeil reparateur

CRITERES DE QUALITE (Buysse DJ, Sleep 2014):
- Latence <15-20 min
- Reveils <2x/nuit
- Efficacite >85%
- Sommeil profond 15-25%
- REM 20-25%

CE QUI DEGRADE:
- Alcool (reduit le sommeil profond)
- Ecrans bleus
- Cafeine apres 14h
- Temperature >22 degres C

IMPACT PERFORMANCE:
- +20% performance sportive avec bon sommeil (Mah CD, Sleep 2011)
- Recuperation musculaire pendant sommeil profond

CONSEIL:
Qualite > Duree. 7h de qualite > 9h fragmentees.`,
};

export const HRV_RANGE: MetricRange = {
  min: 20,
  max: 100,
  zones: [
    {
      label: 'Faible',
      start: 20,
      end: 40,
      color: '#EF4444',
      status: 'danger',
    },
    {
      label: 'Moyen',
      start: 40,
      end: 60,
      color: '#F59E0B',
      status: 'moderate',
    },
    {
      label: 'Bon',
      start: 60,
      end: 80,
      color: '#22C55E',
      status: 'good',
    },
    {
      label: 'Excellent',
      start: 80,
      end: 100,
      color: '#10B981',
      status: 'optimal',
    },
  ],
  unit: 'ms',
  source: 'Task Force ESC/NASPE, Circulation 1996 - PMID: 8598068',
  sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/8598068/',
  explanation: `La VFC (HRV) mesure les variations entre chaque battement cardiaque.

CLASSIFICATION (RMSSD, valeurs moyennes):
- 80+ ms : Excellent - Recuperation optimale
- 60-80 ms : Bon - Bonne adaptation
- 40-60 ms : Moyen - Recuperation en cours
- 20-40 ms : Faible - Stress physiologique

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
};

// ============================================
// HELPER FUNCTION
// ============================================

export const getMetricRange = (
  metricKey: string,
  gender: 'male' | 'female',
  additionalParams?: { weight?: number; height?: number; age?: number }
): MetricRange | null => {
  switch (metricKey) {
    case 'visceralFat':
      return VISCERAL_FAT_RANGE;
    case 'bodyFat':
      return gender === 'male' ? BODY_FAT_RANGE_MALE : BODY_FAT_RANGE_FEMALE;
    case 'muscleMass':
      return gender === 'male' ? MUSCLE_MASS_RANGE_MALE : MUSCLE_MASS_RANGE_FEMALE;
    case 'boneMass':
      return gender === 'male' ? BONE_MASS_RANGE_MALE : BONE_MASS_RANGE_FEMALE;
    case 'waterPercentage':
      return gender === 'male' ? WATER_PERCENTAGE_RANGE_MALE : WATER_PERCENTAGE_RANGE_FEMALE;
    case 'bmr':
      if (additionalParams?.weight && additionalParams?.height && additionalParams?.age) {
        return gender === 'male'
          ? BMR_RANGE_MALE(additionalParams.weight, additionalParams.height, additionalParams.age)
          : BMR_RANGE_FEMALE(additionalParams.weight, additionalParams.height, additionalParams.age);
      }
      return null;
    case 'restingHR':
      return RESTING_HR_RANGE;
    case 'vo2Max':
      if (additionalParams?.age) {
        return gender === 'male' ? VO2_MAX_RANGE_MALE(additionalParams.age) : null;
      }
      return null;
    case 'waistCircumference':
      return gender === 'male' ? WAIST_CIRCUMFERENCE_RANGE_MALE : WAIST_CIRCUMFERENCE_RANGE_FEMALE;
    case 'waistHipRatio':
      return gender === 'male' ? WAIST_HIP_RATIO_MALE : WAIST_HIP_RATIO_FEMALE;
    case 'sleepHours':
      return SLEEP_HOURS_RANGE;
    case 'sleepQuality':
      return SLEEP_QUALITY_RANGE;
    case 'hrv':
      return HRV_RANGE;
    case 'bmi':
      return BMI_RANGE;
    default:
      return null;
  }
};
