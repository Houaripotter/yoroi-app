/**
 * « Tes prochaines séances » (1er novembre 2026). Houari : « Je veux voir mes entraînements futurs, ce que l'app m'a
 * préparé comme exercices. L'objectif est de travailler chaque muscle 2 fois par semaine. J'aimerais alterner entre
 * A et B, mais c'est l'utilisateur qui choisit. Et je veux pouvoir prévisualiser tout ça. »
 *
 * Ouvert depuis la carte « Ton programme » (onglet Séances) et depuis la page du programme (« Voir le programme »).
 *  - Tes séances : alterner A et B ou toujours la même (alternance.ts), et l'aperçu A et B côte à côte ;
 *  - cette semaine et les deux suivantes, jour par jour : nom, date, exercices dans l'ordre avec séries,
 *    répétitions et charge proposée (progression.ts), durée estimée, abdos et cardio réellement prévus ; les
 *    séances faites portent le tampon validé ;
 *  - toucher une séance l'ouvre en aperçu : la commencer aujourd'hui, l'échanger (cette semaine), changer un
 *    exercice à l'avance (« Changer d'exercice », juste ce jour-là ou pour toujours) ;
 *  - chaque muscle 2 fois : la carte rouge de la semaine prévue, « 2 fois sur 2 » par groupe, et les suggestions.
 * 1er novembre 2026 : tes séances enregistrées sont reliées aux jours du programme (seancesFaites.ts) ; la page du
 * programme montre désormais la semaine jour par jour, cet écran reste ouvert par « Voir les 2 prochaines semaines ».
 * Tout le calcul est dans lib/v2/programmes/prochainesSeances.ts (données pures) ; les écritures dans
 * prochainesActions.ts et suivi.ts.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Colonne, LargeurPage, Rangee } from '@/components/yoroi/v2/PageLarge';
import { usePageLarge } from '@/lib/v2/nav/useGrandEcran';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { ChangerExercice } from '@/components/yoroi/v2/seance/ChangerExercice';
import type { PorteeChangement } from '@/components/yoroi/v2/seance/ChangerExercice';
import { ApercuAB, CarteJour, FeuilleSeance, MusclesPrevus, ReglageSeances, TitreSemaine } from '@/components/yoroi/v2/programmes/ProchainesSeances';
import type { ExoVu, PaireAB, VueJour } from '@/components/yoroi/v2/programmes/ProchainesSeances';
import { getActiveInjuries, getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { DATE_FNS_LOCALE } from '@/lib/i18n/dateLocale';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { traduire } from '@/lib/i18n/tr';
import { programmeParId } from '@/lib/v2/programmes/catalogue';
import { regionsDesBlessures, unirRegions } from '@/lib/v2/programmes/blessures';
import type { Region } from '@/lib/v2/programmes/blessures';
import type { Equipement } from '@/lib/v2/programmes/materiel';
import { jourPourToi, remplacementsLe } from '@/lib/v2/programmes/perso';
import type { AvecFin } from '@/lib/v2/programmes/finSeance';
import { estJourMuscu } from '@/lib/v2/programmes/finSeance';
import { estExoCardio } from '@/lib/v2/programmes/briques';
import { dureeEstimee } from '@/lib/v2/programmes/express';
import { resumeDuJour, routeDuJour } from '@/lib/v2/programmes/lancer';
import { estProgrammePerso } from '@/lib/v2/programmes/registrePerso';
import { chargerProgrammesPerso, idDuJourPerso, idVariantePerso } from '@/lib/v2/programmes/monProgramme';
import type { ProgrammePerso } from '@/lib/v2/programmes/monProgramme';
import { PHRASE_ALTERNANCE, PHRASE_SEMAINES_AB, aSaSemaineB, alternanceAffichee, lettreDe } from '@/lib/v2/programmes/alternance';
import type { Alternance } from '@/lib/v2/programmes/alternance';
import { genererVarianteB } from '@/lib/v2/programmes/varianteB';
import { chargeProposee, couverturePrevue, joursPrevus, lettreSeance, nomSeance, suggestionsSemaine } from '@/lib/v2/programmes/prochainesSeances';
import type { JourPrevu, Suggestion } from '@/lib/v2/programmes/prochainesSeances';
import { ajouterExerciceSuggere, choisirAlternance, completerVersionsB, echangerCetteSemaine } from '@/lib/v2/programmes/prochainesActions';
import {
  PROGRAMME_CHANGED_EVENT, changerExerciceLe, chargerMachines, chargerMateriel, chargerProgrammeActif, estSemaineLegere, peutGarder, remplacerExercice, semaineDuProgramme,
} from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { JourProgramme, Programme } from '@/lib/v2/programmes/types';
import { cardioPrevu, libelleCardio, typeDeNom } from '@/lib/v2/seances/cardioJour';
import { liensGardes, retenirHabitudes } from '@/lib/v2/seances/habitudesFin';
import { chargerEnchainements } from '@/lib/v2/programmes/enchainements';
import { SuggestionHabitude } from '@/components/yoroi/v2/programmes/SuggestionHabitude';
import { chargerEcartes, nomsEcartes } from '@/lib/v2/seances/exercicesEcartes';
import { chargerMachinesPerso } from '@/lib/v2/seances/machinesPerso';
import type { MachinePerso } from '@/lib/v2/seances/machinesPerso';
import { musclesDesExercices } from '@/lib/v2/seances/musclesExercices';

export type Donnees = {
  actif: ProgrammeActif;
  p: Programme;
  pp: ProgrammePerso | null;
  trainings: Training[];
  materiel: Equipement[] | null;
  machines: string[] | null;
  regions: Region[];
  ecartes: string[];
  perso: MachinePerso[];
};

const le = (iso: string) => new Date(`${iso}T12:00:00`);
const TITRES_SEMAINES = ['Cette semaine', 'Semaine prochaine', 'Dans 2 semaines'];

/**
 * Charge tout ce que l'écran montre ; relu à chaque changement du programme.
 * 1er novembre 2026 : l'accueil le lit aussi (Ta prochaine séance, Ton programme en grand écran) avec
 * completer faux : il ne prépare jamais les versions B, il lit seulement.
 */
