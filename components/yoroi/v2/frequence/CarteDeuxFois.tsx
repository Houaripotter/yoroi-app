/**
 * Le coach te rappelle « chaque muscle 2 fois par semaine » (30 octobre 2026). Houari : « si non, que le coach me le
 * rappelle : tu n'as pas travaillé tes jambes 2 fois cette semaine ».
 * Sur l'accueil du coach (app/coach.tsx) et la page du programme en cours (app/programmes/[id].tsx).
 * À partir du jeudi, quand un muscle est à 0 ou 1 jour et qu'il reste assez de jours pour arriver à 2, et seulement si
 * tu as fait de la musculation ces 14 derniers jours (règle : lib/v2/frequence/deuxFois.ts, rappelCoach).
 * La séance proposée : celle de ta semaine (semaine libre) qui travaille ces muscles, sinon une séance de la
 * bibliothèque (app/programmes/zones.tsx). « Pourquoi ? » ouvre les études.
 * Tout est calculé sur le téléphone. Données lues au montage, relues quand une séance ou le programme change.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { Capitales, nomCourt, ombrePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { BoutonPourquoi, FeuillePourquoi } from '@/components/yoroi/v2/programmes/Pourquoi';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { PROGRAMME_CHANGED_EVENT, chargerProgrammeActif, seancesAuxDates, seancesAVenir, semaineEffective } from '@/lib/v2/programmes/suivi';
import { programmeParId } from '@/lib/v2/programmes/catalogue';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import { groupesDeSeance } from '@/lib/v2/programmes/semaineLibre';
import { routeDuJour } from '@/lib/v2/programmes/lancer';
import { PLAN_DAYS } from '@/lib/v2/seances/sessionData';
import {
  POSSESSIF,
  enListe,
  estSeanceMuscu,
  indexJourIso,
  isoLocal,
  musclesDesGroupes,
  plusJoursIso,
  rappelCoach,
  seanceBibliotheque,
  seanceQuiCouvre,
} from '@/lib/v2/frequence/deuxFois';
import type { SeancePrevue } from '@/lib/v2/frequence/deuxFois';
import type { MuscleName } from '@/lib/v2/progres/strength';
import { POURQUOI_DEUX_FOIS } from '@/lib/v2/frequence/pourquoiDeuxFois';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire } from '@/lib/i18n/tr';

type Prevue = NonNullable<ReturnType<typeof seancesAuxDates>[number]>;

const liste = (muscles: readonly MuscleName[]) => enListe(muscles.map((m) => traduire(POSSESSIF[m])), traduire('et'));

export function CarteDeuxFois({ style }: { style?: StyleProp<ViewStyle> } = {}) {
  const router = useRouter();
  const pa = usePastel();
  const [trainings, setTrainings] = useState<Training[] | null>(null);
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [pourquoi, setPourquoi] = useState(false);

  useEffect(() => {
    let vivant = true;
    // la semaine en cours et les 14 jours d'avant
    const lireSeances = () => getTrainings(28).then((t) => { if (vivant) setTrainings(t ?? []); }).catch(() => { if (vivant) setTrainings([]); });
    const lireProgramme = () => chargerProgrammeActif().then((a) => { if (vivant) setActif(a); }).catch(() => { if (vivant) setActif(null); });
    lireSeances();
    lireProgramme();
    const s1 = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, lireSeances);
    const s2 = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, lireProgramme);
    return () => { vivant = false; s1.remove(); s2.remove(); };
  }, []);

  const auj = isoLocal(new Date());
  const retard = useMemo(() => (trainings ? rappelCoach(trainings, auj) : []), [trainings, auj]);

  const proposition = useMemo(() => {
    if (!retard.length || !trainings) return null;
    let prevue: (SeancePrevue<Prevue> & { couverts: MuscleName[] }) | null = null;
    let datee = false;
    if (actif) {
      // aujourd'hui compte seulement si tu n'as pas déjà fait ta musculation du jour
      const dejaAuj = trainings.some((t) => String(t?.date ?? '').slice(0, 10) === auj && estSeanceMuscu(t));
      const debut = dejaAuj ? 1 : 0;
      const isos: string[] = [];
      for (let k = debut; k <= 6 - indexJourIso(auj); k++) isos.push(plusJoursIso(auj, k));
      const dates = isos.map((x) => new Date(`${x}T12:00:00`));
      const liste_: SeancePrevue<Prevue>[] = [];
      try {
        const p = programmeParId(actif.id);
        // avec une semaine (semaine libre ou jours fixes), chaque date a sa séance ; sinon les prochaines dans l'ordre
        datee = !!p && !!semaineEffective(actif, p);
        const seances = datee ? seancesAuxDates(actif, dates) : seancesAVenir(actif, dates.length);
        seances.forEach((s, k) => {
          if (s && isos[k]) liste_.push({ date: isos[k], muscles: musclesDesGroupes(groupesDeSeance(s.jour)), donnee: s });
        });
      } catch {
        // programme illisible : la bibliothèque prend le relais
      }
      prevue = seanceQuiCouvre(retard, liste_, auj);
    }
    return { prevue, datee, bibliotheque: prevue ? null : seanceBibliotheque(retard) };
  }, [retard, trainings, actif, auj]);

  if (!retard.length || !proposition) return null;
  const { prevue, datee, bibliotheque } = proposition;
  const titre = traduire('Tu n’as pas travaillé {0} 2 fois cette semaine.', liste(retard));
  const nom = prevue ? sansTiret(nomCourt(traduire(prevue.donnee.jour.titre))) : '';
  const ligne = prevue
    ? !datee
      ? traduire('Ta séance {0} travaille {1}.', nom, liste(prevue.couverts))
      : prevue.date === auj
        ? traduire('Ta séance {0} d’aujourd’hui travaille {1}.', nom, liste(prevue.couverts))
        : traduire('Ta séance {0} de {1} travaille {2}.', nom, PLAN_DAYS[indexJourIso(prevue.date)], liste(prevue.couverts))
    : actif
      ? traduire('Aucune séance de ta semaine ne les travaille. Une séance de la bibliothèque peut le faire.')
      : traduire('Une séance de la bibliothèque les travaille.');

  const ouvrir = () => {
    tap();
    if (prevue) {
      const r = routeDuJour(prevue.donnee.programme, prevue.donnee.jour, prevue.donnee.semaine);
      router.push({ pathname: r.pathname as any, params: r.params });
    } else if (bibliotheque) {
      router.push({ pathname: '/programmes/zones' as any, params: bibliotheque });
    }
  };

  return (
    <View style={[{ borderRadius: 24, padding: 16, gap: 12, backgroundColor: pa.peche.fond }, ombrePastel(pa.ombre), style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="calendar" size={19} color={pa.peche.titre} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Capitales texte={traduire('Ton coach')} couleur={pa.peche.titre} taille={10.5} />
          <Ink size={15.5} weight="black" tight color={pa.texte} accessibilityRole="header">{titre}</Ink>
        </View>
      </View>
      <Ink size={13.5} weight="bold" color={pa.texte2} style={{ lineHeight: 19 }}>{ligne}</Ink>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        {prevue || bibliotheque ? (
          <BoutonPrincipal
            onPress={ouvrir}
            haptique="none"
            label={prevue ? traduire('Faire cette séance') : traduire('Voir la séance')}
            accessibilityLabel={prevue ? `${traduire('Faire cette séance')}, ${nom}` : traduire('Voir la séance')}
            hauteur={40}
            rayon={20}
            tailleTexte={13.5}
            compact
            lignes={1}
          />
        ) : null}
        <BoutonPourquoi onPress={() => setPourquoi(true)} label={traduire('Pourquoi 2 fois ?')} />
      </View>
      <FeuillePourquoi explication={pourquoi ? POURQUOI_DEUX_FOIS : null} onClose={() => setPourquoi(false)} />
    </View>
  );
}
