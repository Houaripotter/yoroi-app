/**
 * Mesures ajoutées le 10 octobre 2026 (vague 12, rubriques Santé).
 * Tout ce qu'Apple Santé et Health Connect savent transmettre et qui sert au sport, au poids
 * ou à la santé : forme de course, nage, mobilité, alertes du cœur, ECG, sons, UV, nutriments...
 * La santé reproductive et l'activité sexuelle ne sont volontairement pas lues.
 * Repères seulement quand la source est sérieuse (aucun chiffre inventé).
 */
import type { MetricDef } from './metrics';
import { traduire } from '@/lib/i18n/tr';

export type NewMetricKey =
  // Activité et sports
  | 'temps-mouvement'
  | 'vitesse-velo'
  | 'ftp'
  | 'foulee'
  | 'oscillation'
  | 'contact-sol'
  | 'mouvements-nage'
  | 'profondeur'
  | 'temperature-eau'
  | 'distance-rame'
  | 'vitesse-rame'
  | 'distance-pagaie'
  | 'vitesse-pagaie'
  | 'distance-ski'
  | 'distance-ski-fond'
  | 'vitesse-ski-fond'
  | 'distance-glisse'
  | 'poussees-fauteuil'
  | 'distance-fauteuil'
  | 'effort-seance'
  | 'effort-estime'
  // Mobilité
  | 'vitesse-marche'
  | 'longueur-pas'
  | 'asymetrie-marche'
  | 'double-appui'
  | 'stabilite-marche'
  | 'vitesse-montee'
  | 'vitesse-descente'
  | 'marche-6-min'
  | 'chutes'
  | 'alerte-stabilite'
  // Cœur
  | 'fc-haute'
  | 'fc-basse'
  | 'rythme-irregulier'
  | 'ecg'
  | 'fibrillation'
  | 'perfusion'
  // Respiration et sommeil
  | 'cardio-faible'
  | 'capacite-vitale'
  | 'debit-expiratoire'
  | 'apnees'
  // Récupération
  | 'humeur'
  // Environnement
  | 'son-casque'
  | 'son-ambiant'
  | 'alerte-son-casque'
  | 'alerte-son-ambiant'
  | 'uv'
  // Corps
  | 'alcool-sang'
  | 'insuline'
  // Nutrition
  | 'boissons-alcool'
  | 'fibres'
  | 'sucres'
  | 'graisses-saturees'
  | 'graisses-mono'
  | 'graisses-poly'
  | 'cholesterol'
  | 'sodium'
  | 'potassium'
  | 'calcium'
  | 'magnesium'
  | 'fer'
  | 'zinc'
  | 'phosphore'
  | 'iode'
  | 'selenium'
  | 'cuivre'
  | 'manganese'
  | 'chrome'
  | 'molybdene'
  | 'chlorure'
  | 'vitamine-a'
  | 'vitamine-b1'
  | 'vitamine-b2'
  | 'vitamine-b3'
  | 'vitamine-b5'
  | 'vitamine-b6'
  | 'vitamine-b8'
  | 'vitamine-b9'
  | 'vitamine-b12'
  | 'vitamine-c'
  | 'vitamine-d'
  | 'vitamine-e'
  | 'vitamine-k';

const NUTRITION_APPS = traduire('Apps de nutrition (MyFitnessPal, Yazio, Cronometer, Samsung Health)');
const ALERT_READ = traduire("Une alerte de ta montre n'est pas un diagnostic. Si elles se répètent ou si tu te sens mal, parles-en à un médecin.");

type NutrientArgs = { key: NewMetricKey; label: string; unit: string; what: string; digits?: number; androidOnly?: boolean; iosOnly?: boolean; upIsGood?: boolean | null; norm?: MetricDef['norm']; howToRead?: string };

function nutrient(a: NutrientArgs): MetricDef {
  return {
    key: a.key as MetricDef['key'],
    label: a.label,
    family: 'nutrition',
    unit: a.unit,
    kind: 'sum',
    digits: a.digits ?? 0,
    upIsGood: a.upIsGood === undefined ? null : a.upIsGood,
    ext: true,
    androidOnly: a.androidOnly,
    iosOnly: a.iosOnly,
    what: a.what,
    norm: a.norm,
    howToRead: a.howToRead ?? traduire('Elle dépend de ce que tu notes dans ton app de nutrition. Compare tes semaines entre elles.'),
    devices: NUTRITION_APPS,
  };
}