export function useProchaines(o: { completer?: boolean } = {}): { d: Donnees | null; pret: boolean } {
  const completer = o.completer !== false;
  const [d, setD] = useState<Donnees | null>(null);
  const [pret, setPret] = useState(false);
  useEffect(() => {
    let vivant = true;
    const charger = async () => {
      try {
        const actif = await chargerProgrammeActif();
        const p = actif ? programmeParId(actif.id) : undefined;
        if (!actif || !p) {
          if (vivant) setD(null);
          return;
        }
        const [liste, trainings, materiel, machines, blessures, ecartes, perso] = await Promise.all([
          estProgrammePerso(actif.id) ? chargerProgrammesPerso().catch(() => []) : Promise.resolve([] as ProgrammePerso[]),
          getTrainings().catch(() => [] as Training[]),
          chargerMateriel().catch(() => null),
          chargerMachines().catch(() => null),
          getActiveInjuries().catch(() => []),
          chargerEcartes().catch(() => []),
          chargerMachinesPerso().catch(() => []),
        ]);
        if (!vivant) return;
        // 1er novembre 2026 : tes abdos et ton cardio habituels, lus avant de préparer tes séances (habitudesFin.ts)
        retenirHabitudes(trainings ?? [], new Date(), liensGardes(await chargerEnchainements().catch(() => ({}))));
        if (!vivant) return;
        setD({
          actif, p, pp: liste.find((x) => x.id === actif.id) ?? null, trainings: trainings ?? [], materiel, machines,
          regions: unirRegions(regionsDesBlessures((blessures ?? []) as { zone_id: string; status?: string }[]), actif.douleurs),
          ecartes: Array.from(nomsEcartes(ecartes)), perso,
        });
      } catch {
        if (vivant) setD(null);
      } finally {
        if (vivant) setPret(true);
      }
    };
    void charger();
    // 1er novembre 2026, soir : une séance qui alterne sans sa version B encore (programme d'avant migré) la reçoit
    if (completer) void completerVersionsB().catch(() => false);
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, () => void charger());
    // 1er novembre 2026 : une séance enregistrée compte tout de suite pour son jour du programme (seancesFaites.ts)
    const subSeances = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, () => void charger());
    return () => { vivant = false; sub.remove(); subSeances.remove(); };
  }, [completer]);
  return { d, pret };
}

