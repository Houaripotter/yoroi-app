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
 * Utilisé dans le départ du coach (app/coach-depart.tsx), la page du programme (app/programmes/[id].tsx) et le
 * Coach (app/coach.tsx, TesJoursEnCours).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Pressable, ScrollView, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { RondIcone, nomCourt, teinteExo, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { indexJour } from '@/lib/v2/programmes/coach';
import { PROGRAMMES, programmeParId } from '@/lib/v2/programmes/catalogue';
import type { FinSeance } from '@/lib/v2/programmes/finSeance';
import { nomDuProgramme } from '@/lib/v2/programmes/heroJour';
import { chargerProgrammesPerso, programmesVisibles } from '@/lib/v2/programmes/monProgramme';
import {
  aDeLaMuscu, avecAB, avecCase, casesDe, couverture, estSemaineB, familleDeSeance, memeRef, seancesDeLaLigne,
  seancesProposees, seancesTropProches, semaineDepuisBoucle, semaineUtile,
} from '@/lib/v2/programmes/semaineLibre';
import type { CaseSemaine, FamilleSeance, GroupeMuscle, LigneSemaine, SemaineLibre, SeanceProposee } from '@/lib/v2/programmes/semaineLibre';
import { PROGRAMME_CHANGED_EVENT, chargerProgrammeActif, enregistrerSemaine, joursDuProgramme, semaineEffective } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { JourProgramme, Programme } from '@/lib/v2/programmes/types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const NOMS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MUSCLES: Record<string, string> = { pectoraux: 'les pectoraux', dos: 'le dos', jambes: 'les jambes', fessiers: 'les fessiers' };
const majuscule = (t: string) => t.charAt(0).toLocaleUpperCase() + t.slice(1);

/** Le nom d'un groupe et la phrase quand il n'est pas travaillé (accordée en français) */
const GROUPES: Record<GroupeMuscle, { nom: string; zero: string }> = {
  pectoraux: { nom: 'Pectoraux', zero: 'Pectoraux : pas travaillés cette semaine' },
  dos: { nom: 'Dos', zero: 'Dos : pas travaillé cette semaine' },
  epaules: { nom: 'Épaules', zero: 'Épaules : pas travaillées cette semaine' },
  bras: { nom: 'Bras', zero: 'Bras : pas travaillés cette semaine' },
  jambes: { nom: 'Jambes', zero: 'Jambes : pas travaillées cette semaine' },
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
};

/** La semaine à montrer : la tienne, sinon tes séances dans l'ordre sur tes jours (programme en boucle) */
export function semaineAffichee(a: ProgrammeActif | null, p: Programme, plan?: readonly number[] | null, jours?: readonly number[]): { semaine: SemaineLibre; enBoucle: boolean } {
  const enCours = !!a && a.id === p.id;
  const s = enCours ? semaineEffective(a, p) : semaineEffective(plan ? { plan: [...plan], jours: jours ? [...jours] : undefined } : null, p);
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

export function TesJours({ programme: p, semaine, onSemaine, fin, enBoucle, nu, aujourdhui }: TesJoursProps) {
  const pal = usePaletteProgramme();
  const persos = usePersos();
  const [choisi, setChoisi] = useState<{ ligne: LigneSemaine; jour: number } | null>(null);
  const auj = aujourdhui ?? new Date();
  const kAuj = indexJour(auj);
  const ab = !!semaine.ab && !!semaine.b;
  const ligneAuj: LigneSemaine = estSemaineB(semaine, auj) ? 'b' : 'a';
  const proposees = useMemo(() => seancesProposees(p, PROGRAMMES, persos, fin), [p, persos, fin]);

  // une couleur par séance du programme, une par famille pour les autres
  const teinteDe = (c: CaseSemaine, j: JourProgramme | null) => {
    if (!c || !j) return { fond: pal.page, encre: pal.texte3 };
    if (c.p === p.id) return teinteExo(pal, Math.max(0, p.jours.findIndex((x) => x.id === c.s)));
    const src = programmeParId(c.p);
    const f = src ? familleDeSeance(src, j) : null;
    return teinteExo(pal, f ? ['push', 'pull', 'legs', 'upper', 'lower', 'fullbody', 'perso'].indexOf(f) + 1 : 1);
  };
  const nomDe = (j: JourProgramme | null) => (j ? nomCourt(traduire(j.titre)) : traduire('Repos'));

  const changer = (ligne: LigneSemaine, jour: number, c: CaseSemaine) => {
    tap();
    const suite = avecCase(semaine, ligne, jour, c);
    // au moins une séance dans la semaine
    if (semaineUtile(suite)) onSemaine(suite);
    setChoisi(null);
  };

  const basculerAB = () => {
    tap();
    setChoisi(null);
    onSemaine(avecAB(semaine, !ab, auj));
  };

  const lignes: LigneSemaine[] = ab ? ['a', 'b'] : ['a'];

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
                      }}
                    >
                      <Ink size={10} weight={j ? 'black' : 'bold'} color={j ? t.encre : pal.texte3} numberOfLines={3} style={{ textAlign: 'center', lineHeight: 12 }}>{libelle}</Ink>
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
        accessibilityState={{ checked: ab }}
        accessibilityLabel={traduire('Semaines A et B')}
        style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: pressed ? pal.teinte : pal.page })}
      >
        <Icon name="repeat" size={17} color={pal.accent} />
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={14} weight="extraBold" color={pal.texte}>{traduire('Semaines A et B')}</Ink>
          <Ink size={12} weight="bold" color={pal.texte2}>{traduire('Deux semaines qui alternent')}</Ink>
        </View>
        <View style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: ab ? pal.indigo : pal.anneau, alignItems: ab ? 'flex-end' : 'flex-start' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: pal.carte }} />
        </View>
      </Pressable>

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
      <Couverture semaine={semaine} programme={p} lignes={lignes} ab={ab} />
      {!enBoucle ? (
        <Ink size={12} weight="bold" color={pal.texte2} style={{ lineHeight: 17 }}>{traduire('Change quand tu veux, même en pleine semaine : ton historique et tes charges restent.')}</Ink>
      ) : null}
    </View>
  );

  if (nu) return contenu;
  return <View style={{ backgroundColor: pal.carte, borderRadius: 24, padding: 18 }}>{contenu}</View>;
}