/** Un minéral ou une vitamine noté dans une app de nutrition */
function micro(key: NewMetricKey, label: string, unit: string, role: string, extra: Partial<NutrientArgs> = {}): MetricDef {
  return nutrient({ key, label, unit, what: traduire("{0} Total noté dans ta journée par ton app de nutrition.", role), digits: unit === 'mg' ? 1 : 0, ...extra });
}

export const MORE_METRICS: MetricDef[] = [
  // ============ ACTIVITÉ ET SPORTS ============
  {
    key: 'temps-mouvement',
    label: traduire('Temps en mouvement'),
    family: 'activite',
    unit: 'min',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire("Les minutes passées à bouger, comptées par l'Apple Watch quand l'anneau Bouger est réglé en minutes plutôt qu'en calories."),
    devices: 'Apple Watch',
  },
  {
    key: 'vitesse-velo',
    label: traduire('Vitesse à vélo'),
    family: 'activite',
    unit: 'km/h',
    kind: 'avg',
    digits: 1,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Ta vitesse moyenne pendant tes sorties à vélo.'),
    howToRead: traduire('Elle dépend du parcours et du vent. Compare des sorties semblables.'),
    devices: traduire('Apple Watch, capteurs de vitesse, compteurs vélo'),
  },
  {
    key: 'ftp',
    label: traduire('Puissance au seuil (FTP)'),
    family: 'activite',
    unit: 'W',
    kind: 'latest',
    digits: 0,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire("La puissance que tu peux tenir environ une heure à vélo, estimée par ton app ou ton capteur de puissance."),
    howToRead: traduire('Elle sert à régler tes zones de puissance. Elle monte quand ton endurance progresse.'),
    devices: traduire('Apps vélo et capteurs de puissance compatibles Apple Santé'),
  },
  {
    key: 'foulee',
    label: traduire('Longueur de foulée'),
    family: 'activite',
    unit: 'm',
    kind: 'avg',
    digits: 2,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire('La distance couverte à chaque pas quand tu cours.'),
    howToRead: traduire('Elle s’allonge avec la vitesse. Compare des courses à allure semblable.'),
    devices: traduire('Apple Watch Series 6 et plus récentes, en course'),
  },
  {
    key: 'oscillation',
    label: traduire('Oscillation verticale'),
    family: 'activite',
    unit: 'cm',
    kind: 'avg',
    digits: 1,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire('De combien ton corps monte et descend à chaque foulée en course.'),
    howToRead: traduire('À allure égale, rebondir moins gaspille moins d’énergie. Suis la tendance sur des courses semblables.'),
    devices: traduire('Apple Watch Series 6 et plus récentes, en course'),
  },
  {
    key: 'contact-sol',
    label: traduire('Temps de contact au sol'),
    family: 'activite',
    unit: 'ms',
    kind: 'avg',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire('Le temps que ton pied reste au sol à chaque foulée en course.'),
    howToRead: traduire('Il raccourcit quand tu cours plus vite. Compare des courses à allure semblable.'),
    devices: traduire('Apple Watch Series 6 et plus récentes, en course'),
  },
  {
    key: 'mouvements-nage',
    label: traduire('Mouvements de nage'),
    family: 'activite',
    unit: 'mouvements',
    kind: 'sum',
    digits: 0,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire('Le nombre de mouvements de bras comptés par ta montre pendant tes séances de natation.'),
    howToRead: traduire('Pour une même distance, moins de mouvements veut dire une nage plus efficace.'),
    devices: 'Apple Watch',
  },
  {
    key: 'profondeur',
    label: traduire('Profondeur sous l’eau'),
    family: 'activite',
    unit: 'm',
    kind: 'avg',
    digits: 1,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire('La profondeur maximale atteinte dans la journée, en plongée ou en apnée.'),
    howToRead: traduire('Chaque point : la plus grande profondeur du jour.'),
    devices: traduire('Apple Watch Ultra, Series 10 et plus récentes'),
  },
  {
    key: 'temperature-eau',
    label: traduire('Température de l’eau'),
    family: 'activite',
    unit: '°C',
    kind: 'avg',
    digits: 1,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire("La température de l'eau mesurée par ta montre pendant la nage ou la plongée."),
    devices: traduire('Apple Watch Ultra, Series 10 et plus récentes'),
  },
  {
    key: 'distance-rame',
    label: traduire('Distance à la rame'),
    family: 'activite',
    unit: 'm',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Les mètres parcourus à l’aviron ou au rameur dans la journée.'),
    devices: traduire('Apple Watch, rameurs connectés'),
  },
  {
    key: 'vitesse-rame',
    label: traduire('Vitesse à la rame'),
    family: 'activite',
    unit: 'km/h',
    kind: 'avg',
    digits: 1,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Ta vitesse moyenne à l’aviron ou au rameur.'),
    devices: traduire('Apple Watch, rameurs connectés'),
  },
  {
    key: 'distance-pagaie',
    label: traduire('Distance en pagaie'),
    family: 'activite',
    unit: 'km',
    kind: 'sum',
    digits: 2,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Les kilomètres parcourus en kayak, canoë ou paddle.'),
    devices: 'Apple Watch',
  },
  {
    key: 'vitesse-pagaie',
    label: traduire('Vitesse en pagaie'),
    family: 'activite',
    unit: 'km/h',
    kind: 'avg',
    digits: 1,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Ta vitesse moyenne en kayak, canoë ou paddle.'),
    devices: 'Apple Watch',
  },
  {
    key: 'distance-ski',
    label: traduire('Distance en ski et snowboard'),
    family: 'activite',
    unit: 'km',
    kind: 'sum',
    digits: 1,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Les kilomètres descendus en ski alpin ou en snowboard.'),
    devices: traduire('Apple Watch, apps de ski'),
  },
  {
    key: 'distance-ski-fond',
    label: traduire('Distance en ski de fond'),
    family: 'activite',
    unit: 'km',
    kind: 'sum',
    digits: 1,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Les kilomètres parcourus en ski de fond.'),
    devices: 'Apple Watch',
  },
  {
    key: 'vitesse-ski-fond',
    label: traduire('Vitesse en ski de fond'),
    family: 'activite',
    unit: 'km/h',
    kind: 'avg',
    digits: 1,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Ta vitesse moyenne en ski de fond.'),
    devices: 'Apple Watch',
  },
  {
    key: 'distance-glisse',
    label: traduire('Distance en patins'),
    family: 'activite',
    unit: 'km',
    kind: 'sum',
    digits: 1,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Les kilomètres parcourus en roller, patin à glace ou skate.'),
    devices: 'Apple Watch',
  },
  {
    key: 'poussees-fauteuil',
    label: traduire('Poussées en fauteuil'),
    family: 'activite',
    unit: traduire('poussées'),
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    ext: true,
    what: traduire('Le nombre de poussées sur les roues de ton fauteuil, comptées à la place des pas.'),
    devices: 'Apple Watch en mode fauteuil, Health Connect',
  },
  {
    key: 'distance-fauteuil',
    label: traduire('Distance en fauteuil'),
    family: 'activite',
    unit: 'km',
    kind: 'sum',
    digits: 1,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Les kilomètres parcourus en fauteuil roulant.'),
    devices: 'Apple Watch en mode fauteuil',
  },
  {
    key: 'effort-seance',
    label: traduire('Effort ressenti'),
    family: 'activite',
    unit: '/10',
    kind: 'avg',
    digits: 0,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire("La note d'effort de 1 à 10 que tu donnes à ta séance sur ta montre."),
    howToRead: traduire('De 1 à 3 : facile. De 4 à 6 : modéré. De 7 à 8 : dur. De 9 à 10 : tout donné.'),
    devices: traduire('Apple Watch (watchOS 11 et plus récent)'),
  },
  {
    key: 'effort-estime',
    label: traduire('Effort estimé'),
    family: 'activite',
    unit: '/10',
    kind: 'avg',
    digits: 0,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire("La note d'effort de 1 à 10 que ta montre propose à la fin de la séance, selon ton cœur et ton allure."),
    howToRead: traduire('Compare-la à ton ressenti : un écart régulier peut signaler de la fatigue.'),
    devices: traduire('Apple Watch (watchOS 11 et plus récent)'),
  },
  // ============ MOBILITÉ ============
  {
    key: 'vitesse-marche',
    label: traduire('Vitesse de marche'),
    family: 'mobilite',
    unit: 'km/h',
    kind: 'avg',
    digits: 1,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire("Ta vitesse quand tu marches sur du plat, mesurée par l'iPhone en poche."),
    norm: {
      text: traduire("Après 65 ans, une vitesse de marche habituelle d'au moins 1 mètre par seconde, soit 3,6 km/h, est associée à une meilleure espérance de vie."),
      source: 'Studenski et al., JAMA, 2011',
    },
    devices: traduire('iPhone (en poche ou à la ceinture)'),
  },
  {
    key: 'longueur-pas',
    label: traduire('Longueur de pas'),
    family: 'mobilite',
    unit: 'cm',
    kind: 'avg',
    digits: 0,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('La distance entre tes deux pieds à chaque pas quand tu marches.'),
    howToRead: traduire('Elle dépend de ta taille. Une baisse durable peut suivre une blessure ou une fatigue.'),
    devices: traduire('iPhone (en poche ou à la ceinture)'),
  },
  {
    key: 'asymetrie-marche',
    label: traduire('Asymétrie de marche'),
    family: 'mobilite',
    unit: '%',
    kind: 'avg',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire("La part des pas où ton pied gauche et ton pied droit n'avancent pas au même rythme."),
    howToRead: traduire('Plus elle est basse, plus ta marche est régulière. Une hausse après une blessure montre que tu compenses encore.'),
    devices: traduire('iPhone (en poche ou à la ceinture)'),
  },
  {
    key: 'double-appui',
    label: traduire('Temps en double appui'),
    family: 'mobilite',
    unit: '%',
    kind: 'avg',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire('La part du temps de marche où tes deux pieds touchent le sol en même temps.'),
    howToRead: traduire('Il augmente quand on cherche plus d’équilibre. Suis ta propre tendance.'),
    devices: traduire('iPhone (en poche ou à la ceinture)'),
  },
  {
    key: 'stabilite-marche',
    label: traduire('Stabilité de marche'),
    family: 'mobilite',
    unit: '%',
    kind: 'latest',
    digits: 0,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire("L'estimation par l'iPhone de ton équilibre et de ta stabilité en marchant."),
    howToRead: traduire("Apple la classe en correcte, basse ou très basse. Le travail d'équilibre et de force des jambes la fait remonter."),
    devices: traduire('iPhone 8 et plus récents'),
  },
  {
    key: 'vitesse-montee',
    label: traduire('Vitesse en montée d’escalier'),
    family: 'mobilite',
    unit: 'm/s',
    kind: 'avg',
    digits: 2,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('La vitesse à laquelle tu montes un escalier, mesurée par la hauteur gagnée.'),
    howToRead: traduire('Elle reflète la force de tes jambes. Compare-toi à toi-même.'),
    devices: traduire('iPhone (en poche ou à la ceinture)'),
  },
  {
    key: 'vitesse-descente',
    label: traduire('Vitesse en descente d’escalier'),
    family: 'mobilite',
    unit: 'm/s',
    kind: 'avg',
    digits: 2,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('La vitesse à laquelle tu descends un escalier.'),
    howToRead: traduire('Elle reflète ton contrôle et ton équilibre. Compare-toi à toi-même.'),
    devices: traduire('iPhone (en poche ou à la ceinture)'),
  },
  {
    key: 'marche-6-min',
    label: traduire('Marche de 6 minutes'),
    family: 'mobilite',
    unit: 'm',
    kind: 'latest',
    digits: 0,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire("La distance que tu parcourrais en 6 minutes de marche, estimée chaque semaine par l'iPhone et l'Apple Watch."),
    howToRead: traduire("C'est une estimation du test utilisé par les médecins. Elle monte quand ton endurance progresse."),
    devices: traduire('iPhone avec Apple Watch'),
  },
  {
    key: 'chutes',
    label: traduire('Chutes'),
    family: 'mobilite',
    unit: 'chutes',
    kind: 'sum',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    event: true,
    what: traduire('Les chutes détectées par ta montre quand la détection des chutes est activée.'),
    howToRead: traduire('Chaque ligne est une chute détectée, avec sa date et son heure.'),
    devices: traduire('Apple Watch (détection des chutes activée)'),
  },
  {
    key: 'alerte-stabilite',
    label: traduire('Alertes de stabilité'),
    family: 'mobilite',
    unit: 'alertes',
    kind: 'sum',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    event: true,
    what: traduire("Les avertissements de l'iPhone quand ta stabilité de marche devient basse ou très basse."),
    howToRead: traduire("Le travail d'équilibre et le renforcement des jambes aident à la faire remonter."),
    devices: traduire('iPhone 8 et plus récents'),
  },
  // ============ CŒUR ============
  {
    key: 'fc-haute',
    label: traduire('Alertes de fréquence élevée'),
    family: 'coeur',
    unit: 'alertes',
    kind: 'sum',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    event: true,
    what: traduire('Les moments où ta montre a vu ton cœur rester au-dessus de ton seuil pendant au moins 10 minutes, alors que tu semblais au repos.'),
    howToRead: ALERT_READ,
    devices: 'Apple Watch',
  },
  {
    key: 'fc-basse',
    label: traduire('Alertes de fréquence basse'),
    family: 'coeur',
    unit: 'alertes',
    kind: 'sum',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    event: true,
    what: traduire('Les moments où ta montre a vu ton cœur rester sous ton seuil pendant au moins 10 minutes.'),
    howToRead: traduire("Les sportifs très entraînés ont souvent un cœur lent au repos. {0}", ALERT_READ),
    devices: 'Apple Watch',
  },
  {
    key: 'rythme-irregulier',
    label: traduire('Rythme irrégulier'),
    family: 'coeur',
    unit: 'alertes',
    kind: 'sum',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    event: true,
    what: traduire('Les notifications de ta montre quand plusieurs relevés montrent un rythme qui pourrait évoquer une fibrillation auriculaire.'),
    howToRead: ALERT_READ,
    devices: 'Apple Watch',
  },
  {
    key: 'ecg',
    label: traduire('Électrocardiogrammes'),
    family: 'coeur',
    unit: 'ECG',
    kind: 'sum',
    digits: 0,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    event: true,
    what: traduire("Les ECG que tu as faits avec l'app ECG de ta montre, avec leur résultat et ta fréquence moyenne."),
    howToRead: traduire("Le résultat est celui de l'app ECG d'Apple. Seul un médecin peut l'interpréter."),
    devices: traduire('Apple Watch Series 4 et plus récentes'),
  },
  {
    key: 'fibrillation',
    label: traduire('Historique de fibrillation'),
    family: 'coeur',
    unit: '%',
    kind: 'latest',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire("La part du temps passé en fibrillation auriculaire chaque semaine, pour les personnes diagnostiquées qui ont activé l'historique de FA."),
    howToRead: traduire('À suivre avec ton médecin, surtout après un changement de traitement ou de mode de vie.'),
    devices: traduire('Apple Watch Series 4 et plus récentes'),
  },
  {
    key: 'perfusion',
    label: traduire('Indice de perfusion'),
    family: 'coeur',
    unit: '%',
    kind: 'avg',
    digits: 1,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire("La force du flux sanguin au bout du doigt, donnée par certains oxymètres."),
    howToRead: traduire('Elle varie beaucoup avec le froid et la position. Elle sert surtout à juger la qualité de la mesure d’oxygène.'),
    devices: traduire('Oxymètres de pouls compatibles Apple Santé'),
  },
  // ============ RESPIRATION ============
  {
    key: 'cardio-faible',
    label: traduire('Alertes de cardio faible'),
    family: 'souffle',
    unit: 'alertes',
    kind: 'sum',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    event: true,
    what: traduire('Les notifications de ta montre quand ton VO2 max reste bas pour ton âge et ton sexe.'),
    howToRead: traduire('Le cardio régulier fait remonter ton VO2 max en quelques semaines.'),
    devices: 'Apple Watch',
  },
  {
    key: 'capacite-vitale',
    label: traduire('Capacité vitale forcée'),
    family: 'souffle',
    unit: 'L',
    kind: 'latest',
    digits: 2,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire("Le volume d'air que tu peux souffler d'un coup après une inspiration maximale, mesuré par un spiromètre."),
    howToRead: traduire("La valeur attendue dépend de l'âge, de la taille et du sexe. Compare tes mesures entre elles."),
    devices: traduire('Spiromètres connectés'),
  },
  {
    key: 'debit-expiratoire',
    label: traduire('Débit expiratoire de pointe'),
    family: 'souffle',
    unit: 'L/min',
    kind: 'latest',
    digits: 0,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire("La vitesse maximale de ton souffle, mesurée avec un débitmètre de pointe."),
    howToRead: traduire("Utile pour suivre un asthme : compare-le à ta meilleure valeur personnelle."),
    devices: traduire('Débitmètres de pointe connectés'),
  },
  // ============ SOMMEIL ============
  {
    key: 'apnees',
    label: traduire('Signes d’apnée du sommeil'),
    family: 'sommeil',
    unit: 'alertes',
    kind: 'sum',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    event: true,
    what: traduire("Les notifications de ta montre quand ta respiration a été souvent perturbée la nuit pendant 30 jours."),
    howToRead: traduire("Seul un médecin peut diagnostiquer une apnée du sommeil. Elle pèse lourd sur la récupération : parles-en si l'alerte arrive."),
    devices: traduire('Apple Watch Series 9, Ultra 2 et plus récentes'),
  },
  // ============ RÉCUPÉRATION ============
  {
    key: 'humeur',
    label: traduire('État d’esprit'),
    family: 'recuperation',
    unit: '/7',
    kind: 'avg',
    digits: 1,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    list: true,
    what: traduire("Ton humeur notée dans l'app Santé ou sur ta montre, de 1 (très désagréable) à 7 (très agréable)."),
    howToRead: traduire('Une humeur qui baisse plusieurs jours de suite accompagne souvent la fatigue ou le surentraînement.'),
    devices: traduire('iPhone et Apple Watch (iOS 18 et plus récent)'),
  },
  // ============ ENVIRONNEMENT ============
  {
    key: 'son-casque',
    label: traduire('Volume au casque'),
    family: 'environnement',
    unit: traduire('dB'),
    kind: 'avg',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire('Le volume moyen du son dans ton casque ou tes écouteurs.'),
    norm: {
      text: traduire("Pour un adulte, écouter à 80 dB reste sans risque jusqu'à 40 heures par semaine. Plus fort, la durée sûre baisse vite."),
      source: 'Organisation mondiale de la santé et Union internationale des télécommunications, norme pour une écoute sans risque, 2019',
    },
    devices: traduire('iPhone avec AirPods ou casques compatibles'),
  },
  {
    key: 'son-ambiant',
    label: traduire('Bruit ambiant'),
    family: 'environnement',
    unit: traduire('dB'),
    kind: 'avg',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire('Le niveau de bruit autour de toi, mesuré par le micro de ta montre.'),
    howToRead: traduire("Une salle de sport bruyante ou une soirée de combat peuvent être très fortes. Protège tes oreilles quand ça dure."),
    devices: traduire('Apple Watch Series 4 et plus récentes'),
  },
  {
    key: 'alerte-son-casque',
    label: traduire('Alertes de volume au casque'),
    family: 'environnement',
    unit: 'alertes',
    kind: 'sum',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    event: true,
    what: traduire("Les avertissements de l'iPhone quand tu as dépassé la dose de son conseillée sur 7 jours."),
    howToRead: traduire('Baisse le volume ou fais des pauses : l’oreille abîmée ne se répare pas.'),
    devices: traduire('iPhone avec AirPods ou casques compatibles'),
  },
  {
    key: 'alerte-son-ambiant',
    label: traduire('Alertes de bruit ambiant'),
    family: 'environnement',
    unit: 'alertes',
    kind: 'sum',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    event: true,
    what: traduire('Les avertissements de ta montre quand le bruit autour de toi est resté trop fort.'),
    howToRead: traduire('Éloigne-toi de la source ou porte des protections.'),
    devices: traduire('Apple Watch Series 4 et plus récentes'),
  },
  {
    key: 'uv',
    label: traduire('Exposition aux UV'),
    family: 'environnement',
    unit: 'indice',
    kind: 'avg',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire("L'indice UV le plus haut auquel tu as été exposé dans la journée, quand une app ou un capteur l'enregistre."),
    norm: {
      text: traduire("À partir d'un indice UV de 3, une protection est nécessaire : ombre, vêtements, chapeau, crème solaire."),
      source: 'Organisation mondiale de la santé, indice UV solaire mondial, 2002',
    },
    devices: traduire('Capteurs UV et apps météo compatibles Apple Santé'),
  },
  // ============ CORPS ============
  {
    key: 'alcool-sang',
    label: traduire('Alcool dans le sang'),
    family: 'corps',
    unit: 'g/L',
    kind: 'latest',
    digits: 2,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire("Le taux d'alcool mesuré par un éthylotest connecté."),
    norm: {
      text: traduire("En France, la conduite est interdite à partir de 0,5 g d'alcool par litre de sang (0,2 g/L en permis probatoire)."),
      source: 'Code de la route, article R234-1',
    },
    devices: traduire('Éthylotests connectés'),
  },
  {
    key: 'insuline',
    label: traduire('Insuline'),
    family: 'corps',
    unit: 'UI',
    kind: 'sum',
    digits: 1,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire("Les doses d'insuline notées par ton stylo ou ta pompe connectés."),
    howToRead: traduire('Utile pour relier tes doses à tes séances et à ta glycémie. Ton traitement se règle avec ton médecin.'),
    devices: traduire('Stylos et pompes à insuline connectés'),
  },
  // ============ NUTRITION ============
  nutrient({
    key: 'boissons-alcool',
    label: traduire('Verres d’alcool'),
    unit: 'verres',
    what: traduire("Les verres d'alcool notés dans ton app de nutrition ou dans Santé."),
    upIsGood: false,
    iosOnly: true,
    norm: {
      text: traduire("Pour limiter les risques : pas plus de 10 verres standard par semaine, pas plus de 2 par jour, et des jours sans alcool."),
      source: 'Santé publique France et Institut national du cancer, 2017',
    },
  }),
  nutrient({
    key: 'fibres',
    label: traduire('Fibres'),
    unit: 'g',
    what: traduire('Les fibres mangées dans la journée : légumes, fruits, céréales complètes, légumineuses.'),
    upIsGood: true,
    norm: { text: traduire("Pour un adulte, un apport de 25 g de fibres par jour suffit à un bon transit."), source: 'Autorité européenne de sécurité des aliments (EFSA), 2010' },
  }),
  nutrient({ key: 'sucres', label: traduire('Sucres'), unit: 'g', what: traduire('Les sucres mangés dans la journée, ceux des fruits compris.'), upIsGood: false }),
  nutrient({ key: 'graisses-saturees', label: traduire('Graisses saturées'), unit: 'g', what: traduire('Les graisses saturées de la journée : beurre, fromage, charcuterie, viandes grasses.'), upIsGood: false }),
  nutrient({ key: 'graisses-mono', label: traduire('Graisses mono-insaturées'), unit: 'g', what: traduire("Les graisses mono-insaturées de la journée : huile d'olive, avocat, amandes.") }),
  nutrient({ key: 'graisses-poly', label: traduire('Graisses polyinsaturées'), unit: 'g', what: traduire('Les graisses polyinsaturées de la journée : poissons gras, noix, huiles de colza et de lin.') }),
  nutrient({ key: 'cholesterol', label: traduire('Cholestérol'), unit: 'mg', what: traduire('Le cholestérol apporté par ce que tu as mangé : œufs, abats, produits animaux.') }),
  nutrient({
    key: 'sodium',
    label: traduire('Sodium'),
    unit: 'mg',
    what: traduire('Le sodium de la journée, surtout apporté par le sel.'),
    upIsGood: false,
    norm: { text: traduire('Pour un adulte, moins de 2 000 mg de sodium par jour, soit moins de 5 g de sel.'), source: 'Organisation mondiale de la santé, 2012' },
    howToRead: traduire('Après une grosse séance où tu transpires beaucoup, tes besoins augmentent.'),
  }),
  micro('potassium', 'Potassium', 'mg', traduire('Il aide tes muscles à se contracter et ton cœur à battre régulièrement.')),
  micro('calcium', 'Calcium', 'mg', traduire('Il construit tes os et participe à la contraction musculaire.')),
  micro('magnesium', traduire('Magnésium'), 'mg', traduire('Il joue sur la contraction musculaire, la récupération et le sommeil.')),
  micro('fer', 'Fer', 'mg', traduire("Il transporte l'oxygène dans ton sang jusqu'à tes muscles.")),
  micro('zinc', 'Zinc', 'mg', traduire('Il soutient tes défenses et la réparation des tissus.')),
  micro('phosphore', 'Phosphore', 'mg', traduire("Il participe à la solidité des os et à la production d'énergie.")),
  micro('iode', 'Iode', 'µg', traduire('Il fait tourner ta thyroïde.')),
  micro('selenium', traduire('Sélénium'), 'µg', traduire('Il protège tes cellules contre le stress oxydant.')),
  micro('cuivre', 'Cuivre', 'mg', traduire("Il aide à fabriquer les globules rouges et à utiliser le fer.")),
  micro('manganese', traduire('Manganèse'), 'mg', traduire('Il participe à la formation des os et à ton métabolisme.')),
  micro('chrome', 'Chrome', 'µg', traduire('Il aide ton corps à utiliser les sucres.')),
  micro('molybdene', traduire('Molybdène'), 'µg', traduire('Il fait tourner plusieurs enzymes de ton métabolisme.')),
  micro('chlorure', 'Chlorure', 'mg', traduire("Avec le sodium, il règle l'eau de ton corps.")),
  micro('vitamine-a', 'Vitamine A', 'µg', traduire('Elle sert à la vision, à la peau et aux défenses.')),
  micro('vitamine-b1', 'Vitamine B1 (thiamine)', 'mg', traduire("Elle aide à tirer l'énergie des glucides.")),
  micro('vitamine-b2', 'Vitamine B2 (riboflavine)', 'mg', traduire("Elle participe à la production d'énergie.")),
  micro('vitamine-b3', 'Vitamine B3 (niacine)', 'mg', traduire("Elle participe à la production d'énergie.")),
  micro('vitamine-b5', 'Vitamine B5', 'mg', traduire("Elle participe à la production d'énergie et d'hormones.")),
  micro('vitamine-b6', 'Vitamine B6', 'mg', traduire('Elle aide à utiliser les protéines.'), { androidOnly: true }),
  micro('vitamine-b8', 'Vitamine B8 (biotine)', 'µg', traduire('Elle sert à la peau, aux cheveux et au métabolisme.')),
  micro('vitamine-b9', 'Vitamine B9 (folates)', 'µg', traduire('Elle sert à fabriquer les cellules et les globules rouges.')),
  micro('vitamine-b12', 'Vitamine B12', 'µg', traduire('Elle sert aux globules rouges et aux nerfs.'), { androidOnly: true }),
  micro('vitamine-c', 'Vitamine C', 'mg', traduire('Elle soutient tes défenses et aide à absorber le fer.')),
  micro('vitamine-d', 'Vitamine D', 'µg', traduire('Elle fixe le calcium dans tes os et soutient tes muscles.')),
  micro('vitamine-e', 'Vitamine E', 'mg', traduire('Elle protège tes cellules contre le stress oxydant.')),
  micro('vitamine-k', 'Vitamine K', 'µg', traduire('Elle sert à la coagulation du sang et aux os.')),
];
