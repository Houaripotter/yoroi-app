/**
 * « Tes jours » (27 octobre 2026), devenu ta semaine libre (28 octobre 2026). Houari : « Sur chaque jour, je choisis
 * ce que je fais : une séance du programme, une séance d'un autre programme, ou repos. »
 * Sept cases, du lundi au dimanche. Toucher un jour ouvre juste en dessous :
 *  - « Ce programme » : ses séances (la même peut revenir deux fois dans la semaine) ;
 *  - « Autres séances » : Push, Pull, Legs, Upper, Lower, Full body des autres programmes, et tes séances
 *    (programmes construits par toi) ;
 *  - « Repos ».
 * « Semaines A et B » (éteint par défaut) : deux semaines qui alternent, deux lignes. Dessous, sans rien bloquer :
 * ce que ta semaine travaille, groupe par groupe, et deux séances qui chargent le même grand muscle deux jours de suite.
 * Le modèle est dans lib/v2/programmes/semaineLibre.ts, l'enregistrement dans suivi.ts (enregistrerSemaine).
 * 1er novembre 2026, soir : un seul réglage A et B, « Alterner A et B » (alternance.ts, unifierAB), pour ton
 * programme en cours. Chaque case dit la vraie version du jour (« Push A », « Push B », petit badge A ou B, même
 * couleur, un peu plus soutenue en B) ; la semaine B suit ta semaine A, une case se change pour les deux. Ce que ta
 * semaine travaille suit la règle unique des muscles (musclesExercices.ts) : vert dès 2 fois, orange en dessous,
 * avec la suggestion douce de Tes prochaines séances.
 * Utilisé dans le départ du coach (app/coach-depart.tsx), la page du programme (app/programmes/[id].tsx) et le
 * Coach (app/coach.tsx, TesJoursEnCours).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PisteInterrupteur } from '@/components/yoroi/Interrupteur';
import { illustration } from '@/components/yoroi/v2/stickers';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { RondIcone, nomCourt, teinteExo, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { CarteSuggestion } from '@/components/yoroi/v2/programmes/ProchainesSeances';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { aSaSemaineB, alternanceAffichee, avecVersion, casesDeBase, seanceDeBase, versionDe, versionsBIdentiques } from '@/lib/v2/programmes/alternance';
import type { Version } from '@/lib/v2/programmes/alternance';
import { couvertureGrille, joursDeGrille, lundiDe, suggestionsSemaine } from '@/lib/v2/programmes/prochainesSeances';
import type { Suggestion } from '@/lib/v2/programmes/prochainesSeances';
import { ajouterExerciceSuggere, basculerAlternance, completerVersionsB } from '@/lib/v2/programmes/prochainesActions';
import type { ProgrammePerso } from '@/lib/v2/programmes/monProgramme';
import type { MuscleName } from '@/lib/v2/progres/strength';
import { indexJour } from '@/lib/v2/programmes/coach';
import { PROGRAMMES, programmeParId } from '@/lib/v2/programmes/catalogue';
import type { FinSeance } from '@/lib/v2/programmes/finSeance';
import { nomDuProgramme } from '@/lib/v2/programmes/heroJour';
import { chargerProgrammesPerso, programmesVisibles } from '@/lib/v2/programmes/monProgramme';
import {
  aDeLaMuscu, avecAB, avecCase, casesDe, estSemaineB, familleDeSeance, memeRef, seancesDeLaLigne,
  seancesProposees, seancesTropProches, semaineDepuisBoucle, semaineUtile,
} from '@/lib/v2/programmes/semaineLibre';
import type { CaseSemaine, FamilleSeance, LigneSemaine, SemaineLibre, SeanceProposee } from '@/lib/v2/programmes/semaineLibre';
import { PROGRAMME_CHANGED_EVENT, chargerProgrammeActif, enregistrerSemaine, joursDuProgramme, modifierSemainePerso, peutGarder, semaineEffective } from '@/lib/v2/programmes/suivi';
import { estProgrammePerso } from '@/lib/v2/programmes/registrePerso';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { JourProgramme, Programme } from '@/lib/v2/programmes/types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const NOMS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MUSCLES: Record<string, string> = { pectoraux: 'les pectoraux', dos: 'le dos', jambes: 'les jambes', fessiers: 'les fessiers' };
const majuscule = (t: string) => t.charAt(0).toLocaleUpperCase() + t.slice(1);

/** Le nom d'un groupe et la phrase quand il n'est pas travaillé (accordée en français) */
const GROUPES: Partial<Record<MuscleName, { nom: string; zero: string }>> = {
  Pectoraux: { nom: 'Pectoraux', zero: 'Pectoraux : pas travaillés cette semaine' },
  Dos: { nom: 'Dos', zero: 'Dos : pas travaillé cette semaine' },
  'Épaules': { nom: 'Épaules', zero: 'Épaules : pas travaillées cette semaine' },
  Bras: { nom: 'Bras', zero: 'Bras : pas travaillés cette semaine' },
  Jambes: { nom: 'Jambes', zero: 'Jambes : pas travaillées cette semaine' },
};

