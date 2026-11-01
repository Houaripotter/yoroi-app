/**
 * Les blocs de l'accueil en grand écran (1er novembre 2026, Houari sur son MacBook : « Sincèrement, sur le côté on
 * peut augmenter des choses ou rajouter des choses, non ? »). Rendus seulement en grand écran (Mac, iPad), chacun
 * cachable dans Tes blocs (lib/v2/accueil/blocsGrandEcran.ts). Un bloc sans donnée ne dessine rien : jamais de
 * chiffre inventé, jamais d'exemple grisé. Stickers seulement.
 *   BlocProgramme       : la bande des 7 jours de ton programme (JourParJour.tsx, BandeJours compacte)
 *   BlocMuscles         : la carte rouge des muscles (MusclesSemaine) de ta semaine prévue, sinon faite
 *   BlocFormeMatin      : ton dernier score de forme du matin et tes 5 curseurs
 *   BlocRecords         : tes 3 derniers records
 *   BlocPoids7          : ta moyenne sur 7 jours, l'écart avec la semaine d'avant, ta composition
 *   BlocCartes          : 3 vignettes de ta bibliothèque de cartes
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { CarreSticker, useCarteA, useTeinte } from '@/components/yoroi/v2/seances/kitA';
import type { TeinteA } from '@/components/yoroi/v2/seances/kitA';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { BandeJours } from '@/components/yoroi/v2/programmes/JourParJour';
import { MusclesSemaine } from '@/components/yoroi/v2/seances/MusclesSemaine';
import { Vignette } from '@/components/yoroi/v2/cartes/Bibliotheque';
import { lienEditeur } from '@/components/yoroi/v2/cartes/FeuilleCarte';
import { useCarte } from '@/components/yoroi/v2/cartes/useCarte';
import { vueDuJour } from '@/app/programmes/prochaines';
import { useProgrammeAccueil } from './useProgrammeAccueil';
import type { ProgrammeAccueil } from './useProgrammeAccueil';
import { useLargeurEcran } from '@/lib/v2/nav/useGrandEcran';
import type { Training, Weight } from '@/lib/database';
import { DATE_FNS_LOCALE } from '@/lib/i18n/dateLocale';
import { jourParDefaut, lettreDeLaSemaine, semaineVue } from '@/lib/v2/programmes/pageProgramme';
import { couverturePrevue } from '@/lib/v2/programmes/prochainesSeances';
import { seanceDeBase } from '@/lib/v2/programmes/alternance';
import { estExoCardio } from '@/lib/v2/programmes/briques';
import { musclesDesExercices } from '@/lib/v2/seances/musclesExercices';
import { musclesSemaine } from '@/lib/v2/seances/weekSummary';
import { ITEMS_FORME, lireFormes, scoreForme, toneForme } from '@/lib/v2/mesures/formeMatin';
import type { FormeMatin, ItemForme } from '@/lib/v2/mesures/formeMatin';
import { EVENEMENT_CORPS } from '@/lib/v2/mesures/listeStockee';
import { poidsSemaine, recordsRecents } from '@/lib/v2/accueil/blocsGrandEcran';
import { chargeParts, chargeTexte } from '@/lib/v2/unitePoids';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { chargerBibliotheque } from '@/lib/v2/cartes/bibliotheque';
import type { CarteData, CouleurId, DirectionId, OptionsCarte } from '@/lib/v2/cartes/types';
import { chiffresParDefaut, familleDe } from '@/lib/v2/cartes/chiffres';
import { directionEffective } from '@/lib/v2/cartes/directions';
import { getSportCategory } from '@/lib/sports';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

const le = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`);
const p2 = (n: number) => String(n).padStart(2, '0');
const isoDe = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const dateCourte = (iso: string) => format(le(iso), 'd MMM', { locale: DATE_FNS_LOCALE });

/** Le cadre d'un bloc : sticker dans son carré pastel, titre, phrase, lien à droite ; un toucher ouvre son écran */
function CarteBloc({ sticker, teinte, titre, sous, lien, onLien, onPress, children }: { sticker: NomSticker; teinte: TeinteA; titre: string; sous?: string; lien?: string; onLien?: () => void; onPress?: () => void; children?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const corps = (
    <View style={[carte, { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <CarreSticker nom={sticker} teinte={teinte} taille={44} />
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Ink size={16} weight="black" tight numberOfLines={1} accessibilityRole="header">{titre}</Ink>
          {sous ? <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={2}>{sous}</Ink> : null}
        </View>
        {lien && onLien ? (
          <Pressable onPress={() => { tap(); onLien(); }} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Ink size={13} weight="extraBold" color={c.accentText}>{lien}</Ink>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
  if (!onPress) return corps;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={[titre, sous].filter(Boolean).join(', ')} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      {corps}
    </Pressable>
  );
}

/* ---------------------------------- Ton programme, lu une fois ---------------------------------- */

const ProgrammeContext = createContext<ProgrammeAccueil>({ d: null, pret: false, prochaine: null });

/** Ton programme lu une seule fois pour tous les blocs du tableau de bord (grand écran seulement) */
export function FournisseurProgramme({ children }: { children: React.ReactNode }) {
  const prog = useProgrammeAccueil();
  return <ProgrammeContext.Provider value={prog}>{children}</ProgrammeContext.Provider>;
}

export const useProgrammeDesBlocs = () => useContext(ProgrammeContext);

/* ---------------------------------- Ton programme ---------------------------------- */

export function BlocProgramme() {
  const prog = useProgrammeDesBlocs();
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const d = prog.d;
  const vue = useMemo(() => {
    if (!d) return null;
    try {
      const maintenant = new Date();
      const jps = semaineVue(d.actif, d.p, 0, d.trainings, maintenant);
      const vues = jps.map((jp) => vueDuJour(d, jp));
      const autres: string[] = [];
      const rangs = vues.map((x) => {
        const j = x.jp.jour;
        if (!j) return -1;
        const r = d.p.jours.findIndex((y) => y.id === seanceDeBase(d.p.jours, j).id);
        if (r >= 0) return r;
        if (!autres.includes(j.titre)) autres.push(j.titre);
        return d.p.jours.length + autres.indexOf(j.titre);
      });
      const auj = isoDe(maintenant);
      return { jps, vues, rangs, auj, choisi: jourParDefaut(jps, auj) };
    } catch {
      return null;
    }
  }, [d]);
  if (!d || !vue) return null;
  const ouvrir = () => router.push({ pathname: '/programmes/[id]' as any, params: { id: d.p.id } });
  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={() => { tap(); ouvrir(); }} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 2 }}>
        <Ink size={21} weight="black" tight accessibilityRole="header">{traduire('Ton programme')}</Ink>
        <Ink size={13} weight="extraBold" color={theme.colors.accentText}>{traduire('Voir le programme')}</Ink>
      </Pressable>
      <BandeJours
        compact
        vues={vue.vues}
        rangs={vue.rangs}
        choisi={vue.choisi}
        onChoisir={ouvrir}
        decalage={0}
        lettre={lettreDeLaSemaine(vue.jps)}
        aujourdhui={vue.auj}
        peutAvant={false}
        peutApres={false}
        onAvant={() => {}}
        onApres={() => {}}
      />
    </View>
  );
}

/* ---------------------------------- Ta semaine travaille ---------------------------------- */

export function BlocMuscles({ trainings }: { trainings: Training[] }) {
  const prog = useProgrammeDesBlocs();
  const router = useRouter();
  const largeurEcran = useLargeurEcran();
  const d = prog.d;
  const bilan = useMemo(() => {
    try {
      if (d) {
        // ta semaine prévue, comme la page du programme : les séances de musculation de cette semaine
        const vues = semaineVue(d.actif, d.p, 0, d.trainings, new Date()).map((jp) => vueDuJour(d, jp)).filter((x) => x.jp.jour && x.muscu);
        if (vues.length) {
          const m = musclesDesExercices(vues.flatMap((x) => x.exos.filter((e) => !estExoCardio(e)).map((e) => ({ name: e.nom, muscle_group: e.muscle, sets: e.series, reps: e.repsMin }))), d.perso);
          const couv = couverturePrevue(vues.map((x) => ({ date: x.jp.date, exos: x.exos })), d.perso).filter((x) => x.muscle !== 'Abdos');
          return { loads: m.loads, zones: m.zones, prevu: true, atteints: couv.filter((x) => x.jours >= 2).length, total: couv.length };
        }
      }
      const m = musclesSemaine(trainings, isoDe(new Date()));
      return { loads: m.loads, zones: m.zones, prevu: false, atteints: 0, total: 0 };
    } catch {
      return null;
    }
  }, [d, trainings]);
  if (!bilan || !bilan.loads.some((m) => m.level > 0)) return null;
  const sous = bilan.prevu
    ? traduire('{0} muscles sur {1} prévus 2 fois cette semaine', bilan.atteints, bilan.total)
    : traduire('Ce que tes séances ont travaillé depuis lundi');
  const ouvrir = () => (d ? router.push({ pathname: '/programmes/[id]' as any, params: { id: d.p.id } }) : router.push('/(tabs)/seances' as any));
  return (
    <CarteBloc sticker="muscle" teinte="peche" titre={traduire('Ta semaine travaille')} sous={sous} onPress={ouvrir}>
      <MusclesSemaine loads={bilan.loads} zones={bilan.zones} largeur={Math.max(200, largeurEcran - 32 - 32)} liste={false} />
    </CarteBloc>
  );
}

/* ---------------------------------- Forme du matin ---------------------------------- */

const ITEMS: Record<ItemForme, { titre: string; sticker: NomSticker }> = {
  sommeil: { titre: 'Sommeil ressenti', sticker: 'sommeil' },
  fatigue: { titre: 'Fatigue', sticker: 'energie' },
  courbatures: { titre: 'Courbatures', sticker: 'muscle' },
  stress: { titre: 'Stress', sticker: 'cerveau' },
  motivation: { titre: 'Motivation', sticker: 'flamme' },
};

export function BlocFormeMatin() {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const menthe = useTeinte('menthe');
  const [formes, setFormes] = useState<FormeMatin[] | null>(null);
  useEffect(() => {
    let vivant = true;
    const lire = () => lireFormes().then((f) => vivant && setFormes(f)).catch(() => vivant && setFormes([]));
    lire();
    const s = DeviceEventEmitter.addListener(EVENEMENT_CORPS, lire);
    return () => { vivant = false; s.remove(); };
  }, []);
  const derniere = useMemo(() => (formes ?? []).filter((f) => f.date <= isoDe(new Date())).sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null, [formes]);
  if (!derniere) return null;
  const s = scoreForme(derniere);
  const couleur = { bien: c.successText, moyen: c.ink, bas: c.danger }[toneForme(s)];
  const quand = derniere.date === isoDe(new Date()) ? traduire('ce matin') : dateCourte(derniere.date);
  return (
    <CarteBloc sticker="lune_soleil" teinte="menthe" titre={traduire('Ta forme du matin')} sous={quand} onPress={() => router.push('/forme-matin' as never)}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Ink size={40} weight="black" tight color={couleur} style={{ fontVariant: ['tabular-nums'] }}>{`${s}`}</Ink>
        <Ink size={14} weight="bold" color={c.textSecondary}>{traduire('sur 100')}</Ink>
      </View>
      <View style={{ gap: 8 }}>
        {ITEMS_FORME.map((k) => {
          // 1 = au mieux, 7 = au plus mal : la barre est pleine quand tu vas bien
          const part = (8 - derniere[k]) / 7;
          return (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessible accessibilityLabel={`${traduire(ITEMS[k].titre)}, ${derniere[k]} / 7`}>
              <Image source={illus.img(ITEMS[k].sticker)} style={{ width: 22, height: 22 }} resizeMode="contain" />
              <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={1} style={{ width: 118 }}>{traduire(ITEMS[k].titre)}</Ink>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: c.fillSoft, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(part * 100)}%`, height: 8, borderRadius: 4, backgroundColor: menthe.texte }} />
              </View>
            </View>
          );
        })}
      </View>
    </CarteBloc>
  );
}

/* ---------------------------------- Tes records récents ---------------------------------- */

export function BlocRecords({ trainings, unite }: { trainings: Training[]; unite: UnitePoids }) {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const liste = useMemo(() => recordsRecents(trainings, isoDe(new Date()), unite, 3), [trainings, unite]);
  if (!liste.length) return null;
  return (
    <CarteBloc sticker="trophee" teinte="creme" titre={traduire('Tes records récents')} sous={traduirePluriel(liste.length, liste.length > 1, 'ton dernier record', 'tes {0} derniers records', liste.length)} onPress={() => router.push('/records' as never)}>
      <View style={{ gap: 8 }}>
        {liste.map((r) => (
          <View key={r.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: c.fillSubtle, paddingVertical: 8, paddingHorizontal: 10 }}>
            <Image source={illus.img('medaille_or')} style={{ width: 28, height: 28 }} resizeMode="contain" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Ink size={13.5} weight="extraBold" numberOfLines={1}>{sansTiret(traduire(r.titre))}</Ink>
              <Ink size={12} weight="bold" color={c.textSecondary}>{dateCourte(r.date)}</Ink>
            </View>
            <Ink size={16} weight="black" tight style={{ fontVariant: ['tabular-nums'] }}>{r.valeur}</Ink>
          </View>
        ))}
      </View>
    </CarteBloc>
  );
}

/* ---------------------------------- Ton poids sur 7 jours ---------------------------------- */

const pourcent = (v: number) => `${String(v).replace('.', DECIMAL)} %`;

export function BlocPoids7({ series, brutes, unite }: { series: { date: string; value: number }[]; brutes: Weight[]; unite: UnitePoids }) {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const p = useMemo(() => poidsSemaine(series, brutes, isoDe(new Date())), [series, brutes]);
  if (!p) return null;
  const m = chargeParts(p.moyenne, unite, 1);
  const ecart = p.avant !== null ? Math.round((p.moyenne - p.avant) * 10) / 10 : null;
  const phrase = ecart === null
    ? traduirePluriel(p.pesees, p.pesees > 1, '{0} pesée ces 7 jours', '{0} pesées ces 7 jours', p.pesees)
    : ecart === 0
      ? traduire('comme la semaine d’avant')
      : ecart < 0
        ? traduire('{0} de moins que la semaine d’avant', chargeTexte(-ecart, unite, 1))
        : traduire('{0} de plus que la semaine d’avant', chargeTexte(ecart, unite, 1));
  const compo = p.composition;
  const lignes = compo ? ([
    compo.gras !== null ? { cle: 'gras', titre: traduire('Masse grasse'), v: compo.gras } : null,
    compo.muscle !== null ? { cle: 'muscle', titre: traduire('Muscle'), v: compo.muscle } : null,
    compo.eau !== null ? { cle: 'eau', titre: traduire('Eau'), v: compo.eau } : null,
  ].filter(Boolean) as { cle: string; titre: string; v: number }[]) : [];
  return (
    <CarteBloc sticker="balance" teinte="bleu" titre={traduire('Ton poids sur 7 jours')} sous={traduire('ta moyenne de la semaine')} onPress={() => router.push('/(tabs)/progres' as never)}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Ink size={34} weight="black" tight style={{ fontVariant: ['tabular-nums'] }}>{m.value}</Ink>
          <Ink size={15} weight="bold" color={c.textSecondary}>{m.unit}</Ink>
        </View>
        <Ink size={13} weight="bold" color={ecart !== null && ecart < 0 ? c.successText : c.textSecondary}>{phrase}</Ink>
      </View>
      {lignes.length ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {lignes.map((l) => (
            <View key={l.cle} style={{ flex: 1, borderRadius: 14, backgroundColor: c.fillSubtle, paddingVertical: 8, paddingHorizontal: 10, gap: 1 }}>
              <Ink size={11.5} weight="bold" color={c.textSecondary} numberOfLines={1}>{l.titre}</Ink>
              <Ink size={16} weight="black" tight>{pourcent(l.v)}</Ink>
            </View>
          ))}
        </View>
      ) : null}
      {compo ? <Ink size={11.5} weight="bold" color={c.textMuted}>{traduire('composition du {0}', dateCourte(compo.date))}</Ink> : null}
    </CarteBloc>
  );
}

/* ---------------------------------- Tes cartes à partager ---------------------------------- */

/** Le modèle de chaque sorte de carte, comme les rubriques de la bibliothèque (Bibliotheque.tsx, rubriquesDe) */
const MODELES: Partial<Record<'seance' | 'records' | 'semaine' | 'objectifs', { modele?: DirectionId; couleur?: CouleurId }>> = {
  records: { modele: 'chrome', couleur: 'noir' },
  semaine: { modele: 'serie' },
  objectifs: { modele: 'stickers', couleur: 'violet' },
};

export function BlocCartes() {
  const router = useRouter();
  const largeurEcran = useLargeurEcran();
  const k = useCarte(null);
  const [cartes, setCartes] = useState<{ d: CarteData; sorte: 'seance' | 'records' | 'semaine' | 'objectifs' }[] | null>(null);
  useEffect(() => {
    let vivant = true;
    chargerBibliotheque()
      .then((b) => {
        if (!vivant) return;
        const choix = [
          b.seances[0] ? { d: b.seances[0], sorte: 'seance' as const } : null,
          b.records[0] ? { d: b.records[0], sorte: 'records' as const } : null,
          b.semaines[0] ? { d: b.semaines[0], sorte: 'semaine' as const } : null,
          b.objectifs[0] ? { d: b.objectifs[0], sorte: 'objectifs' as const } : null,
        ].filter(Boolean) as { d: CarteData; sorte: 'seance' | 'records' | 'semaine' | 'objectifs' }[];
        setCartes(choix.slice(0, 3));
      })
      .catch(() => vivant && setCartes([]));
    return () => { vivant = false; };
  }, []);
  if (!cartes || !cartes.length) return null;
  const interieur = largeurEcran - 32 - 32;
  const l = Math.floor((interieur - 10 * 2) / 3);
  return (
    <CarteBloc sticker="partager" teinte="lilas" titre={traduire('Tes cartes à partager')} sous={traduire('Prêtes à poster, touche une carte pour l’ouvrir')} lien={traduire('Toutes')} onLien={() => router.push('/mes-cartes' as never)}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        {cartes.map(({ d, sorte }) => {
          const r = MODELES[sorte];
          const o: OptionsCarte = {
            ...k.options,
            modele: r?.modele ? directionEffective(d, r.modele) : directionEffective(d, k.options.modele),
            couleur: r?.couleur ?? k.options.couleur,
            format: 'story',
            fond: 'couleur',
            sortie: 'story',
            chiffres: d.moment === 'exploit' ? [] : chiffresParDefaut(d, k.options.masque, 4),
          };
          const dv = !d.famille && d.sport ? { ...d, famille: familleDe(getSportCategory(d.sport), d.sport) } : d;
          return <Vignette key={d.cle} d={dv} options={o} visuels={{ ...k.visuelsPour(d), ambiance: true }} largeur={l} onPress={() => router.push(lienEditeur(d) as never)} />;
        })}
      </View>
    </CarteBloc>
  );
}
