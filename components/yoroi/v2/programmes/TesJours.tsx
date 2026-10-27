/**
 * « Tes jours » (27 octobre 2026). Houari : « Je dois pouvoir choisir sur quel jour de la semaine je fais mon Push,
 * mon Pull, mon Upper, mon Lower. C'est à toi de rendre ça modifiable partout. »
 * Sept cases, du lundi au dimanche : chaque jour d'entraînement montre sa séance dans sa couleur, les autres « Repos ».
 * Toucher un jour ouvre juste en dessous la liste des séances du programme et « Repos » : la séance choisie vient
 * sur ce jour, ce qui y était prend sa place (chaque séance une fois par semaine).
 * Un programme en boucle (Séance A et Séance B sur 3 jours) : on choisit seulement ses jours, les séances s'enchaînent.
 * Le modèle est dans lib/v2/programmes/planJours.ts. Utilisé dans le départ du coach (app/coach-depart.tsx),
 * la page du programme (app/programmes/[id].tsx) et le Coach (app/coach.tsx, TesJoursEnCours).
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Pressable, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { RondIcone, nomCourt, teinteExo, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { conseilJours, indexJour } from '@/lib/v2/programmes/coach';
import { indicesGardes, joursTropProches, mettreAuRepos, placerSeance, planPartiel, REPOS, seancesSansJour } from '@/lib/v2/programmes/planJours';
import type { FinSeance } from '@/lib/v2/programmes/finSeance';
import { programmeParId } from '@/lib/v2/programmes/catalogue';
import { PROGRAMME_CHANGED_EVENT, chargerProgrammeActif, enregistrerJours, enregistrerPlan, joursDuProgramme, planEffectif } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Programme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';

const NOMS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MUSCLES: Record<string, string> = { pectoraux: 'les pectoraux', dos: 'le dos', jambes: 'les jambes', fessiers: 'les fessiers' };
const majuscule = (t: string) => t.charAt(0).toLocaleUpperCase() + t.slice(1);

export type TesJoursProps = {
  programme: Programme;
  /** programme à la semaine : le jour de chaque séance (planJours.ts) ; null : programme en boucle */
  plan: number[] | null;
  /** programme en boucle : tes jours d'entraînement (0 = lundi) */
  jours: number[];
  fin?: FinSeance | null;
  onPlan: (plan: number[]) => void;
  onJours: (jours: number[]) => void;
  /** vrai : tes séances s'enchaînent encore dans l'ordre (jours choisis avant le 27 octobre 2026) */
  enBoucle?: boolean;
  /** sans carte autour (le départ du coach a déjà la sienne) */
  nu?: boolean;
  aujourdhui?: Date;
};