/**
 * 1er novembre 2026, soir : « Alterner A et B », le seul réglage A et B de ton programme en cours (TesJoursEnCours).
 * Absent (départ du coach, mixte avant de commencer) : l'interrupteur « Semaines A et B » d'avant.
 */
export type ReglageAB = {
  /** l'interrupteur est allumé */
  on: boolean;
  /** tes séances alternent avec leur version B : la semaine B suit ta semaine A, une case se change pour les deux */
  versions: boolean;
  /** programme du catalogue : allumer en fait ton programme à toi (séances faites et charges suivent) */
  catalogue: boolean;
  occupe?: boolean;
  onBasculer: () => void;
  /** ta semaine B copie de ta semaine A : préparer de vraies versions B */
  onPreparerB?: () => void;
  /** « Ajouter » d'une suggestion de Ce que ta semaine travaille */
  onAjouter?: (s: Suggestion, nom: string, muscle: string) => void;
};

export type TesJoursProps = {
  programme: Programme;
  /** la semaine à montrer (semaineAffichee) */
  semaine: SemaineLibre;
  onSemaine: (s: SemaineLibre) => void;
  fin?: FinSeance | null;
  /** vrai : tes séances s'enchaînent encore dans l'ordre (programme en boucle, rien de fixé) */
  enBoucle?: boolean;
  /** sans carte autour (le départ du coach a déjà la sienne) */
  nu?: boolean;
  aujourdhui?: Date;
  /** le réglage A et B unique, pour ton programme en cours */
  reglage?: ReglageAB;
};

/** La semaine à montrer : la tienne, sinon tes séances dans l'ordre sur tes jours (programme en boucle) */
export function semaineAffichee(a: ProgrammeActif | null, p: Programme, plan?: readonly number[] | null, jours?: readonly number[]): { semaine: SemaineLibre; enBoucle: boolean } {
  const enCours = !!a && a.id === p.id;
  // 30 octobre 2026 : ta semaine normale, jamais la semaine mixte ponctuelle posée par dessus (mixte.ts)
  const s = enCours ? semaineEffective(a, p, false) : semaineEffective(plan ? { plan: [...plan], jours: jours ? [...jours] : undefined } : null, p);
  if (s) return { semaine: s, enBoucle: false };
  const j = enCours ? joursDuProgramme(a, p) : jours ?? joursDuProgramme(null, p);
  return { semaine: semaineDepuisBoucle(p, j, enCours ? a?.fin : null), enBoucle: true };
}

/** Tes programmes construits, pour « Mes séances » */
function usePersos(): Programme[] {
  const [l, setL] = useState<Programme[]>([]);
  useEffect(() => {
    let vivant = true;
    const lire = () =>
      chargerProgrammesPerso()
        .then((liste) => {
          if (vivant) setL(programmesVisibles(liste).map((pp) => programmeParId(pp.id)).filter((x): x is Programme => !!x));
        })
        .catch(() => {});
    lire();
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, lire);
    return () => {
      vivant = false;
      sub.remove();
    };
  }, []);
  return l;
}

