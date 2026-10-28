/**
 * Stickers YOROI (27 octobre 2026) : 152 illustrations facon autocollant (contour blanc, fond transparent),
 * qui remplacent les anciennes illustrations « icones » de l'app. Sources : _propositions/stickers_2026-10-27/png,
 * converties en webp 512 px dans assets/avatars/app/stickers/. Les anciens fichiers restent en place.
 *
 * Reglage « Illustrations » (Personnaliser) voulu par Houari : « Stickers » (par defaut) ou « Encre japonaise »
 * (les illustrations d'avant). Le choix est garde dans AsyncStorage (cle yoroi.illustrations) et diffuse a tous
 * les ecrans ouverts (DeviceEventEmitter), sans redemarrer.
 *
 * Usage :
 *   const illus = useIllustrations();             // dans un composant : il se redessine quand le reglage change
 *   <Image source={illus.img('chrono')} />       // le sticker, ou l'ancienne illustration en Encre japonaise
 *   illus.stickers ? <Sticker/> : <ancien rendu>   // quand l'ancien rendu etait une icone dessinee en code
 * Hors composant : illustration('chrono') lit le reglage en memoire.
 *
 * Tampons (assets/avatars/app/tampons) : avec le reglage Stickers, quel que soit l'univers, tous deviennent des
 * stickers (22 badges ronds de assets/avatars/app/stickers/tampons, les 3 autres le sticker du meme motif) ;
 * en Encre japonaise, le tampon a l'encre. tamponPour() choisit la source, le composant Tampon passe par lui.
 * Metro exige des require() statiques : pas de chemin calcule.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TAMPONS, type TamponId } from '@/components/yoroi/v2/tampons/table';
import type { Univers } from '@/lib/v2/dojo/univers';

export const STICKERS = {
  abdos: require('@/assets/avatars/app/stickers/abdos.webp'),
  abonnement: require('@/assets/avatars/app/stickers/abonnement.webp'),
  activite: require('@/assets/avatars/app/stickers/activite.webp'),
  aide: require('@/assets/avatars/app/stickers/aide.webp'),
  appareil_photo: require('@/assets/avatars/app/stickers/appareil_photo.webp'),
  balance: require('@/assets/avatars/app/stickers/balance.webp'),
  balance_ancienne: require('@/assets/avatars/app/stickers/balance_ancienne.webp'),
  bambou: require('@/assets/avatars/app/stickers/bambou.webp'),
  bandes: require('@/assets/avatars/app/stickers/bandes.webp'),
  barre: require('@/assets/avatars/app/stickers/barre.webp'),
  batons: require('@/assets/avatars/app/stickers/batons.webp'),
  bilan: require('@/assets/avatars/app/stickers/bilan.webp'),
  bonsai: require('@/assets/avatars/app/stickers/bonsai.webp'),
  boussole: require('@/assets/avatars/app/stickers/boussole.webp'),
  bras: require('@/assets/avatars/app/stickers/bras.webp'),
  calendrier: require('@/assets/avatars/app/stickers/calendrier.webp'),
  cardio_zone2: require('@/assets/avatars/app/stickers/cardio_zone2.webp'),
  carnet: require('@/assets/avatars/app/stickers/carnet.webp'),
  carnet_papier: require('@/assets/avatars/app/stickers/carnet_papier.webp'),
  carnet_vide: require('@/assets/avatars/app/stickers/carnet_vide.webp'),
  carte_tresor: require('@/assets/avatars/app/stickers/carte_tresor.webp'),
  ceinture_nouee: require('@/assets/avatars/app/stickers/ceinture_nouee.webp'),
  chaine: require('@/assets/avatars/app/stickers/chaine.webp'),
  chaussure: require('@/assets/avatars/app/stickers/chaussure.webp'),
  chrono: require('@/assets/avatars/app/stickers/chrono.webp'),
  cle: require('@/assets/avatars/app/stickers/cle.webp'),
  coach: require('@/assets/avatars/app/stickers/coach.webp'),
  coeur: require('@/assets/avatars/app/stickers/coeur.webp'),
  coffre_ferme: require('@/assets/avatars/app/stickers/coffre_ferme.webp'),
  coffre_ouvert: require('@/assets/avatars/app/stickers/coffre_ouvert.webp'),
  combat: require('@/assets/avatars/app/stickers/combat.webp'),
  conditions: require('@/assets/avatars/app/stickers/conditions.webp'),
  corps: require('@/assets/avatars/app/stickers/corps.webp'),
  cou: require('@/assets/avatars/app/stickers/cou.webp'),
  course: require('@/assets/avatars/app/stickers/course.webp'),
  debuter: require('@/assets/avatars/app/stickers/debuter.webp'),
  donnees: require('@/assets/avatars/app/stickers/donnees.webp'),
  donnees_telephone: require('@/assets/avatars/app/stickers/donnees_telephone.webp'),
  empreintes: require('@/assets/avatars/app/stickers/empreintes.webp'),
  enclume: require('@/assets/avatars/app/stickers/enclume.webp'),
  endurance: require('@/assets/avatars/app/stickers/endurance.webp'),
  energie: require('@/assets/avatars/app/stickers/energie.webp'),
  environnement: require('@/assets/avatars/app/stickers/environnement.webp'),
  erable: require('@/assets/avatars/app/stickers/erable.webp'),
  eventail: require('@/assets/avatars/app/stickers/eventail.webp'),
  fessiers: require('@/assets/avatars/app/stickers/fessiers.webp'),
  flamme: require('@/assets/avatars/app/stickers/flamme.webp'),
  force: require('@/assets/avatars/app/stickers/force.webp'),
  force_eclair: require('@/assets/avatars/app/stickers/force_eclair.webp'),
  fuji: require('@/assets/avatars/app/stickers/fuji.webp'),
  gants: require('@/assets/avatars/app/stickers/gants.webp'),
  gong: require('@/assets/avatars/app/stickers/gong.webp'),
  grand_coffre_ferme: require('@/assets/avatars/app/stickers/grand_coffre_ferme.webp'),
  grand_coffre_ouvert: require('@/assets/avatars/app/stickers/grand_coffre_ouvert.webp'),
  grip: require('@/assets/avatars/app/stickers/grip.webp'),
  gunbai: require('@/assets/avatars/app/stickers/gunbai.webp'),
  hors_ligne: require('@/assets/avatars/app/stickers/hors_ligne.webp'),
  jjb: require('@/assets/avatars/app/stickers/jjb.webp'),
  kabuto: require('@/assets/avatars/app/stickers/kabuto.webp'),
  katanas: require('@/assets/avatars/app/stickers/katanas.webp'),
  kettlebell: require('@/assets/avatars/app/stickers/kettlebell.webp'),
  kimono: require('@/assets/avatars/app/stickers/kimono.webp'),
  koi: require('@/assets/avatars/app/stickers/koi.webp'),
  koi_cascade: require('@/assets/avatars/app/stickers/koi_cascade.webp'),
  langue: require('@/assets/avatars/app/stickers/langue.webp'),
  lanterne: require('@/assets/avatars/app/stickers/lanterne.webp'),
  lanterne_papier: require('@/assets/avatars/app/stickers/lanterne_papier.webp'),
  lanterne_pierre: require('@/assets/avatars/app/stickers/lanterne_pierre.webp'),
  lanterne_plan: require('@/assets/avatars/app/stickers/lanterne_plan.webp'),
  lune_lapin: require('@/assets/avatars/app/stickers/lune_lapin.webp'),
  lune_soleil: require('@/assets/avatars/app/stickers/lune_soleil.webp'),
  marteau: require('@/assets/avatars/app/stickers/marteau.webp'),
  masse: require('@/assets/avatars/app/stickers/masse.webp'),
  medaille_argent: require('@/assets/avatars/app/stickers/medaille_argent.webp'),
  medaille_bronze: require('@/assets/avatars/app/stickers/medaille_bronze.webp'),
  medaille_or: require('@/assets/avatars/app/stickers/medaille_or.webp'),
  mes_sports: require('@/assets/avatars/app/stickers/mes_sports.webp'),
  metre_ruban: require('@/assets/avatars/app/stickers/metre_ruban.webp'),
  mobilite: require('@/assets/avatars/app/stickers/mobilite.webp'),
  montagne_drapeau: require('@/assets/avatars/app/stickers/montagne_drapeau.webp'),
  muscle: require('@/assets/avatars/app/stickers/muscle.webp'),
  musculation: require('@/assets/avatars/app/stickers/musculation.webp'),
  noter: require('@/assets/avatars/app/stickers/noter.webp'),
  nutrition: require('@/assets/avatars/app/stickers/nutrition.webp'),
  objectif_semaine: require('@/assets/avatars/app/stickers/objectif_semaine.webp'),
  objectifs: require('@/assets/avatars/app/stickers/objectifs.webp'),
  oni: require('@/assets/avatars/app/stickers/oni.webp'),
  partager: require('@/assets/avatars/app/stickers/partager.webp'),
  pecs: require('@/assets/avatars/app/stickers/pecs.webp'),
  perte: require('@/assets/avatars/app/stickers/perte.webp'),
  play: require('@/assets/avatars/app/stickers/play.webp'),
  poids: require('@/assets/avatars/app/stickers/poids.webp'),
  poing: require('@/assets/avatars/app/stickers/poing.webp'),
  pont: require('@/assets/avatars/app/stickers/pont.webp'),
  presentation: require('@/assets/avatars/app/stickers/presentation.webp'),
  rappels: require('@/assets/avatars/app/stickers/rappels.webp'),
  recherche: require('@/assets/avatars/app/stickers/recherche.webp'),
  records: require('@/assets/avatars/app/stickers/records.webp'),
  records_parchemin: require('@/assets/avatars/app/stickers/records_parchemin.webp'),
  recuperation: require('@/assets/avatars/app/stickers/recuperation.webp'),
  refresh: require('@/assets/avatars/app/stickers/refresh.webp'),
  repeter: require('@/assets/avatars/app/stickers/repeter.webp'),
  rocher: require('@/assets/avatars/app/stickers/rocher.webp'),
  sablier: require('@/assets/avatars/app/stickers/sablier.webp'),
  sac: require('@/assets/avatars/app/stickers/sac.webp'),
  sakura: require('@/assets/avatars/app/stickers/sakura.webp'),
  sans_compte: require('@/assets/avatars/app/stickers/sans_compte.webp'),
  sans_publicite: require('@/assets/avatars/app/stickers/sans_publicite.webp'),
  sante_appareils: require('@/assets/avatars/app/stickers/sante_appareils.webp'),
  saule: require('@/assets/avatars/app/stickers/saule.webp'),
  sauvegarde: require('@/assets/avatars/app/stickers/sauvegarde.webp'),
  seance_rapide: require('@/assets/avatars/app/stickers/seance_rapide.webp'),
  seche: require('@/assets/avatars/app/stickers/seche.webp'),
  sentier: require('@/assets/avatars/app/stickers/sentier.webp'),
  sommeil: require('@/assets/avatars/app/stickers/sommeil.webp'),
  souffle: require('@/assets/avatars/app/stickers/souffle.webp'),
  sparring: require('@/assets/avatars/app/stickers/sparring.webp'),
  sport_air: require('@/assets/avatars/app/stickers/sport_air.webp'),
  sport_arc: require('@/assets/avatars/app/stickers/sport_arc.webp'),
  sport_ballon: require('@/assets/avatars/app/stickers/sport_ballon.webp'),
  sport_boule: require('@/assets/avatars/app/stickers/sport_boule.webp'),
  sport_cible: require('@/assets/avatars/app/stickers/sport_cible.webp'),
  sport_danse: require('@/assets/avatars/app/stickers/sport_danse.webp'),
  sport_disque: require('@/assets/avatars/app/stickers/sport_disque.webp'),
  sport_echecs: require('@/assets/avatars/app/stickers/sport_echecs.webp'),
  sport_escrime: require('@/assets/avatars/app/stickers/sport_escrime.webp'),
  sport_football: require('@/assets/avatars/app/stickers/sport_football.webp'),
  sport_golf: require('@/assets/avatars/app/stickers/sport_golf.webp'),
  sport_jeu: require('@/assets/avatars/app/stickers/sport_jeu.webp'),
  sport_marche: require('@/assets/avatars/app/stickers/sport_marche.webp'),
  sport_nage: require('@/assets/avatars/app/stickers/sport_nage.webp'),
  sport_nature: require('@/assets/avatars/app/stickers/sport_nature.webp'),
  sport_neige: require('@/assets/avatars/app/stickers/sport_neige.webp'),
  sport_pagaie: require('@/assets/avatars/app/stickers/sport_pagaie.webp'),
  sport_peche: require('@/assets/avatars/app/stickers/sport_peche.webp'),
  sport_raquette: require('@/assets/avatars/app/stickers/sport_raquette.webp'),
  sport_souffle: require('@/assets/avatars/app/stickers/sport_souffle.webp'),
  sport_velo: require('@/assets/avatars/app/stickers/sport_velo.webp'),
  sport_vitesse: require('@/assets/avatars/app/stickers/sport_vitesse.webp'),
  sport_voile: require('@/assets/avatars/app/stickers/sport_voile.webp'),
  sport_volley: require('@/assets/avatars/app/stickers/sport_volley.webp'),
  tableur: require('@/assets/avatars/app/stickers/tableur.webp'),
  tapis: require('@/assets/avatars/app/stickers/tapis.webp'),
  techniques: require('@/assets/avatars/app/stickers/techniques.webp'),
  torii: require('@/assets/avatars/app/stickers/torii.webp'),
  torii_courbe: require('@/assets/avatars/app/stickers/torii_courbe.webp'),
  trois_apps: require('@/assets/avatars/app/stickers/trois_apps.webp'),
  trophee: require('@/assets/avatars/app/stickers/trophee.webp'),
  vague: require('@/assets/avatars/app/stickers/vague.webp'),
  ventre: require('@/assets/avatars/app/stickers/ventre.webp'),
  videos: require('@/assets/avatars/app/stickers/videos.webp'),
  zones_corps: require('@/assets/avatars/app/stickers/zones_corps.webp'),
} satisfies Record<string, ImageSourcePropType>;

export type NomSticker = keyof typeof STICKERS;

/**
 * L'illustration d'avant pour chaque sticker qui en avait une (reglage « Encre japonaise »).
 * Les stickers absents d'ici remplacent une icone dessinee en code : l'ecran garde alors son ancien rendu
 * quand le reglage est sur Encre japonaise (voir illus.stickers).
 */
