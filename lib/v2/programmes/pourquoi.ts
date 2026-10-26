/**
 * « Pourquoi ? » (26 octobre 2026). Houari : « Même si tu fais de la muscu depuis deux ans, tu ne sais pas forcément
 * comment t'entraîner pour la force ou pour être tracé. » Deux choses, données pures, testées dans
 * __tests__/unit/pourquoi.test.ts :
 *  1. POURQUOI_MODULE : pour chaque module (modules.ts), la science en mots simples et les études ;
 *  2. CONSEILS_OBJECTIF : pour chaque objectif du départ, le conseil du coach (comment s'entraîner pour ça),
 *     ses études et les modules à ajouter « si tu veux ».
 * Rien d'inventé : chaque phrase reprend une étude de sources.ts (son « apport ») ou un principe du catalogue
 * (catalogue.ts), et chaque id de `sources` existe dans sources.ts (vérifié par le test).
 */
import type { ObjectifChoix } from './choix';
import type { ModuleId } from './modules';

/** Une icône de components/yoroi/v2/seances/Icon.tsx */
export type IconePourquoi = 'bolt' | 'glove' | 'body' | 'flame' | 'steps' | 'wind' | 'timer' | 'gauge' | 'moon' | 'scale' | 'chart' | 'dumbbell' | 'calendar' | 'target' | 'heart' | 'tape' | 'drop' | 'medal' | 'repeat' | 'mountain';

export type PointPourquoi = { icone: IconePourquoi; texte: string };

export type Explication = {
  titre: string;
  /** une ligne, sous le titre */
  ligne: string;
  icone: IconePourquoi;
  /** une idée par point, courte */
  points: PointPourquoi[];
  /** ids de sources.ts */
  sources: string[];
};

export type ConseilObjectif = Explication & {
  /** modules à proposer « si tu veux » pour cet objectif */
  modules: ModuleId[];
};

/* ------------------------------------------------ les modules ------------------------------------------------ */
export const POURQUOI_MODULE: Record<ModuleId, Explication> = {
  force: {
    titre: 'Module Force',
    ligne: 'Le premier gros mouvement du jour passe en lourd.',
    icone: 'bolt',
    points: [
      { icone: 'dumbbell', texte: 'Pour la force, les charges lourdes font mieux que les légères : 3 à 5 répétitions sur les gros mouvements.' },
      { icone: 'chart', texte: 'Pour le muscle, léger ou lourd donne autant si tu finis près de l’échec. La différence se joue sur la force.' },
      { icone: 'timer', texte: 'Prends 3 minutes de repos sur les gros mouvements : tu récupères assez pour garder la charge.' },
      { icone: 'gauge', texte: 'Lourd ne veut pas dire à l’échec : garde une ou deux répétitions en réserve, la technique d’abord.' },
    ],
    sources: ['schoenfeld2017charges', 'lopez2021', 'schoenfeld2016repos', 'robinson2024'],
  },
  grip: {
    titre: 'Module Grip',
    ligne: 'Deux exercices de prise ajoutés à ta séance.',
    icone: 'glove',
    points: [
      { icone: 'medal', texte: 'La force et l’endurance de préhension font partie du profil des judokas de haut niveau.' },
      { icone: 'chart', texte: 'Les tractions et la suspension au judogi ont des tables de référence : de quoi te situer et suivre tes progrès.' },
      { icone: 'glove', texte: 'Passe un kimono ou une serviette sur la barre dès que tu peux : c’est la prise du combat.' },
      { icone: 'target', texte: 'Aucune étude ne donne de dosage précis pour le grip en combat : les séries sont des repères prudents.' },
      { icone: 'heart', texte: 'En JJB, la main et les doigts sont la zone la plus blessée : arrête si un doigt fait mal.' },
    ],
    sources: ['franchini2011judo', 'branco2017', 'mcdonald2017'],
  },
  cou: {
    titre: 'Module Cou',
    ligne: 'Un exercice de cou ajouté à ta séance.',
    icone: 'body',
    points: [
      { icone: 'chart', texte: 'Le renforcement du cou augmente nettement sa force : c’est ce que montrent 26 articles.' },
      { icone: 'body', texte: 'Un cou plus fort est associé à moins de commotions chez 6662 lycéens. Mais aucun essai n’a montré qu’entraîner le cou seul en évite.' },
      { icone: 'gauge', texte: 'Isométrique d’abord : tu pousses la tête contre ta main, sans bouger, à effort moyen. Jamais d’à coup.' },
      { icone: 'heart', texte: 'Douleur qui descend dans le bras, fourmillements ou vertige : arrête et consulte.' },
    ],
    sources: ['ivanic2024', 'collins2014'],
  },
  abdos: {
    titre: 'Module Abdos',
    ligne: 'Un exercice d’abdos à la fin de ta séance.',
    icone: 'flame',
    points: [
      { icone: 'body', texte: 'Les abdos renforcent ton tronc.' },
      { icone: 'tape', texte: 'Six semaines d’abdos seuls n’ont pas fait baisser la graisse du ventre.' },
      { icone: 'target', texte: 'Travailler une zone ne fait pas fondre la graisse de cette zone : le corps puise partout à la fois.' },
      { icone: 'flame', texte: 'Ce qui fait baisser le ventre : l’alimentation et la dépense totale. Le sport réduit la graisse du ventre, même quand la balance bouge peu.' },
    ],
    sources: ['vispute2011', 'ramirez2013', 'verheggen2016'],
  },
  cardio: {
    titre: 'Cardio zone 2',
    ligne: 'De la marche inclinée, à la fin de ta séance.',
    icone: 'steps',
    points: [
      { icone: 'heart', texte: 'Zone 2 : un effort où tu peux encore parler en phrases complètes. C’est un repère simple, sans montre.' },
      { icone: 'mountain', texte: 'Monte la pente plutôt que la vitesse : marcher à 10 % de pente dépense plus qu’à 5 %.' },
      { icone: 'target', texte: 'Lâche les barres du tapis : t’y accrocher en te penchant en arrière fait baisser la dépense d’environ un tiers.' },
      { icone: 'moon', texte: 'Peu de fatigue : tu récupères vite et tes séances de musculation n’en souffrent pas.' },
      { icone: 'chart', texte: 'Les sportifs d’endurance font environ 80 % de leurs séances en basse intensité.' },
      { icone: 'scale', texte: 'C’est ton alimentation qui fait fondre le gras, pas la marche seule : elle ajoute de la dépense.' },
    ],
    sources: ['persinger2004', 'hofmann2014', 'seiler2010', 'johns2014'],
  },
  mobilite: {
    titre: 'Module Mobilité',
    ligne: 'Des étirements en bloc, après ta séance.',
    icone: 'wind',
    points: [
      { icone: 'wind', texte: 'S’étirer régulièrement fait gagner de l’amplitude en quelques semaines.' },
      { icone: 'repeat', texte: 'La durée et la fréquence changent peu le gain : le plus important, c’est de le faire.' },
      { icone: 'calendar', texte: 'YOROI choisit les étirements qui vont avec ta séance : haut du corps, jambes ou hanches.' },
    ],
    sources: ['konrad2024'],
  },
};