export function TesJours({ programme: p, semaine, onSemaine, fin, enBoucle, nu, aujourdhui, reglage }: TesJoursProps) {
  const pal = usePaletteProgramme();
  const persos = usePersos();
  const [choisi, setChoisi] = useState<{ ligne: LigneSemaine; jour: number } | null>(null);
  const auj = aujourdhui ?? new Date();
  const kAuj = indexJour(auj);
  const ab = !!semaine.ab && !!semaine.b;
  const ligneAuj: LigneSemaine = estSemaineB(semaine, auj) ? 'b' : 'a';
  const versions = !!reglage?.versions;
  // une version B ne se pose pas seule sur un jour : elle suit sa séance A
  const proposees = useMemo(() => {
    const x = seancesProposees(p, PROGRAMMES, persos, fin);
    return { ...x, ceProgramme: x.ceProgramme.filter((y) => y.jour.variante !== 'B') };
  }, [p, persos, fin]);

  // une couleur par séance du programme (sa version B garde celle de sa séance A), une par famille pour les autres
  const teinteDe = (c: CaseSemaine, j: JourProgramme | null) => {
    if (!c || !j) return { fond: pal.page, encre: pal.texte3 };
    if (c.p === p.id) return teinteExo(pal, Math.max(0, p.jours.findIndex((x) => x.id === seanceDeBase(p.jours, j).id)));
    const src = programmeParId(c.p);
    const f = src ? familleDeSeance(src, j) : null;
    return teinteExo(pal, f ? ['push', 'pull', 'legs', 'upper', 'lower', 'fullbody', 'perso'].indexOf(f) + 1 : 1);
  };
  // « Push B » : la vraie version du jour quand tes séances alternent ; sans alternance, pas de lettre
  const nomDe = (j: JourProgramme | null) => (j ? avecVersion(nomCourt(traduire(j.titre)), j) : traduire('Repos'));

  const changer = (ligne: LigneSemaine, jour: number, c: CaseSemaine) => {
    tap();
    // tes séances alternent : ce jour change dans ta semaine de base, sa version B suit dans la semaine B
    const suite = versions ? avecCase({ a: casesDeBase(p) }, 'a', jour, c) : avecCase(semaine, ligne, jour, c);
    // au moins une séance dans la semaine
    if (semaineUtile(suite)) onSemaine(suite);
    setChoisi(null);
  };

  const basculerAB = () => {
    tap();
    setChoisi(null);
    if (reglage) {
      reglage.onBasculer();
      return;
    }
    onSemaine(avecAB(semaine, !ab, auj));
  };
  const allume = reglage ? reglage.on : ab;

  const lignes: LigneSemaine[] = ab ? ['a', 'b'] : ['a'];
  // deux semaines qui alternent mais identiques (copie de la semaine A) : YOROI le dit
  const bIdentique = ab && !versions && casesDe(semaine, 'a').every((x, d) => memeRef(x, casesDe(semaine, 'b')[d]));
  const bSansEquivalent = versions ? versionsBIdentiques(p.jours) : [];

  const contenu = (
    <View style={{ gap: 14 }}>
      {!nu ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <RondIcone icone="calendar" />
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={17} weight="black" tight color={pal.texte} accessibilityRole="header">{traduire('Tes jours')}</Ink>
            <Ink size={12} weight="bold" color={pal.texte2}>{traduire('Touche un jour pour choisir sa séance.')}</Ink>
          </View>
        </View>
      ) : null}

      {lignes.map((ligne) => {
        const cases = casesDe(semaine, ligne);
        const seances = seancesDeLaLigne(semaine, p, ligne);
        return (
          <View key={ligne} style={{ gap: 8 }}>
            {ab ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ink size={13} weight="black" color={pal.texte}>{ligne === 'a' ? traduire('Semaine A') : traduire('Semaine B')}</Ink>
                {ligne === ligneAuj ? (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: pal.vertTint }}>
                    <Ink size={11} weight="extraBold" color={pal.vert}>{traduire('Cette semaine')}</Ink>
                  </View>
                ) : null}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {NOMS.map((nomFr, d) => {
                const nomJour = traduire(nomFr);
                const j = seances[d];
                const t = teinteDe(cases[d], j);
                const actif = choisi?.ligne === ligne && choisi.jour === d;
                const libelle = nomDe(j);
                const version = versionDe(j);
                const ici = d === kAuj && ligne === ligneAuj;
                return (
                  <Pressable
                    key={d}
                    onPress={() => { tap(); setChoisi((x) => (x && x.ligne === ligne && x.jour === d ? null : { ligne, jour: d })); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: actif }}
                    accessibilityLabel={`${ab ? `${ligne === 'a' ? traduire('Semaine A') : traduire('Semaine B')}, ` : ''}${nomJour}, ${libelle}`}
                    style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 6, opacity: pressed ? 0.85 : 1 })}
                  >
                    <Ink size={11} weight="extraBold" color={ici ? pal.accent : pal.texte2}>{nomJour.charAt(0).toLocaleUpperCase()}</Ink>
                    <View
                      style={{
                        alignSelf: 'stretch',
                        minHeight: 66,
                        borderRadius: 16,
                        paddingHorizontal: 2,
                        paddingVertical: 6,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: j ? t.fond : pal.page,
                        borderWidth: 2,
                        borderColor: actif ? pal.indigo : 'transparent',
                        overflow: 'hidden',
                        gap: 4,
                      }}
                    >
                      {/* version B : la même couleur, un peu plus soutenue */}
                      {version === 'B' ? <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.encre, opacity: 0.14 }} /> : null}
                      <Ink size={10} weight={j ? 'black' : 'bold'} color={j ? t.encre : pal.texte3} numberOfLines={3} style={{ textAlign: 'center', lineHeight: 12 }}>{j ? nomCourt(traduire(j.titre)) : libelle}</Ink>
                      {version ? <BadgeVersion version={version} encre={t.encre} /> : null}
                    </View>
                    {ici ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: pal.accent }} /> : <View style={{ height: 5 }} />}
                  </Pressable>
                );
              })}
            </View>
            {choisi && choisi.ligne === ligne ? (
              <Choix
                titre={traduire('{0} : quelle séance ?', majuscule(traduire(NOMS[choisi.jour])))}
                actuelle={cases[choisi.jour] ?? null}
                proposees={proposees}
                persoNom={(x) => nomDuProgramme(traduire(x.titre))}
                onChoisir={(c) => changer(ligne, choisi.jour, c)}
              />
            ) : null}
          </View>
        );
      })}

      {/* Semaines A et B */}
      <Pressable
        onPress={basculerAB}
        accessibilityRole="switch"
        accessibilityState={{ checked: allume, disabled: !!reglage?.occupe }}
        disabled={!!reglage?.occupe}
        accessibilityLabel={reglage ? traduire('Alterner A et B') : traduire('Semaines A et B')}
        style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: pressed ? pal.teinte : pal.page })}
      >
        {/* 30 octobre 2026 : stickers de l'app à la place des icônes */}
        <Image source={illustration('repeter')} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={14} weight="extraBold" color={pal.texte}>{reglage ? traduire('Alterner A et B') : traduire('Semaines A et B')}</Ink>
          <Ink size={12} weight="bold" color={pal.texte2}>
            {!reglage ? traduire('Deux semaines qui alternent') : reglage.on && !versions && ab ? traduire('Ta semaine A, puis ta semaine B') : traduire('Chaque séance a sa version B, une semaine sur deux')}
          </Ink>
        </View>
        <PisteInterrupteur on={allume} largeur={50} hauteur={30} />
      </Pressable>
      {reglage?.catalogue && !reglage.on ? (
        <Ink size={12} weight="bold" color={pal.texte2} style={{ lineHeight: 17 }}>{traduire('Ton choix fait de ce programme le tien : tes séances faites et tes charges suivent.')}</Ink>
      ) : null}
      {versions && ab ? <Note texte={traduire('Semaine B : les mêmes jours, chaque séance dans sa version B, avec d’autres exercices pour les mêmes muscles.')} /> : null}
      {bSansEquivalent.length ? (
        <Note texte={traduire('{0} : la version B garde les mêmes exercices, YOROI n’a pas trouvé d’équivalent.', bSansEquivalent.map((j) => avecVersion(nomCourt(traduire(j.titre)), j)).join(', '))} />
      ) : null}
      {bIdentique ? (
        <View style={{ gap: 10 }}>
          <Note attention texte={traduire('Ta semaine B est la même que ta semaine A : mêmes séances, mêmes exercices.')} />
          {reglage?.onPreparerB ? <BoutonPrincipal label={traduire('Préparer les versions B')} compact hauteur={46} onPress={reglage.onPreparerB} disabled={!!reglage.occupe} /> : null}
        </View>
      ) : null}

      {/* ce qu'il faut savoir, sans rien bloquer */}
      {enBoucle ? <Note texte={traduire('Pour l’instant, tes séances s’enchaînent dans l’ordre sur tes jours. Touche un jour pour donner à chaque séance son jour.')} /> : null}
      {lignes.map((ligne) => {
        const seances = seancesDeLaLigne(semaine, p, ligne);
        return seancesTropProches(seances).map((x) => (
          <Note
            key={`p${ligne}${x.jour}`}
            attention
            texte={traduire('{0} et {1} se suivent et travaillent tous les deux {2} : un jour entre les deux aide à récupérer.', nomDe(seances[x.jour]), nomDe(seances[x.suivant]), traduire(MUSCLES[x.muscle] ?? x.muscle))}
          />
        ));
      })}
      <Couverture semaine={semaine} programme={p} lignes={lignes} ab={ab} onAjouter={reglage?.onAjouter} aujourdhui={auj} />
      {!enBoucle ? (
        <Ink size={12} weight="bold" color={pal.texte2} style={{ lineHeight: 17 }}>{traduire('Change quand tu veux, même en pleine semaine : ton historique et tes charges restent.')}</Ink>
      ) : null}
    </View>
  );

  if (nu) return contenu;
  return <View style={{ backgroundColor: pal.carte, borderRadius: 24, padding: 18 }}>{contenu}</View>;
}