export const ANCIENNES: Partial<Record<NomSticker, ImageSourcePropType>> = {
  appareil_photo: require('@/assets/avatars/app/sceaux/decouverte/appareil_photo.webp'),
  balance: require('@/assets/avatars/app/sceaux/decouverte/balance.webp'),
  bambou: require('@/assets/avatars/app/sceaux/regularite/bambou.webp'),
  bandes: require('@/assets/avatars/app/sceaux/combat/bandes.webp'),
  barre: require('@/assets/avatars/app/sceaux/force/barre.webp'),
  batons: require('@/assets/avatars/app/carnet/combat.webp'),
  bonsai: require('@/assets/avatars/app/ornements/bonsai.webp'),
  boussole: require('@/assets/avatars/app/tampons/boussole.webp'),
  bras: require('@/assets/avatars/app/sceaux/force/bras.webp'),
  carnet: require('@/assets/avatars/app/ornements/carnet.webp'),
  carnet_vide: require('@/assets/avatars/app/carnet/carnet_vide.webp'),
  carte_tresor: require('@/assets/avatars/app/sceaux/decouverte/carte.webp'),
  ceinture_nouee: require('@/assets/avatars/app/sceaux/combat/ceinture_nouee.webp'),
  chaine: require('@/assets/avatars/app/sceaux/force/chaine.webp'),
  chaussure: require('@/assets/avatars/app/sceaux/decouverte/chaussure.webp'),
  chrono: require('@/assets/avatars/app/ornements/chrono.webp'),
  coffre_ferme: require('@/assets/avatars/app/coffre/coffre_ferme.webp'),
  coffre_ouvert: require('@/assets/avatars/app/coffre/coffre_ouvert.webp'),
  combat: require('@/assets/avatars/app/ornements/combat.webp'),
  course: require('@/assets/avatars/app/carnet/course.webp'),
  enclume: require('@/assets/avatars/app/sceaux/force/enclume.webp'),
  endurance: require('@/assets/avatars/app/carnet/endurance.webp'),
  eventail: require('@/assets/avatars/app/ornements/eventail.webp'),
  flamme: require('@/assets/avatars/app/sceaux/regularite/flamme.webp'),
  force: require('@/assets/avatars/app/carnet/force.webp'),
  fuji: require('@/assets/avatars/app/ornements/fuji.webp'),
  gants: require('@/assets/avatars/app/carnet/boxe.webp'),
  gong: require('@/assets/avatars/app/sceaux/combat/gong.webp'),
  grand_coffre_ferme: require('@/assets/avatars/app/coffre/grand_coffre_ferme.webp'),
  grand_coffre_ouvert: require('@/assets/avatars/app/coffre/grand_coffre_ouvert.webp'),
  jjb: require('@/assets/avatars/app/carnet/jjb.webp'),
  kabuto: require('@/assets/avatars/app/ornements/kabuto.webp'),
  katanas: require('@/assets/avatars/app/ornements/katanas.webp'),
  kettlebell: require('@/assets/avatars/app/sceaux/force/kettlebell.webp'),
  kimono: require('@/assets/avatars/app/sceaux/combat/kimono.webp'),
  koi: require('@/assets/avatars/app/ornements/koi.webp'),
  lanterne: require('@/assets/avatars/app/ornements/lanterne.webp'),
  lanterne_papier: require('@/assets/avatars/app/sceaux/decouverte/lanterne_papier.webp'),
  lanterne_plan: require('@/assets/avatars/app/ornements/lanterne_plan.webp'),
  lune_soleil: require('@/assets/avatars/app/sceaux/regularite/lune_soleil.webp'),
  marteau: require('@/assets/avatars/app/sceaux/force/marteau.webp'),
  metre_ruban: require('@/assets/avatars/app/sceaux/decouverte/metre_ruban.webp'),
  musculation: require('@/assets/avatars/app/carnet/musculation.webp'),
  objectifs: require('@/assets/avatars/app/ornements/cible.webp'),
  oni: require('@/assets/avatars/app/sceaux/combat/oni.webp'),
  poing: require('@/assets/avatars/app/sceaux/force/poing.webp'),
  pont: require('@/assets/avatars/app/sceaux/regularite/pont.webp'),
  records: require('@/assets/avatars/app/carnet/records.webp'),
  records_parchemin: require('@/assets/avatars/app/carnet/records.webp'),
  rocher: require('@/assets/avatars/app/sceaux/force/rocher.webp'),
  sablier: require('@/assets/avatars/app/sceaux/regularite/sablier.webp'),
  sakura: require('@/assets/avatars/app/ornements/sakura.webp'),
  sentier: require('@/assets/avatars/app/sceaux/regularite/sentier.webp'),
  sparring: require('@/assets/avatars/app/carnet/sparring.webp'),
  tapis: require('@/assets/avatars/app/sceaux/decouverte/tapis.webp'),
  techniques: require('@/assets/avatars/app/carnet/techniques.webp'),
  torii: require('@/assets/avatars/app/ornements/torii.webp'),
  torii_courbe: require('@/assets/avatars/app/ornements/torii_courbe.webp'),
  vague: require('@/assets/avatars/app/ornements/vague.webp'),
  videos: require('@/assets/avatars/app/carnet/videos.webp'),
  zones_corps: require('@/assets/avatars/app/ornements/zones_corps.webp'),
  coach: require('@/assets/avatars/app/tampons/coach.webp'),
  cle: require('@/assets/avatars/app/tampons/cle.webp'),
  // 28 octobre 2026 : les tampons a l'encre des nouveaux stickers (sources : _propositions/stickers_2026-10-27/png_encre)
  sans_compte: require('@/assets/avatars/app/tampons/sans_compte.webp'),
  hors_ligne: require('@/assets/avatars/app/tampons/hors_ligne.webp'),
  donnees_telephone: require('@/assets/avatars/app/tampons/donnees_telephone.webp'),
  sans_publicite: require('@/assets/avatars/app/tampons/sans_publicite.webp'),
  sauvegarde: require('@/assets/avatars/app/tampons/sauvegarde.webp'),
  carnet_papier: require('@/assets/avatars/app/tampons/carnet_papier.webp'),
  tableur: require('@/assets/avatars/app/tampons/tableur.webp'),
  trois_apps: require('@/assets/avatars/app/tampons/trois_apps.webp'),
  calendrier: require('@/assets/avatars/app/tampons/calendrier.webp'),
  bilan: require('@/assets/avatars/app/tampons/bilan.webp'),
  sommeil: require('@/assets/avatars/app/tampons/sommeil.webp'),
  sante_appareils: require('@/assets/avatars/app/tampons/sante_appareils.webp'),
  coeur: require('@/assets/avatars/app/tampons/coeur.webp'),
  activite: require('@/assets/avatars/app/tampons/activite.webp'),
  environnement: require('@/assets/avatars/app/tampons/environnement.webp'),
  play: require('@/assets/avatars/app/tampons/play.webp'),
  poids: require('@/assets/avatars/app/tampons/poids.webp'),
  rappels: require('@/assets/avatars/app/tampons/rappels.webp'),
  donnees: require('@/assets/avatars/app/tampons/donnees.webp'),
  noter: require('@/assets/avatars/app/tampons/noter.webp'),
  nutrition: require('@/assets/avatars/app/tampons/nutrition.webp'),
  trophee: require('@/assets/avatars/app/tampons/trophee.webp'),
  repeter: require('@/assets/avatars/app/tampons/repeter.webp'),
  refresh: require('@/assets/avatars/app/tampons/refresh.webp'),
  partager: require('@/assets/avatars/app/tampons/partager.webp'),
  objectif_semaine: require('@/assets/avatars/app/tampons/objectif_semaine.webp'),
  medaille_or: require('@/assets/avatars/app/tampons/medaille_or.webp'),
  medaille_argent: require('@/assets/avatars/app/tampons/medaille_argent.webp'),
  medaille_bronze: require('@/assets/avatars/app/tampons/medaille_bronze.webp'),
};