/** Ce que ta semaine travaille : une ligne par groupe, honnête, rien de bloqué */
function Couverture({ semaine, programme: p, lignes, ab }: { semaine: SemaineLibre; programme: Programme; lignes: LigneSemaine[]; ab: boolean }) {
  const pal = usePaletteProgramme();
  const blocs = lignes.map((ligne) => ({ ligne, seances: seancesDeLaLigne(semaine, p, ligne) })).filter((b) => aDeLaMuscu(b.seances));
  if (!blocs.length) return null;
  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 22, backgroundColor: pal.page }}>
      <Ink size={14} weight="black" color={pal.texte}>{traduire('Ce que ta semaine travaille')}</Ink>
      {blocs.map((b) => (
        <View key={b.ligne} style={{ gap: 6 }}>
          {ab ? <Ink size={12} weight="extraBold" color={pal.texte2}>{b.ligne === 'a' ? traduire('Semaine A') : traduire('Semaine B')}</Ink> : null}
          {couverture(b.seances).map(({ groupe, fois }) => {
            const g = GROUPES[groupe];
            const texte = fois === 0
              ? traduire(g.zero)
              : traduirePluriel(fois, fois > 1, '{0} : 1 fois cette semaine', '{0} : {1} fois cette semaine', traduire(g.nom), fois);
            return (
              <View key={groupe} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fois === 0 ? pal.orange : fois === 1 ? pal.accent : pal.vert }} />
                <Ink size={13} weight="bold" color={fois === 0 ? pal.texte : pal.texte2} style={{ flex: 1 }}>{texte}</Ink>
              </View>
            );
          })}
        </View>
      ))}
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

      <Ink size={12} weight="extraBold" color={pal.texte2}>{traduire('Ce programme')}</Ink>
      <View style={{ gap: 8 }}>{proposees.ceProgramme.map((x, k) => ligne(x, k, ''))}</View>

      {proposees.autres.length ? (
        <>
          <Ink size={12} weight="extraBold" color={pal.texte2}>{traduire('Autres séances')}</Ink>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
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
          </ScrollView>
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
      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: repos ? pal.page : fond, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={repos ? 'moon' : 'dumbbell'} size={15} color={encre} />
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
      <Icon name={attention ? 'target' : 'repeat'} size={16} color={attention ? pal.orange : pal.accent} />
      <Ink size={12} weight="bold" color={pal.texte} style={{ flex: 1, lineHeight: 17 }}>{texte}</Ink>
    </View>
  );
}

/** « Tes jours » du programme en cours, qui s'enregistre tout seul (page du programme, Coach) */
export function TesJoursEnCours({ programme }: { programme?: Programme | null }) {
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  useEffect(() => {
    const lire = () => chargerProgrammeActif().then(setActif).catch(() => setActif(null));
    lire();
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, lire);
    return () => sub.remove();
  }, []);
  const p = programme ?? (actif ? programmeParId(actif.id) ?? null : null);
  if (!actif || !p || actif.id !== p.id) return null;
  const v = semaineAffichee(actif, p);
  return (
    <TesJours
      programme={p}
      semaine={v.semaine}
      fin={actif.fin}
      enBoucle={v.enBoucle}
      onSemaine={(s) => {
        setActif((a) => (a ? { ...a, semaine: s } : a));
        void enregistrerSemaine(s);
      }}
    />
  );
}