/**
 * Ce que ta semaine travaille : une ligne par groupe, honnête, rien de bloqué. 1er novembre 2026, soir : la règle unique
 * des muscles par exercice (musclesExercices.ts, au moins 2 séries directes dans la journée), comme Tes prochaines
 * séances ; vert dès 2 fois, orange en dessous, et la suggestion douce pour le groupe qui manque.
 */
function Couverture({ semaine, programme: p, lignes, ab, onAjouter, aujourdhui }: {
  semaine: SemaineLibre;
  programme: Programme;
  lignes: LigneSemaine[];
  ab: boolean;
  onAjouter?: (s: Suggestion, nom: string, muscle: string) => void;
  aujourdhui: Date;
}) {
  const pal = usePaletteProgramme();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [ajoutes, setAjoutes] = useState<string[]>([]);
  const blocs = useMemo(() => {
    // une semaine à venir, pour poser la suggestion sur un vrai jour
    const lundi = lundiDe(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() + 7, 12));
    return lignes
      .map((ligne) => {
        const seances = seancesDeLaLigne(semaine, p, ligne);
        const jours = joursDeGrille(seances, lundi);
        return { ligne, seances, couv: couvertureGrille(seances), suggestions: onAjouter ? suggestionsSemaine(jours, (j) => j.jour?.exos ?? []) : [] };
      })
      .filter((b) => aDeLaMuscu(b.seances));
  }, [semaine, p, lignes, onAjouter, aujourdhui]);
  if (!blocs.length) return null;
  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 22, backgroundColor: pal.page }}>
      <Ink size={14} weight="black" color={pal.texte}>{traduire('Ce que ta semaine travaille')}</Ink>
      {blocs.map((b) => (
        <View key={b.ligne} style={{ gap: 6 }}>
          {ab ? <Ink size={12} weight="extraBold" color={pal.texte2}>{b.ligne === 'a' ? traduire('Semaine A') : traduire('Semaine B')}</Ink> : null}
          {b.couv.map(({ muscle, jours: fois }) => {
            const g = GROUPES[muscle];
            if (!g) return null;
            const texte = fois === 0
              ? traduire(g.zero)
              : traduirePluriel(fois, fois > 1, '{0} : 1 fois cette semaine', '{0} : {1} fois cette semaine', traduire(g.nom), fois);
            return (
              <View key={muscle} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fois >= 2 ? pal.vert : pal.orange }} />
                <Ink size={13} weight="bold" color={fois < 2 ? pal.texte : pal.texte2} style={{ flex: 1 }}>{texte}</Ink>
              </View>
            );
          })}
          {onAjouter
            ? b.suggestions
                .filter((s) => s.muscle !== 'Abdos')
                .map((s) => {
                  const cle = `${b.ligne}|${s.muscle}|${s.cible.jourId}`;
                  return (
                    <CarteSuggestion
                      key={cle}
                      s={{ ...s, cible: { ...s.cible, titre: nomCourt(s.cible.titre) } }}
                      fait={s.exos.some((e) => ajoutes.includes(`${s.cible.jourId}|${e.nom}`))}
                      ouvert={ouverte === cle}
                      onOuvrir={() => setOuverte(ouverte === cle ? null : cle)}
                      onAjouter={(nom, m) => {
                        setAjoutes((l) => [...l, `${s.cible.jourId}|${nom}`]);
                        onAjouter(s, nom, m);
                      }}
                    />
                  );
                })
            : null}
        </View>
      ))}
      <Ink size={11.5} weight="bold" color={pal.texte2} style={{ lineHeight: 16 }}>{traduire('Point vert : 2 fois ou plus dans la semaine. Point orange : moins de 2 fois, un exercice de plus suffit.')}</Ink>
    </View>
  );
}