/** Une séance telle que tu la feras ce jour-là : tes remplacements, ton matériel, ta fin de séance, les charges */
export function vueDuJour(d: Donnees, jp: JourPrevu): VueJour {
  const quand = format(le(jp.date), 'EEE d MMM', { locale: DATE_FNS_LOCALE });
  const brut = jp.jour;
  if (!brut) return { jp, nom: '', lettre: null, exos: [], minutes: 0, cardio: null, abdos: 0, muscu: false, quand };
  const { actif, p } = d;
  const pt = jourPourToi(brut, d.materiel, d.regions, d.machines, remplacementsLe(actif.remplacements, actif.changementsDates, jp.date), { fin: actif.fin, materiel: p.materiel, programme: p });
  const fin = pt as unknown as AvecFin;
  const legere = estSemaineLegere(actif, le(jp.date));
  const exos: ExoVu[] = pt.exos.map((e, i) => {
    const ch = chargeProposee(e, d.trainings, legere);
    return { ...e, kg: ch.kg, vise: ch.reps, ...(i < brut.exos.length && !(e as { fin?: true }).fin ? { index: i } : {}), ...(e.perso ? { change: true } : {}) };
  });
  const cardioExo = exos.find(estExoCardio);
  const cardio = cardioExo
    ? (() => { const c = cardioPrevu(p.id, brut.id, cardioExo.minutes, typeDeNom(cardioExo.nom)); return libelleCardio(c.type, c.minutes); })()
    : fin.finCardio ? libelleCardio(fin.finCardioType ?? 'marche_inclinee', fin.finCardio.minutes) : null;
  const muscu = estJourMuscu(brut);
  const minutesCardio = (cardioExo?.minutes ?? 0) + (fin.finCardio?.minutes ?? 0);
  const minutes = muscu || brut.exos.length ? dureeEstimee(exos.filter((e) => !estExoCardio(e))) + minutesCardio : brut.cardio ? brut.cardio.minutes : p.dureeMin;
  return {
    jp, quand, nom: nomSeance(brut, traduire), lettre: lettreSeance(brut), exos: brut.exos.length ? exos : [], minutes, cardio,
    abdos: muscu ? exos.filter((e) => e.muscle === 'ABDOS').length : 0, muscu: brut.exos.length > 0,
    ...(brut.exos.length ? {} : { resume: resumeDuJour(brut, semaineDuProgramme(actif, le(jp.date))) }),
  };
}

/** Les séances qui ont une version A et une version B, pour l'aperçu côte à côte (préparée à la volée si besoin) */
function pairesAB(d: Donnees, vues: VueJour[]): PaireAB[] {
  const { p, pp } = d;
  const prochaine = (id: string) => vues.find((v) => v.jp.jour?.id === id && v.jp.statut !== 'faite' && v.jp.statut !== 'ratee')?.quand;
  const exosDe = (j: JourProgramme): ExoVu[] => vueDuJour(d, { date: vues.find((v) => v.jp.statut !== 'faite')?.jp.date ?? vues[0].jp.date, d: 0, semaine: 0, jour: j, statut: 'avenir' }).exos.filter((e) => !(e as { fin?: true }).fin);
  const out: PaireAB[] = [];
  const vus = new Set<string>();
  // tes séances qui ont leur version B préparée, ou à préparer (aperçu de ce que YOROI ferait)
  if (pp) {
    for (let k = 0; k < 7; k++) {
      const s = pp.semaine[k];
      if (!s || !s.exos.length || !s.brique || vus.has(s.brique) || lettreDe(s.titre ?? '')) continue;
      vus.add(s.brique);
      const a = p.jours.find((j) => j.id === idDuJourPerso(pp, k));
      if (!a || !estJourMuscu(a)) continue;
      const v = (pp.variantesB ?? []).find((x) => x.brique === s.brique) ?? genererVarianteB(s, { ecartes: d.ecartes, perso: d.perso });
      const b = p.jours.find((j) => j.id === idVariantePerso(pp.id, s.brique!)) ?? { ...a, id: `${a.id}~apercu`, exos: v.exos, variante: 'B' as const };
      out.push({ cle: s.brique, titre: traduire(a.titre), a: exosDe(a), b: exosDe(b), quandA: prochaine(a.id), quandB: prochaine(b.id) });
    }
  }
  // les séances du programme dont le titre dit déjà A et B (Upper A, Upper B)
  const parBase = new Map<string, { a?: JourProgramme; b?: JourProgramme }>();
  for (const j of p.jours) {
    const l = lettreDe(j.titre);
    if (!l || !estJourMuscu(j)) continue;
    const x = parBase.get(l.base) ?? {};
    if (l.lettre === 'A' && !x.a) x.a = j;
    if (l.lettre === 'B' && !x.b) x.b = j;
    parBase.set(l.base, x);
  }
  for (const [base, x] of parBase) {
    if (!x.a || !x.b) continue;
    out.push({ cle: `t:${base}`, titre: traduire(x.a.titre).replace(/\s+A(?=$|\s*[:,]).*$/, ''), a: exosDe(x.a), b: exosDe(x.b), quandA: prochaine(x.a.id), quandB: prochaine(x.b.id) });
  }
  // un programme du catalogue sans B : l'aperçu de ce que YOROI préparerait
  if (!pp && !out.length) {
    const vusIds = new Set<string>();
    for (const v of vues) {
      const j = v.jp.jour;
      if (!j || vusIds.has(j.id) || !estJourMuscu(j)) continue;
      vusIds.add(j.id);
      const vb = genererVarianteB({ exos: j.exos }, { ecartes: d.ecartes, perso: d.perso });
      out.push({ cle: j.id, titre: traduire(j.titre), a: exosDe(j), b: exosDe({ ...j, id: `${j.id}~apercu`, exos: vb.exos, variante: 'B' }) });
      if (out.length >= 4) break;
    }
  }
  return out;
}