/* ------------------------------------------------ les objectifs ------------------------------------------------ */
const MUSCLE: ConseilObjectif = {
  titre: 'Prendre du muscle',
  ligne: 'Assez de séries, chaque muscle deux fois par semaine.',
  icone: 'dumbbell',
  points: [
    { icone: 'calendar', texte: 'Chaque grand muscle au moins deux jours par semaine, au moins 10 séries par muscle et par semaine.' },
    { icone: 'gauge', texte: 'Arrête chaque série quand il te reste 1 à 3 répétitions en réserve : aller à l’échec n’apporte pas plus de muscle.' },
    { icone: 'chart', texte: 'Léger ou lourd : autant de muscle si tu vas près de l’échec.' },
    { icone: 'drop', texte: 'Les gains de muscle plafonnent vers 1,6 g de protéines par kilo et par jour.' },
  ],
  sources: ['acsm2026', 'refalo2023', 'schoenfeld2017charges', 'morton2018'],
  modules: [],
};

export const CONSEILS_OBJECTIF: Partial<Record<ObjectifChoix, ConseilObjectif>> = {
  force: {
    titre: 'Force',
    ligne: 'Lourd, peu de répétitions, de longs repos.',
    icone: 'bolt',
    points: [
      { icone: 'dumbbell', texte: 'Pour la force, les charges lourdes font mieux que les légères : 3 à 5 répétitions sur les gros mouvements.' },
      { icone: 'timer', texte: 'Prends 3 minutes de repos sur les gros mouvements : tu récupères assez pour garder la charge.' },
      { icone: 'gauge', texte: 'Lourd ne veut pas dire à l’échec : garde une ou deux répétitions en réserve, la technique d’abord.' },
      { icone: 'chart', texte: 'Pour le muscle, léger ou lourd donne autant si tu finis près de l’échec. La différence se joue sur la force.' },
    ],
    sources: ['schoenfeld2017charges', 'lopez2021', 'schoenfeld2016repos', 'robinson2024'],
    modules: ['force'],
  },
  perte: {
    titre: 'Perdre du poids',
    ligne: 'L’alimentation d’abord, le sport t’aide.',
    icone: 'scale',
    points: [
      { icone: 'scale', texte: 'Alimentation et sport ensemble font perdre environ 5 à 6 kg de plus que le sport seul.' },
      { icone: 'repeat', texte: 'Le sport seul fait perdre environ 2 kg, mais il aide beaucoup à ne pas reprendre.' },
      { icone: 'dumbbell', texte: 'Garde la musculation : elle garde ton muscle pendant que tu perds du gras.' },
      { icone: 'steps', texte: 'Plus de 150 minutes d’activité par semaine aident à perdre, plus de 250 aident à ne pas reprendre.' },
      { icone: 'chart', texte: 'Vise 0,5 à 1 % de ton poids par semaine : plus vite, tu perds du muscle.' },
    ],
    sources: ['johns2014', 'swift2014', 'donnelly2009', 'helms2014'],
    modules: ['cardio'],
  },
  seche: {
    titre: 'Être tracé',
    ligne: 'Un déficit raisonnable, la muscu lourde, des protéines.',
    icone: 'flame',
    points: [
      { icone: 'scale', texte: 'Le gras se perd avec un déficit calorique : l’entraînement garde ton muscle et ajoute de la dépense.' },
      { icone: 'chart', texte: 'Perte lente, environ 0,7 % par semaine : chez des athlètes, le muscle a augmenté. Perte rapide : il n’a pas bougé.' },
      { icone: 'dumbbell', texte: 'Garde la musculation lourde : c’est elle qui dit à ton corps de garder le muscle pendant le régime.' },
      { icone: 'drop', texte: 'Mange au moins 1,6 g de protéines par kilo et par jour, et plus en déficit si tu peux.' },
      { icone: 'target', texte: 'Les abdos renforcent ton tronc mais ne font pas fondre le ventre : c’est l’alimentation et la dépense totale qui comptent.' },
    ],
    sources: ['helms2014', 'garthe2011', 'morton2018', 'longland2016', 'vispute2011'],
    modules: ['cardio'],
  },
  ventre: {
    titre: 'Ventre plat',
    ligne: 'Les abdos ne font pas fondre le ventre.',
    icone: 'tape',
    points: [
      { icone: 'tape', texte: 'Six semaines d’abdos seuls n’ont pas fait baisser la graisse du ventre.' },
      { icone: 'target', texte: 'Travailler une zone ne fait pas fondre la graisse de cette zone : le corps puise partout à la fois.' },
      { icone: 'steps', texte: 'Le sport réduit la graisse du ventre, même quand la balance bouge peu.' },
      { icone: 'tape', texte: 'Mesure ton tour de taille chaque semaine : c’est là que le résultat se voit en premier.' },
    ],
    sources: ['vispute2011', 'ramirez2013', 'verheggen2016', 'ross2020'],
    modules: ['cardio', 'abdos'],
  },
  grip: {
    titre: 'Grip judo et JJB',
    ligne: 'Ta prise, travaillée à côté du club.',
    icone: 'glove',
    points: POURQUOI_MODULE.grip.points,
    sources: POURQUOI_MODULE.grip.sources,
    modules: ['grip'],
  },
  combat: {
    titre: 'Sport de combat',
    ligne: 'Ta muscu aide ton club, sans le fatiguer.',
    icone: 'glove',
    points: [
      { icone: 'medal', texte: 'En sports de combat, la force maximale (lutte, grappling) et la puissance rapide (frappe) séparent les meilleurs.' },
      { icone: 'calendar', texte: 'Deux séances de force par semaine : assez pour progresser sans voler l’énergie de tes entraînements.' },
      { icone: 'moon', texte: 'Place tes séances loin de tes sparrings les plus durs.' },
      { icone: 'body', texte: 'Un cou plus fort est associé à moins de commotions, mais personne ne peut te promettre d’éviter les KO.' },
      { icone: 'steps', texte: 'Le cardio long et fréquent freine la force et le muscle, la course plus que le vélo.' },
    ],
    sources: ['james2016', 'acsm2026', 'collins2014', 'ivanic2024', 'wilson2012'],
    modules: ['cou'],
  },
  muscle: MUSCLE,
  masse: { ...MUSCLE, titre: 'Prendre du poids' },
  course: {
    titre: 'Courir',
    ligne: 'Surtout du facile, un peu d’intense.',
    icone: 'steps',
    points: [
      { icone: 'chart', texte: 'Les sportifs d’endurance font environ 80 % de leurs séances en basse intensité et 20 % en haute intensité.' },
      { icone: 'heart', texte: 'Facile, c’est quand tu peux parler à l’aise en courant.' },
      { icone: 'dumbbell', texte: 'Ajoutée à la musculation, la course a freiné le muscle et la force, le vélo non : plus elle est longue et fréquente, plus elle freine.' },
    ],
    sources: ['seiler2010', 'persinger2004', 'wilson2012'],
    modules: [],
  },
  mobilite: {
    ...POURQUOI_MODULE.mobilite,
    titre: 'Souplesse et mobilité',
    ligne: 'Régulier compte plus que long.',
    modules: ['mobilite'],
  },
};

/** Les conseils des objectifs choisis, dans l'ordre choisi, sans doublon de titre (« Je n'y connais rien » n'en a pas) */
export function conseilsDesObjectifs(objectifs: readonly ObjectifChoix[]): (ConseilObjectif & { objectif: ObjectifChoix })[] {
  const out: (ConseilObjectif & { objectif: ObjectifChoix })[] = [];
  for (const o of objectifs) {
    const c = CONSEILS_OBJECTIF[o];
    if (c && !out.some((x) => x.titre === c.titre)) out.push({ ...c, objectif: o });
  }
  return out;
}
