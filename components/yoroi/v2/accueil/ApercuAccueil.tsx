/**
 * Apercu en direct de ton accueil (27 octobre 2026, Houari : « le bloc Aperçu montre juste des barres de couleur,
 * il n'y a rien »). Une miniature a l'echelle (0,32) de tes VRAIS blocs, dans l'ordre et l'etat que tu regles :
 * elle suit le glisser et les interrupteurs en direct. Les blocs sont ceux de l'accueil (Grille.tsx, SanteJour.tsx,
 * Mange.tsx) avec tes donnees ; un bloc encore vide prend les valeurs d'exemple de lib/v2/accueil/apercuDemo.ts
 * (calquees sur la demo Heny), en memoire seulement : le mode demo n'est jamais active pour le reste de l'app.
 * Touche la miniature : elle s'ouvre en plus grand. Tout est inerte (aucun toucher ne traverse vers les blocs).
 * La mise en page est celle de la grille (proposition A) ; le haut de l'accueil (outils, Ton poids) reste fixe et
 * n'est montre que par ta scene.
 */
import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P, Press } from './kit';
import {
  GrilleAccueil,
  TuileAvantApres,
  TuileAvantApresVide,
  TuileCompetition,
  TuileDerniere,
  TuileEau,
  TuileMensurations,
  TuileMois,
  TuilePesee,
  TuilePeseeVide,
  TuileProchaine,
  TuileRecord,
  TuileRecup,
  TuileSerie,
  TuileSommeil,
  derniereSeance,
  usePeseePrevue,
  usePhotosAccueil,
} from './Grille';
import { TuileSanteJour } from './SanteJour';
import { BlocMange } from './Mange';
import { imageDeTaScene } from '@/components/yoroi/v2/espace/apercuScene';
import { useAccueil } from '@/lib/v2/accueil/useAccueil';
import { useSante } from '@/lib/v2/sante/useSante';
import { DEFAULT_GOALS } from '@/lib/v2/sante/data';
import { useMange } from '@/lib/v2/nutrition/useMange';
import { useWeightData } from '@/lib/v2/useWeightData';
import { useJoursPrevus } from '@/lib/v2/seances/joursPrevus';
import { objectifVise } from '@/lib/v2/espace';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { activiteAvecSeances, dernierRecord, santeDuJour, semainesRecentes, semainesTenues } from '@/lib/v2/accueil/enPlus';
import { localISO } from '@/lib/v2/accueil/hydration';
import { hauteurSceneCarte, SCENE_CARTE } from '@/lib/v2/saisons/geometrie';
import { EAU_EXEMPLE, SANTE_EXEMPLE, SERIE_EXEMPLE, nuitsExemple, recordExemple, seancesExemple } from '@/lib/v2/accueil/apercuDemo';
import type { BlocAccueil } from '@/lib/v2/accueil/disposition';
import type { TuileGrille } from '@/lib/v2/accueil/grille';
import { SansAncresVisite } from '@/components/yoroi/v2/tour/TourAnchor';
import { traduire } from '@/lib/i18n/tr';

/** Echelle de la miniature */
export const ECHELLE_APERCU = 0.32;
/** Hauteur maximale de la miniature dans la carte Apercu (le reste se voit en grand) */
const HAUTEUR_MINI = 250;