export default function ProchainesSeances() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const unite = useUnitePoids();
  const page = usePageLarge(false);
  const { d, pret } = useProchaines();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [aChanger, setAChanger] = useState<{ v: VueJour; e: ExoVu } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [semaineMuscles, setSemaineMuscles] = useState<number | null>(null);
  const [ajoutes, setAjoutes] = useState<string[]>([]);

  const vues = useMemo(() => (d ? joursPrevus(d.actif, d.p, 3, new Date(), d.trainings).map((jp) => vueDuJour(d, jp)) : []), [d]);
  const paires = useMemo(() => (d && vues.length ? pairesAB(d, vues) : []), [d, vues]);
  const aVenirCetteSemaine = vues.some((v) => v.jp.semaine === 0 && v.jp.jour && (v.jp.statut === 'avenir' || v.jp.statut === 'aujourdhui'));
  const semM = semaineMuscles ?? (aVenirCetteSemaine ? 0 : 1);
  const muscles = useMemo(() => {
    if (!d) return null;
    const jours = vues.filter((v) => v.jp.semaine === semM);
    const exosDe = (jp: JourPrevu) => jours.find((v) => v.jp.date === jp.date)?.exos ?? [];
    const avec = jours.filter((v) => v.jp.jour && estJourMuscu(v.jp.jour));
    const couverture = couverturePrevue(avec.map((v) => ({ date: v.jp.date, exos: v.exos })), d.perso);
    const bilan = musclesDesExercices(avec.flatMap((v) => v.exos.map((e) => ({ name: e.nom, muscle_group: e.muscle, sets: estExoCardio(e) ? 0 : e.series, reps: e.repsMin }))), d.perso);
    const suggestions = suggestionsSemaine(jours.map((v) => v.jp), exosDe, { ecartes: d.ecartes, perso: d.perso });
    return { couverture, loads: bilan.loads, zones: bilan.zones, suggestions };
  }, [d, vues, semM]);

  const choix: Alternance = d ? (d.pp ? alternanceAffichee(d.pp) : paires.some((x) => x.cle.startsWith('t:')) ? 'ab' : 'meme') : 'meme';
  const phrase = traduire(d?.pp && aSaSemaineB(d.pp) ? PHRASE_SEMAINES_AB : PHRASE_ALTERNANCE[choix]);
  const reglable = !!d && (!!d.pp || peutGarder(d.actif, d.p));

  const choisir = useCallback(async (x: Alternance) => {
    if (!d) return;
    setOccupe(true);
    try {
      await choisirAlternance(x, { ecartes: d.ecartes, perso: d.perso });
    } finally {
      setOccupe(false);
    }
  }, [d]);

  const vueOuverte = vues.find((v) => v.jp.date === ouverte) ?? null;
  const autres = vueOuverte && vueOuverte.jp.semaine === 0
    ? vues.filter((v) => v.jp.semaine === 0 && v.jp.date !== vueOuverte.jp.date && v.jp.jour && (v.jp.statut === 'avenir' || v.jp.statut === 'aujourdhui'))
    : [];

  const commencer = (v: VueJour) => {
    if (!d || !v.jp.jour) return;
    setOuverte(null);
    const r = routeDuJour(d.p, v.jp.jour, semaineDuProgramme(d.actif));
    router.push({ pathname: r.pathname as any, params: r.params });
  };
  const changer = (nom: string, _muscle: string, portee: PorteeChangement) => {
    const x = aChanger;
    setAChanger(null);
    const j = x?.v.jp.jour;
    if (!x || !j || x.e.index === undefined) return;
    const original = j.exos[x.e.index]?.nom;
    if (portee === 'toujours') void remplacerExercice(j.id, x.e.index, nom, original);
    else void changerExerciceLe(x.v.jp.date, j.id, x.e.index, nom, original);
  };
  const ajouter = (s: Suggestion, nom: string, muscle: string) => {
    setAjoutes((l) => [...l, `${s.cible.jourId}|${nom}`]);
    void ajouterExerciceSuggere(s.cible.jourId, s.cible.date, nom, muscle);
  };

  const titreProgramme = d ? traduire(d.p.titre) : '';
  const enTete = <EnTete titre={traduire('Tes prochaines séances')} sousTitre={titreProgramme || undefined} onRetour={() => router.back()} repli="/programmes" zoneSure="insets" style={{ marginHorizontal: page.grand ? 0 : -16 }} />;

  if (!pret) return <View style={{ flex: 1, backgroundColor: c.background }} />;
  if (!d) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingHorizontal: 16 }}>
        {enTete}
        <Ink size={15} weight="bold" color={c.textSecondary} style={{ marginTop: 20 }}>{traduire('Choisis un programme pour voir tes prochaines séances.')}</Ink>
      </View>
    );
  }

  const largeurGauche = page.grand ? Math.round((page.largeur - 24) * 0.42) : page.largeur;
  const largeurDroite = page.grand ? page.largeur - 24 - largeurGauche : page.largeur;
  const deuxColonnesJours = page.grand && largeurDroite >= 620;
  const largeurJour = deuxColonnesJours ? Math.floor((largeurDroite - 12) / 2) : largeurDroite;

  const reglage = reglable ? <ReglageSeances choix={choix} phrase={phrase} catalogue={!d.pp} occupe={occupe} onChoisir={(x) => void choisir(x)} /> : null;
  const apercu = paires.length ? <ApercuAB paires={paires} unite={unite} largeur={largeurGauche} /> : null;
  const carteMuscles = muscles ? (
    <MusclesPrevus
      couverture={muscles.couverture}
      loads={muscles.loads}
      zones={muscles.zones}
      largeur={largeurGauche - 32}
      suggestions={muscles.suggestions}
      semaines={[0, 1].map((k) => traduire(TITRES_SEMAINES[k]))}
      semaine={semM}
      onSemaine={setSemaineMuscles}
      onAjouter={ajouter}
      ajoutes={ajoutes}
    />
  ) : null;
  const semaines = [0, 1, 2].map((k) => {
    const jours = vues.filter((v) => v.jp.semaine === k);
    return (
      <View key={k} style={{ gap: 10 }}>
        <TitreSemaine titre={traduire(TITRES_SEMAINES[k])} jours={jours} />
        <View style={{ flexDirection: deuxColonnesJours ? 'row' : 'column', flexWrap: 'wrap', gap: deuxColonnesJours ? 12 : 8 }}>
          {jours.filter((v) => !deuxColonnesJours || v.jp.jour).map((v, i) => (
            <View key={v.jp.date} style={deuxColonnesJours ? { width: largeurJour } : undefined}>
              <CarteJour v={v} unite={unite} delai={i * 60} onPress={v.jp.jour ? () => setOuverte(v.jp.date) : undefined} />
            </View>
          ))}
        </View>
      </View>
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <LargeurPage actif={page.grand} largeur={page.largeur}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: page.grand ? page.marge : 16, paddingBottom: insets.bottom + 40, gap: 12 }} showsVerticalScrollIndicator={false}>
          {enTete}
          {/* 1er novembre 2026 : ce que tu fais vraiment après ta séance, proposé sans rien forcer */}
          {d ? <SuggestionHabitude programme={d.p} actif={d.actif} trainings={d.trainings} /> : null}
          {page.grand ? (
            <Rangee actif espace={24}>
              <Colonne actif largeur={largeurGauche}>
                {reglage}
                {apercu}
                {carteMuscles}
              </Colonne>
              <Colonne actif largeur={largeurDroite}>{semaines}</Colonne>
            </Rangee>
          ) : (
            <>
              {reglage}
              {apercu}
              {semaines}
              {carteMuscles}
            </>
          )}
        </ScrollView>
      </LargeurPage>
      <FeuilleSeance
        v={vueOuverte}
        autres={autres}
        unite={unite}
        onClose={() => setOuverte(null)}
        onCommencer={vueOuverte ? () => commencer(vueOuverte) : undefined}
        onEchanger={vueOuverte ? (o) => { const de = vueOuverte.jp.date; setOuverte(null); void echangerCetteSemaine(de, o.jp.date); } : undefined}
        onChanger={vueOuverte ? (e) => { setAChanger({ v: vueOuverte, e }); setOuverte(null); } : undefined}
      />
      {aChanger ? (
        <ChangerExercice
          visible
          onClose={() => setAChanger(null)}
          mode="changer"
          nom={aChanger.e.nom}
          muscle={aChanger.e.muscle}
          deja={aChanger.v.exos.map((e) => e.nom)}
          dansProgramme
          onChoisir={changer}
        />
      ) : null}
    </View>
  );
}