/** Le petit badge de la version du jour, A ou B, dans la couleur de la séance */
function BadgeVersion({ version, encre }: { version: Version; encre: string }) {
  const pal = usePaletteProgramme();
  const b = version === 'B';
  return (
    <View style={{ minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: b ? pal.carte : encre, borderWidth: b ? 1.5 : 0, borderColor: encre }}>
      <Ink size={10.5} weight="black" color={b ? encre : '#FFFFFF'} style={{ lineHeight: 13 }}>{version}</Ink>
    </View>
  );
}

/** Le choix du jour touché : ce programme, les autres séances par famille, repos */
function Choix({ titre, actuelle, proposees, persoNom, onChoisir }: {
  titre: string;
  actuelle: CaseSemaine;
  proposees: ReturnType<typeof seancesProposees>;
  persoNom: (p: Programme) => string;
  onChoisir: (c: CaseSemaine) => void;
}) {
  const pal = usePaletteProgramme();
  const familleActuelle = actuelle ? proposees.autres.find((f) => f.seances.some((x) => memeRef(x.ref, actuelle)))?.famille : undefined;
  const [famille, setFamille] = useState<FamilleSeance | undefined>(familleActuelle ?? proposees.autres[0]?.famille);
  const liste = proposees.autres.find((f) => f.famille === famille)?.seances ?? [];
  const ligne = (x: SeanceProposee, k: number, sous: string) => {
    const t = teinteExo(pal, k);
    return (
      <LigneChoix key={`${x.ref.p}/${x.ref.s}`} titre={nomCourt(traduire(x.jour.titre))} sous={sous} on={memeRef(actuelle, x.ref)} fond={t.fond} encre={t.encre} onPress={() => onChoisir(x.ref)} />
    );
  };
  return (
    <View style={{ gap: 10, padding: 12, borderRadius: 22, backgroundColor: pal.page }}>
      <Ink size={14} weight="black" color={pal.texte}>{titre}</Ink>

      {/* 30 octobre 2026 : ton mixte part d'un programme vide (mixte.ts, BASE_MIXTE) : pas de « Ce programme » */}
      {proposees.ceProgramme.length ? (
        <>
          <Ink size={12} weight="extraBold" color={pal.texte2}>{traduire('Ce programme')}</Ink>
          <View style={{ gap: 8 }}>{proposees.ceProgramme.map((x, k) => ligne(x, k, ''))}</View>
        </>
      ) : null}

      {proposees.autres.length ? (
        <>
          <Ink size={12} weight="extraBold" color={pal.texte2}>{traduire('Autres séances')}</Ink>
          {/* 30 octobre 2026 : les familles passent à la ligne, plus aucune coupée au bord de la carte */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {proposees.autres.map((f) => {
              const on = f.famille === famille;
              return (
                <Pressable
                  key={f.famille}
                  onPress={() => { tap(); setFamille(f.famille); }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: on ? pal.indigo : pressed ? pal.teinte : pal.carte })}
                >
                  <Ink size={13} weight="extraBold" color={on ? '#FFFFFF' : pal.texte}>{traduire(f.label)}</Ink>
                </Pressable>
              );
            })}
          </View>
          <View style={{ gap: 8 }}>{liste.map((x, k) => ligne(x, k + 1, persoNom(x.programme)))}</View>
        </>
      ) : null}

      <LigneChoix titre={traduire('Repos')} sous="" on={!actuelle} fond={pal.carte} encre={pal.texte2} onPress={() => onChoisir(null)} repos />
    </View>
  );
}