/** Tes donnees de l'accueil, ou l'exemple pour un bloc encore vide */
function useDonneesApercu() {
  const { data } = useAccueil();
  const sante = useSante();
  const mange = useMange(sante.series);
  const { series } = useWeightData();
  const unite = useUnitePoids();
  const plannedDays = useJoursPrevus(data.espace);
  const peseePrevue = usePeseePrevue(series.length ? series[series.length - 1].date : null);
  const photos = usePhotosAccueil(true);
  return useMemo(() => {
    const jour = localISO();
    const maintenant = new Date();
    const vraies = data.trainings.length > 0;
    const trainings = vraies ? data.trainings : seancesExemple(maintenant);
    const goal = objectifVise(data.espace) || (vraies ? 0 : SERIE_EXEMPLE.goal);
    const mesuresVraies = activiteAvecSeances(santeDuJour(sante.series, jour), data.trainings, jour);
    const g = sante.goals ?? DEFAULT_GOALS;
    const record = vraies ? dernierRecord(data.trainings, jour, unite) : null;
    const serie = vraies ? semainesTenues(data.trainings, goal, jour) : null;
    return {
      espace: data.espace,
      trainings,
      next: data.next,
      forme: data.forme,
      sleep: data.sleep.entries.length ? data.sleep.entries : nuitsExemple(maintenant),
      sleepGoal: data.sleep.goal,
      water: data.hydration.amount > 0 ? data.hydration.amount : EAU_EXEMPLE.water,
      waterGoal: data.hydration.amount > 0 ? data.hydration.goal : EAU_EXEMPLE.waterGoal,
      mesures: mesuresVraies.length ? mesuresVraies : SANTE_EXEMPLE,
      objectifs: { kcal: g.move, exercice: g.exercise, debout: g.stand, sommeilMin: data.sleep.goal },
      mange,
      competition: data.competition,
      record: record ?? recordExemple(maintenant),
      serie: serie != null ? { semaines: serie, goal, recentes: semainesRecentes(data.trainings, goal, jour, 8) } : SERIE_EXEMPLE,
      plannedDays,
      peseePrevue,
      photos,
    };
  }, [data, sante.series, sante.goals, mange, unite, plannedDays, peseePrevue, photos]);
}

type Donnees = ReturnType<typeof useDonneesApercu>;

/** Les tuiles d'un bloc, comme sur l'accueil (app/(tabs)/index.tsx, tuilesBrutes) */
function tuilesDuBloc(b: BlocAccueil, d: Donnees): TuileGrille<React.ReactNode>[] {
  const derniere = derniereSeance(d.trainings);
  switch (b) {
    case 'semaine':
      return [
        { cle: 'prochaine', taille: 'pleine', contenu: <TuileProchaine next={d.next} trainings={d.trainings} /> },
        ...(derniere ? [{ cle: 'derniere', taille: 'demi' as const, contenu: <TuileDerniere last={derniere} /> }] : []),
      ];
    case 'forme':
      return [
        { cle: 'recup', taille: 'demi', contenu: <TuileRecup forme={d.forme} /> },
        { cle: 'sommeil', taille: 'demi', contenu: <TuileSommeil sleep={d.sleep} sleepGoal={d.sleepGoal} /> },
        { cle: 'eau', taille: 'demi', contenu: <TuileEau water={d.water} waterGoal={d.waterGoal} /> },
        { cle: 'mensurations', taille: 'demi', contenu: <TuileMensurations /> },
      ];
    case 'mange':
      return d.mange?.aujourdhui ? [{ cle: 'mange', taille: 'pleine', contenu: <BlocMange resume={d.mange} /> }] : [];
    case 'rendezvous':
      return d.competition ? [{ cle: 'competition', taille: 'pleine', contenu: <TuileCompetition c={d.competition} /> }] : [];
    case 'activite':
      return [{ cle: 'sante-jour', taille: 'pleine', contenu: <TuileSanteJour mesures={d.mesures} objectifs={d.objectifs} /> }];
    case 'progres':
      return [
        { cle: 'record', taille: 'demi', contenu: <TuileRecord record={d.record} /> },
        { cle: 'serie', taille: 'demi', contenu: <TuileSerie semaines={d.serie.semaines} goal={d.serie.goal} recentes={d.serie.recentes} /> },
      ];
    case 'pesee':
      if (d.peseePrevue === undefined) return [];
      return [{ cle: 'pesee', taille: 'pleine', contenu: d.peseePrevue ? <TuilePesee prevue={d.peseePrevue} /> : <TuilePeseeVide /> }];
    case 'photos':
      if (!d.photos.charge) return [];
      return [{ cle: 'photos', taille: 'pleine', contenu: d.photos.paire ? <TuileAvantApres paire={d.photos.paire} /> : <TuileAvantApresVide nb={d.photos.nb} /> }];
    case 'mois':
      return [{ cle: 'mois', taille: 'pleine', contenu: <TuileMois trainings={d.trainings} plannedDays={d.plannedDays} competitionDate={d.competition?.date ?? null} /> }];
    default:
      return [];
  }
}