// ============ le reglage Illustrations ============

export type StyleIllustrations = 'stickers' | 'encre';

export const STYLES_ILLUSTRATIONS: { id: StyleIllustrations; apercu: [NomSticker, NomSticker, NomSticker] }[] = [
  { id: 'stickers', apercu: ['chrono', 'carnet', 'objectifs'] },
  { id: 'encre', apercu: ['chrono', 'carnet', 'objectifs'] },
];

export const STYLE_ILLUSTRATIONS_DEFAUT: StyleIllustrations = 'stickers';
export const CLE_ILLUSTRATIONS = 'yoroi.illustrations';
const EVENT = 'YOROI_ILLUSTRATIONS';

export function styleIllustrationsPropre(v: unknown): StyleIllustrations {
  return v === 'encre' ? 'encre' : 'stickers';
}

let courant: StyleIllustrations = STYLE_ILLUSTRATIONS_DEFAUT;
/** style impose pendant l'onboarding (forcerIllustrations), null sinon */
let force: StyleIllustrations | null = null;
let lu = false;
let lecture: Promise<StyleIllustrations> | null = null;

export function lireIllustrations(): Promise<StyleIllustrations> {
  if (lu) return Promise.resolve(courant);
  if (!lecture) {
    // lecture differee d'un tour : un getItem qui leve tout de suite ne casse pas le chargement du module
    lecture = Promise.resolve()
      .then(() => AsyncStorage.getItem(CLE_ILLUSTRATIONS))
      .then((v) => {
        const s = styleIllustrationsPropre(v);
        lu = true;
        if (s !== courant) {
          courant = s;
          DeviceEventEmitter.emit(EVENT, s);
        }
        return s;
      })
      .catch(() => {
        lu = true;
        return courant;
      });
  }
  return lecture;
}