function LigneChoix({ titre, sous, on, fond, encre, onPress, repos }: { titre: string; sous: string; on: boolean; fond: string; encre: string; onPress: () => void; repos?: boolean }) {
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={sous ? `${titre}, ${sous}` : titre}
      style={({ pressed }) => ({ minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: 18, backgroundColor: pressed ? pal.teinte : pal.carte, borderWidth: 2, borderColor: on ? pal.indigo : 'transparent' })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: repos ? pal.page : fond, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={illustration(repos ? 'sommeil' : 'musculation')} style={{ width: 30, height: 30 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={14} weight="extraBold" color={pal.texte} numberOfLines={1}>{titre}</Ink>
        {sous ? <Ink size={12} weight="bold" color={pal.texte3} numberOfLines={1}>{sous}</Ink> : null}
      </View>
      {on ? <Icon name="check" size={16} color={pal.indigo} strokeWidth={3} /> : null}
    </Pressable>
  );
}

function Note({ texte, attention }: { texte: string; attention?: boolean }) {
  const pal = usePaletteProgramme();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 18, backgroundColor: attention ? pal.orangeTint : pal.teinte }}>
      <Image source={illustration(attention ? 'objectifs' : 'repeter')} style={{ width: 24, height: 24 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Ink size={12} weight="bold" color={pal.texte} style={{ flex: 1, lineHeight: 17 }}>{texte}</Ink>
    </View>
  );
}

/**
 * « Tes jours » du programme en cours, qui s'enregistre tout seul (page du programme, Coach).
 * 30 octobre 2026 : ton programme à toi aussi (construit, gardé, mixte habituel) : ta semaine est écrite dans ton
 * programme et dans ton programme en cours (suivi.ts, modifierSemainePerso), tes exercices se changent toujours dans
 * « Modifier mon programme ».
 */
export function TesJoursEnCours({ programme }: { programme?: Programme | null }) {
  const router = useRouter();
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  // ton programme à toi : ta semaine telle que tu viens de la changer, le temps qu'elle soit enregistrée
  const [vue, setVue] = useState<SemaineLibre | null>(null);
  // 1er novembre 2026, soir : ton programme à toi tel qu'enregistré (son réglage A et B)
  const [pps, setPps] = useState<ProgrammePerso[]>([]);
  const [occupe, setOccupe] = useState(false);
  useEffect(() => {
    let vivant = true;
    const lire = () => {
      chargerProgrammeActif()
        .then((a) => { if (vivant) { setActif(a); setVue(null); } })
        .catch(() => { if (vivant) setActif(null); });
      chargerProgrammesPerso()
        .then((l) => { if (vivant) setPps(l); })
        .catch(() => {});
    };
    lire();
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, lire);
    // un programme qui alterne et dont une séance n'a pas encore sa version B (programme d'avant migré) : préparée ici
    void completerVersionsB().catch(() => false);
    return () => { vivant = false; sub.remove(); };
  }, []);
  // ton programme à toi est relu à chaque changement (registrePerso.ts) : la version la plus fraîche
  const frais = actif ? programmeParId(actif.id) ?? null : null;
  const p = programme ? (frais && frais.id === programme.id ? frais : programme) : frais;
  const perso = !!p && estProgrammePerso(p.id);
  const pp = perso && p ? pps.find((x) => x.id === p.id) ?? null : null;

  // allumer ou éteindre « Alterner A et B » ; un programme du catalogue devient le tien, la page suit
  const alterner = useCallback(async (on: boolean) => {
    setOccupe(true);
    try {
      const id = await basculerAlternance(on);
      if (id && programme && id !== programme.id) router.replace({ pathname: '/programmes/[id]' as any, params: { id } });
    } catch {
      // rien n'a changé
    } finally {
      setOccupe(false);
    }
  }, [programme, router]);

  if (!actif || !p || actif.id !== p.id) return null;
  const v = semaineAffichee(actif, p);
  const semaine = perso && vue ? vue : v.semaine;
  const garder = !perso && peutGarder(actif, p);
  const reglage: ReglageAB = pp
    ? {
        on: alternanceAffichee(pp) === 'ab',
        versions: pp.alternance === 'ab' && !aSaSemaineB(pp),
        catalogue: false,
        occupe,
        onBasculer: () => void alterner(alternanceAffichee(pp) !== 'ab'),
        onAjouter: (s, nom, muscle) => void ajouterExerciceSuggere(s.cible.jourId, s.cible.date, nom, muscle).catch(() => false),
      }
    : {
        on: !!semaine.ab && !!semaine.b,
        versions: false,
        catalogue: garder,
        occupe,
        onBasculer: () => {
          const on = !!semaine.ab && !!semaine.b;
          // éteindre : ta semaine A seule, ta semaine B gardée ; allumer : de vraies versions B quand c'est possible
          if (!on && garder) {
            void alterner(true);
            return;
          }
          const s = avecAB(semaine, !on);
          setActif((a) => (a ? { ...a, semaine: s } : a));
          void enregistrerSemaine(s);
        },
        ...(garder ? { onPreparerB: () => void alterner(true) } : {}),
        ...(garder
          ? {
              // l'exercice ajouté fait de ce programme le tien (comme dans Tes prochaines séances) : la page suit
              onAjouter: (s: Suggestion, nom: string, muscle: string) =>
                void ajouterExerciceSuggere(s.cible.jourId, s.cible.date, nom, muscle)
                  .then(() => chargerProgrammeActif())
                  .then((a) => { if (a && programme && a.id !== programme.id) router.replace({ pathname: '/programmes/[id]' as any, params: { id: a.id } }); })
                  .catch(() => {}),
            }
          : {}),
      };
  return (
    <TesJours
      programme={p}
      semaine={semaine}
      fin={actif.fin}
      enBoucle={!(perso && vue) && v.enBoucle}
      reglage={reglage}
      onSemaine={(s) => {
        if (perso) {
          setVue(s);
          void modifierSemainePerso(s)
            .then((ok) => {
              if (!ok) setVue(null);
              // une séance posée sur un jour reçoit sa version B quand tes séances alternent
              else if (pp?.alternance === 'ab') void completerVersionsB().catch(() => false);
            })
            .catch(() => setVue(null));
          return;
        }
        setActif((a) => (a ? { ...a, semaine: s } : a));
        void enregistrerSemaine(s);
      }}
    />
  );
}