/** Ton accueil en vraie taille (largeur de l'ecran), inerte */
function AccueilPleineTaille({ blocs, tire, d, largeur }: { blocs: BlocAccueil[]; tire: BlocAccueil | null; d: Donnees; largeur: number }) {
  const tuiles = blocs.flatMap((b) =>
    tuilesDuBloc(b, d).map((t) => ({
      ...t,
      groupe: b,
      contenu: b === tire ? <View style={{ flex: 1, borderRadius: 26, borderWidth: 6, borderColor: P.accent }}>{t.contenu}</View> : t.contenu,
    })),
  );
  const hScene = hauteurSceneCarte(largeur - 32);
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: largeur, paddingHorizontal: 16, paddingVertical: 16, gap: 12, backgroundColor: P.paper }}>
      <SansAncresVisite>
        <Image source={imageDeTaScene(d.espace.scene)} resizeMode="cover" style={{ width: largeur - 32, height: hScene, borderRadius: SCENE_CARTE.rayon }} />
        <GrilleAccueil tuiles={tuiles} />
      </SansAncresVisite>
    </View>
  );
}

/** Une vue reduite d'un contenu de largeur fixe : la boite prend la taille reduite */
function Reduit({ largeur, echelle, hauteurMax, children }: { largeur: number; echelle: number; hauteurMax?: number; children: React.ReactNode }) {
  const [h, setH] = useState(0);
  const hr = h * echelle;
  const visible = hauteurMax ? Math.min(hr, hauteurMax) : hr;
  return (
    <View style={{ width: largeur * echelle, height: Math.max(visible, 40), overflow: 'hidden' }}>
      <View
        onLayout={(e) => setH(e.nativeEvent.layout.height)}
        style={{ position: 'absolute', width: largeur, left: -(largeur - largeur * echelle) / 2, top: -(h - hr) / 2, transform: [{ scale: echelle }] }}
      >
        {children}
      </View>
    </View>
  );
}

/** La miniature de la carte Apercu, et sa vue en grand au toucher */
export function ApercuAccueil({ ordre, caches, tire }: { ordre: BlocAccueil[]; caches: BlocAccueil[]; tire: BlocAccueil | null }) {
  const d = useDonneesApercu();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [grand, setGrand] = useState(false);
  const blocs = ordre.filter((b) => !caches.includes(b));
  const echelleGrand = Math.min(0.7, (width - 48) / width);
  return (
    <>
      <Press onPress={() => setGrand(true)} haptic="light" accessibilityRole="button" accessibilityLabel={traduire('Aperçu de ton accueil. Touche pour le voir en grand')}>
        <View style={{ borderRadius: 16, borderWidth: 1.5, borderColor: P.line, overflow: 'hidden', backgroundColor: P.paper }}>
          <Reduit largeur={width} echelle={ECHELLE_APERCU} hauteurMax={HAUTEUR_MINI}>
            <AccueilPleineTaille blocs={blocs} tire={tire} d={d} largeur={width} />
          </Reduit>
        </View>
      </Press>
      <Modal visible={grand} transparent animationType="fade" onRequestClose={() => setGrand(false)}>
        <Pressable onPress={() => setGrand(false)} style={{ flex: 1, backgroundColor: 'rgba(16,19,27,0.6)', paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12, alignItems: 'center' }} accessibilityLabel={traduire('Fermer')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: width * echelleGrand, marginBottom: 10 }}>
            <Ink size={15} weight="black" color={P.pureWhite}>{traduire('Ton accueil')}</Ink>
            <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: P.white, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={13} weight="black" color={P.ink}>{traduire('Fermer')}</Ink>
            </View>
          </View>
          <ScrollView style={{ maxHeight: height - insets.top - insets.bottom - 70, borderRadius: 22 }} contentContainerStyle={{ borderRadius: 22, overflow: 'hidden' }} showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => {}}>
              <Reduit largeur={width} echelle={echelleGrand}>
                <AccueilPleineTaille blocs={blocs} tire={null} d={d} largeur={width} />
              </Reduit>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Modal>
    </>
  );
}