// lu des le chargement du module : le bon style arrive avant la plupart des ecrans
lireIllustrations().catch(() => {});

export function illustrationsCourantes(): StyleIllustrations {
  return force ?? courant;
}

/**
 * 27 octobre 2026 (retour de Houari sur l'onboarding) : pendant l'onboarding, les illustrations suivent l'univers
 * choisi (Japon : l'encre japonaise ; Classique ou sans personnage : les stickers), sans toucher au reglage enregistre.
 * null rend la main au reglage. Les ecrans ouverts se redessinent (meme evenement que le reglage).
 */
export function forcerIllustrations(s: StyleIllustrations | null): void {
  if (s === force) return;
  force = s;
  DeviceEventEmitter.emit(EVENT, force ?? courant);
}

export async function ecrireIllustrations(s: StyleIllustrations): Promise<void> {
  courant = styleIllustrationsPropre(s);
  lu = true;
  DeviceEventEmitter.emit(EVENT, courant);
  try {
    await AsyncStorage.setItem(CLE_ILLUSTRATIONS, courant);
  } catch {
    // le choix reste valable pour la session
  }
}

/** Le sticker, ou en Encre japonaise l'illustration d'avant (celle passee en second, sinon celle de la table) */
export function illustration(nom: NomSticker, ancienne?: ImageSourcePropType | null, style: StyleIllustrations = force ?? courant): ImageSourcePropType {
  if (style === 'encre') return ancienne ?? ANCIENNES[nom] ?? STICKERS[nom];
  return STICKERS[nom];
}