export function TesJours({ programme: p, plan, jours, fin, onPlan, onJours, enBoucle, nu, aujourdhui }: TesJoursProps) {
  const pal = usePaletteProgramme();
  const [choisi, setChoisi] = useState<number | null>(null);
  const kAuj = indexJour(aujourdhui ?? new Date());
  const fixe = !!plan;
  const gardes = indicesGardes(p, fin);
  const teinteDe = (i: number) => teinteExo(pal, gardes.indexOf(i) < 0 ? i : gardes.indexOf(i));
  const nomDe = (i: number) => nomCourt(traduire(p.jours[i].titre));

  const sansJour = plan ? seancesSansJour(p, plan, fin) : [];
  const proches = plan ? joursTropProches(p, plan) : [];

  const choisir = (d: number, index: number | 'repos' | 'entrainement') => {
    tap();
    if (plan) {
      const suite = index === 'repos' ? mettreAuRepos(plan, d) : typeof index === 'number' ? placerSeance(plan, index, d) : plan;
      // au moins une séance garde un jour
      if (suite.some((x) => x !== REPOS)) onPlan(suite);
    } else if (index === 'repos') {
      const suite = jours.filter((x) => x !== d);
      // au moins un jour d'entraînement
      if (suite.length) onJours(suite);
    } else if (!jours.includes(d)) onJours([...jours, d].sort((a, b) => a - b));
    setChoisi(null);
  };

  const contenu = (
    <View style={{ gap: 14 }}>
      {!nu ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <RondIcone icone="calendar" />
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={17} weight="black" tight color={pal.texte} accessibilityRole="header">{traduire('Tes jours')}</Ink>
            <Ink size={12} weight="bold" color={pal.texte2}>{fixe ? traduire('Touche un jour pour choisir sa séance.') : traduire('Touche un jour pour t’entraîner ou te reposer.')}</Ink>
          </View>
          <Pressable
            onPress={() => { tap(); setChoisi((x) => (x === null ? kAuj : null)); }}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: pressed ? pal.anneau : pal.teinte })}
          >
            <Ink size={13} weight="extraBold" color={pal.accent}>{choisi === null ? traduire('Modifier') : traduire('Fermer')}</Ink>
          </Pressable>
        </View>
      ) : null}

      {/* les sept jours */}
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {NOMS.map((nomFr, d) => {
          const nomJour = traduire(nomFr);
          const i = plan ? plan.indexOf(d) : -1;
          const entraine = plan ? i >= 0 : jours.includes(d);
          const t = i >= 0 ? teinteDe(i) : { fond: pal.teinte, encre: pal.accent };
          const actif = choisi === d;
          const libelle = i >= 0 ? nomDe(i) : entraine ? traduire('Séance') : traduire('Repos');
          return (
            <Pressable
              key={d}
              onPress={() => { tap(); setChoisi((x) => (x === d ? null : d)); }}
              accessibilityRole="button"
              accessibilityState={{ selected: actif }}
              accessibilityLabel={`${nomJour}, ${libelle}`}
              style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 6, opacity: pressed ? 0.85 : 1 })}
            >
              <Ink size={11} weight="extraBold" color={d === kAuj ? pal.accent : pal.texte2}>{nomJour.charAt(0).toLocaleUpperCase()}</Ink>
              <View
                style={{
                  alignSelf: 'stretch',
                  minHeight: 66,
                  borderRadius: 16,
                  paddingHorizontal: 2,
                  paddingVertical: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: entraine ? t.fond : pal.page,
                  borderWidth: 2,
                  borderColor: actif ? pal.indigo : 'transparent',
                }}
              >
                <Ink size={10} weight={entraine ? 'black' : 'bold'} color={entraine ? t.encre : pal.texte3} numberOfLines={3} style={{ textAlign: 'center', lineHeight: 12 }}>{libelle}</Ink>
              </View>
              {d === kAuj ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: pal.accent }} /> : <View style={{ height: 5 }} />}
            </Pressable>
          );
        })}
      </View>

      {/* le choix du jour touché, juste en dessous */}
      {choisi !== null ? (
        <View style={{ gap: 8, padding: 12, borderRadius: 22, backgroundColor: pal.page }}>
          <Ink size={14} weight="black" color={pal.texte}>{fixe ? traduire('{0} : quelle séance ?', majuscule(traduire(NOMS[choisi]))) : majuscule(traduire(NOMS[choisi]))}</Ink>
          {plan
            ? gardes.map((i) => {
                const on = plan[i] === choisi;
                const t = teinteDe(i);
                const ailleurs = plan[i] !== REPOS && !on ? traduire('Prévue le {0}', traduire(NOMS[plan[i]])) : plan[i] === REPOS ? traduire('Sans jour') : '';
                return (
                  <LigneChoix key={p.jours[i].id} titre={nomDe(i)} sous={ailleurs} on={on} fond={t.fond} encre={t.encre} onPress={() => choisir(choisi, i)} />
                );
              })
            : (
                <LigneChoix titre={traduire('Entraînement')} sous="" on={jours.includes(choisi)} fond={pal.teinte} encre={pal.accent} onPress={() => choisir(choisi, 'entrainement')} />
              )}
          <LigneChoix titre={traduire('Repos')} sous="" on={plan ? plan.indexOf(choisi) < 0 : !jours.includes(choisi)} fond={pal.carte} encre={pal.texte2} onPress={() => choisir(choisi, 'repos')} repos />
        </View>
      ) : null}

      {/* ce qu'il faut savoir, sans rien bloquer */}
      {enBoucle ? <Note texte={traduire('Pour l’instant, tes séances s’enchaînent dans l’ordre sur tes jours. Touche un jour pour donner à chaque séance son jour.')} /> : null}
      {sansJour.map((i) => (
        <Note key={`s${i}`} attention texte={traduire('{0} n’a pas de jour : tu ne la feras pas cette semaine.', nomDe(i))} />
      ))}
      {plan
        ? proches.map((x) => (
            <Note
              key={`p${x.jour}`}
              attention
              texte={traduire('{0} et {1} se suivent et travaillent tous les deux {2} : un jour entre les deux aide à récupérer.', nomDe(plan.indexOf(x.jour)), nomDe(plan.indexOf(x.suivant)), traduire(MUSCLES[x.muscle] ?? x.muscle))}
            />
          ))
        : null}
      {fixe && !enBoucle && !sansJour.length ? (
        <Ink size={12} weight="bold" color={pal.texte2} style={{ lineHeight: 17 }}>{traduire('Change quand tu veux, même en pleine semaine : ton historique et tes charges restent.')}</Ink>
      ) : null}
      {!fixe ? (
        <Ink size={12} weight="bold" color={pal.texte2} style={{ lineHeight: 17 }}>{`${traduire('Tes séances s’enchaînent dans l’ordre sur ces jours.')} ${conseilJours(p.joursParSemaine, jours.length)}`}</Ink>
      ) : null}
    </View>
  );

  if (nu) return contenu;
  return <View style={{ backgroundColor: pal.carte, borderRadius: 24, padding: 18 }}>{contenu}</View>;
}

function LigneChoix({ titre, sous, on, fond, encre, onPress, repos }: { titre: string; sous: string; on: boolean; fond: string; encre: string; onPress: () => void; repos?: boolean }) {
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={sous ? `${titre}, ${sous}` : titre}
      style={({ pressed }) => ({ minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: 18, backgroundColor: pressed ? pal.teinte : pal.carte, borderWidth: 2, borderColor: on ? pal.indigo : 'transparent' })}
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

/** Ce qu'il faut montrer pour le programme en cours : son plan, ou tes jours d'un programme en boucle */
export function valeursTesJours(a: ProgrammeActif | null, p: Programme): { plan: number[] | null; jours: number[]; enBoucle: boolean } {
  const enCours = !!a && a.id === p.id;
  const jours = joursDuProgramme(enCours ? a : null, p);
  const plan = planEffectif(enCours ? a : null, p);
  if (plan) return { plan, jours, enBoucle: false };
  // programme à la semaine, mais tes jours ne collent pas au nombre de séances : on montre où elles tombent
  const partiel = planPartiel(p, jours, enCours ? a?.fin : null);
  return { plan: partiel, jours, enBoucle: !!partiel };
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
  const v = valeursTesJours(actif, p);
  return (
    <TesJours
      programme={p}
      plan={v.plan}
      jours={v.jours}
      fin={actif.fin}
      enBoucle={v.enBoucle}
      onPlan={(pl) => {
        setActif((a) => (a ? { ...a, plan: pl } : a));
        void enregistrerPlan(pl);
      }}
      onJours={(j) => {
        setActif((a) => (a ? { ...a, jours: j } : a));
        void enregistrerJours(j);
      }}
    />
  );
}