/** Le sticker seul, quel que soit le reglage */
export function sticker(nom: NomSticker): ImageSourcePropType {
  return STICKERS[nom];
}

export function useIllustrations(): {
  style: StyleIllustrations;
  stickers: boolean;
  img: (nom: NomSticker, ancienne?: ImageSourcePropType | null) => ImageSourcePropType;
  changer: (s: StyleIllustrations) => void;
} {
  const [style, setStyle] = useState<StyleIllustrations>(force ?? courant);
  useEffect(() => {
    let alive = true;
    lireIllustrations().then((s) => alive && setStyle(force ?? s));
    const sub = DeviceEventEmitter.addListener(EVENT, (s: StyleIllustrations) => setStyle(force ?? s));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  const img = useCallback((nom: NomSticker, ancienne?: ImageSourcePropType | null) => illustration(nom, ancienne, style), [style]);
  const changer = useCallback((s: StyleIllustrations) => {
    setStyle(styleIllustrationsPropre(s));
    ecrireIllustrations(s);
  }, []);
  return { style, stickers: style === 'stickers', img, changer };
}

// ============ les tampons ============

/** Tampons remplaces par un badge sticker dans l'univers classique, reglage Stickers (27 octobre 2026) */
export const TAMPONS_A_REMPLACER_CLASSIQUE: TamponId[] = [
  'objectif_perdre', 'objectif_muscle', 'objectif_combat', 'objectif_maintien',
  'frein_regularite', 'frein_progres', 'frein_motivation', 'frein_blessures', 'frein_programme', 'frein_rien',
  'record', 'record_force', 'record_endurance', 'record_combat', 'record_technique', 'record_poids',
  'victoire', 'medaille_or', 'medaille_argent', 'medaille_bronze', 'vague', 'lapin_lune',
];

/** Stickers de l'univers classique : id du tampon vers son badge (sources : _propositions/stickers_2026-10-27/png_tampons) */
export const TAMPONS_CLASSIQUE: Partial<Record<TamponId, ImageSourcePropType>> = {
  objectif_perdre: require('@/assets/avatars/app/stickers/tampons/objectif_perdre.webp'),
  objectif_muscle: require('@/assets/avatars/app/stickers/tampons/objectif_muscle.webp'),
  objectif_combat: require('@/assets/avatars/app/stickers/tampons/objectif_combat.webp'),
  objectif_maintien: require('@/assets/avatars/app/stickers/tampons/objectif_maintien.webp'),
  frein_regularite: require('@/assets/avatars/app/stickers/tampons/frein_regularite.webp'),
  frein_progres: require('@/assets/avatars/app/stickers/tampons/frein_progres.webp'),
  frein_motivation: require('@/assets/avatars/app/stickers/tampons/frein_motivation.webp'),
  frein_blessures: require('@/assets/avatars/app/stickers/tampons/frein_blessures.webp'),
  frein_programme: require('@/assets/avatars/app/stickers/tampons/frein_programme.webp'),
  frein_rien: require('@/assets/avatars/app/stickers/tampons/frein_rien.webp'),
  record: require('@/assets/avatars/app/stickers/tampons/record.webp'),
  record_force: require('@/assets/avatars/app/stickers/tampons/record_force.webp'),
  record_endurance: require('@/assets/avatars/app/stickers/tampons/record_endurance.webp'),
  record_combat: require('@/assets/avatars/app/stickers/tampons/record_combat.webp'),
  record_technique: require('@/assets/avatars/app/stickers/tampons/record_technique.webp'),
  record_poids: require('@/assets/avatars/app/stickers/tampons/record_poids.webp'),
  victoire: require('@/assets/avatars/app/stickers/tampons/victoire.webp'),
  medaille_or: require('@/assets/avatars/app/stickers/tampons/medaille_or.webp'),
  medaille_argent: require('@/assets/avatars/app/stickers/tampons/medaille_argent.webp'),
  medaille_bronze: require('@/assets/avatars/app/stickers/tampons/medaille_bronze.webp'),
  vague: require('@/assets/avatars/app/stickers/tampons/vague.webp'),
  lapin_lune: require('@/assets/avatars/app/stickers/tampons/lapin_lune.webp'),
};

/** Les trois tampons de reserve sans badge rond : le sticker du meme motif */
const TAMPONS_SANS_BADGE: Partial<Record<TamponId, NomSticker>> = {
  gunbai: 'gunbai',
  toro: 'lanterne_pierre',
  erable: 'erable',
};

/**
 * Vrai quand ce tampon s'affiche en sticker. Decision de Houari (27 octobre 2026, soir) : c'est le reglage
 * Illustrations qui decide de tout, quel que soit l'univers (Japon ou Classique). Stickers : tous les tampons
 * en stickers ; Encre japonaise : les tampons a l'encre. Le parametre univers reste pour les appels existants.
 */
export function tamponEnSticker(id: TamponId, _univers?: Univers, style: StyleIllustrations = force ?? courant): boolean {
  return style === 'stickers' && (!!TAMPONS_CLASSIQUE[id] || !!TAMPONS_SANS_BADGE[id]);
}

/** L'image d'un tampon : son sticker avec le reglage Stickers, sinon le tampon a l'encre */
export function tamponPour(id: TamponId, _univers?: Univers, style: StyleIllustrations = force ?? courant): ImageSourcePropType {
  if (style === 'stickers') {
    const badge = TAMPONS_CLASSIQUE[id];
    if (badge) return badge;
    const nom = TAMPONS_SANS_BADGE[id];
    if (nom) return STICKERS[nom];
  }
  return (TAMPONS[id] ?? TAMPONS.record).src;
}
