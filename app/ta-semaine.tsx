/**
 * « Ta semaine », en grand (3 novembre 2026, Houari). S'ouvre depuis la carte « Cette semaine » de l'onglet Séances,
 * ou depuis un jour de sa petite rangée (centré sur ce jour) :
 *  - les 7 jours en grand : les séances faites (sport, nom, heure, durée, kilos soulevés ou distance), les jours de
 *    repos, les jours à venir avec ce qui est prévu (programme en cours, créneaux du planning) ;
 *  - l'objectif de la semaine et où tu en es ;
 *  - les chiffres de la semaine (durée, kilos soulevés, charge, jours entraînés) comparés à la semaine passée,
 *    les mêmes tuiles que « Tes chiffres de la semaine » (WeekTiles) ;
 *  - les flèches semaine précédente et semaine suivante ;
 *  - un appui sur une séance ouvre son détail, un appui sur une séance prévue du programme ouvre ce jour du programme.
 * Paramètres : semaine (son lundi, « 2026-11-02 ») et jour (« 2026-11-04 »), gardés pour rouvrir la dernière page.
 * Les règles : lib/v2/seances/taSemaine.ts. Uniquement les vraies données de l'app.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { format } from 'date-fns';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Colonne, LargeurPage, Rangee } from '@/components/yoroi/v2/PageLarge';
import { CarreSticker, Pastille, Petites, useCarteA, useTeinte } from '@/components/yoroi/v2/seances/kitA';
import type { TeinteA } from '@/components/yoroi/v2/seances/kitA';
import { stickerDuSport } from '@/components/yoroi/v2/seances/MonthMarks';
import { TamponValide } from '@/components/yoroi/v2/seances/TamponValide';
import { WeekTiles } from '@/components/yoroi/v2/seances/WeekHero';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { Hanko, tap } from '@/components/yoroi/v2/seances/ui';
import { useProchaines, vueDuJour } from '@/app/programmes/prochaines';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import type { Training } from '@/lib/database';
import { DATE_FNS_LOCALE } from '@/lib/i18n/dateLocale';
import { usePageLarge } from '@/lib/v2/nav/useGrandEcran';
import { useSeancesData } from '@/lib/v2/seances/useSeancesData';
import { dateOf, familyOf, sessionTitle } from '@/lib/v2/seances/sessionData';
import { chiffreCle, heureDe } from '@/lib/v2/seances/historique';
import {
  bornesSemaines, chiffresSemaine, dansLesBornes, decalageDe, decalerSemaine, jourCentre, joursDeLaSemaine, objectifSemaine, periodeSemaine, titreSemaine,
} from '@/lib/v2/seances/taSemaine';
import type { JourSemaine, PrevuJour } from '@/lib/v2/seances/taSemaine';
import { joursPrevus } from '@/lib/v2/programmes/prochainesSeances';
import { durationOf, formatDuration, mondayOf } from '@/lib/v2/trainingWeek';
import { todayISO } from '@/lib/v2/weightStats';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { LANG, traduire, traduirePluriel } from '@/lib/i18n/tr';
import { ltrSiRTL, miroirSiRTL } from '@/lib/v2/rtl';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function teinteDe(sport: string | undefined): TeinteA {
  const f = familyOf(sport);
  if (f === 'muscu') return 'bleu';
  if (f === 'combat_sol') return 'lilas';
  if (f === 'combat_pied') return 'peche';
  if (f === 'cardio') return 'menthe';
  return 'creme';
}

/** L'anneau de l'objectif (même dessin que la carte « Cette semaine ») */
function Anneau({ fait, total, taille = 84 }: { fait: number; total: number; taille?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const bleu = useTeinte('bleu');
  const r = taille / 2 - 7;
  const tour = 2 * Math.PI * r;
  const part = total > 0 ? Math.min(1, fait / total) : 0;
  return (
    <View style={{ width: taille, height: taille }} accessible accessibilityLabel={traduire('{0} sur {1}', fait, total)}>
      <Svg width={taille} height={taille}>
        <Circle cx={taille / 2} cy={taille / 2} r={r} stroke={bleu.fond} strokeWidth={10} fill="none" />
        {part > 0 ? (
          <Circle cx={taille / 2} cy={taille / 2} r={r} stroke={theme.isDark ? '#9DB1FF' : '#4256C9'} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${tour * part} ${tour}`} transform={`rotate(-90 ${taille / 2} ${taille / 2})`} />
        ) : null}
      </Svg>
      <View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }, ltrSiRTL]}>
        <Ink size={Math.round(taille * 0.3)} weight="black" tight>{String(fait)}</Ink>
        <Ink size={Math.round(taille * 0.17)} weight="extraBold" color={c.textSecondary}>{`/${total}`}</Ink>
      </View>
    </View>
  );
}

/** Une flèche ronde de la navigation */
function Fleche({ sens, actif, onPress, label }: { sens: 'avant' | 'apres'; actif: boolean; onPress: () => void; label: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => { if (actif) { tap(); onPress(); } }}
      disabled={!actif}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !actif }}
      hitSlop={6}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.surface, opacity: actif ? 1 : 0.35 })}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={miroirSiRTL}>
        <Path d={sens === 'avant' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/** Une séance faite, dans son jour */
function LigneFaite({ t, unite, record, onPress }: { t: Training; unite: UnitePoids; record: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const titre = sansTiret(sessionTitle(t));
  const heure = heureDe(t, LANG);
  const min = durationOf(t);
  const details = [heure ? traduire('à {0}', heure) : '', min > 0 ? formatDuration(min) : ''].filter(Boolean).join(', ');
  const cle = chiffreCle(t, unite);
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      disabled={!t.id}
      accessibilityRole="button"
      accessibilityLabel={sansTiret([titre, details, cle].filter(Boolean).join(', '))}
      accessibilityHint={traduire('Ouvre le détail de la séance')}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: pressed ? c.fillSoft : theme.isDark ? 'rgba(255,255,255,0.04)' : c.background })}
    >
      <CarreSticker nom={stickerDuSport(t.sport, !!t.is_outdoor)} teinte={teinteDe(t.sport)} taille={42} rayon={13} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ink size={14.5} weight="extraBold" numberOfLines={2} style={{ flexShrink: 1 }}>{titre}</Ink>
          {record ? <Hanko size={16} /> : null}
        </View>
        {details ? <Ink size={12.5} weight="bold" color={c.textSecondary}>{details}</Ink> : null}
      </View>
      {cle ? <Ink size={14.5} weight="black" tight numberOfLines={1} style={{ maxWidth: '36%' }} adjustsFontSizeToFit minimumFontScale={0.75}>{cle}</Ink> : null}
      <Icon name="chevron" size={15} color={c.textMuted} />
    </Pressable>
  );
}

/** Ce qui est prévu un jour à venir */
function LignePrevue({ p, onPress }: { p: PrevuJour; onPress?: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const details = [p.heure ? traduire('à {0}', LANG === 'fr' ? p.heure.replace(':', ' h ') : p.heure) : '', p.minutes ? traduire('environ {0}', formatDuration(p.minutes)) : ''].filter(Boolean).join(', ');
  const corps = (
    <>
      <View style={{ opacity: 0.85 }}>
        <CarreSticker nom={p.programme ? 'carnet' : stickerDuSport(p.sport ?? 'musculation')} teinte={p.programme ? 'bleu' : teinteDe(p.sport)} taille={42} rayon={13} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Ink size={14.5} weight="extraBold" numberOfLines={2}>{sansTiret(p.titre)}</Ink>
        <Ink size={12.5} weight="bold" color={c.textSecondary}>{sansTiret([p.programme ? traduire('Prévu au programme') : traduire('Prévu'), details].filter(Boolean).join(', '))}</Ink>
      </View>
      {onPress ? <Icon name="chevron" size={15} color={c.textMuted} /> : null}
    </>
  );
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 60, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 2, borderStyle: 'dashed' as const, borderColor: theme.isDark ? '#4A5578' : '#B9C3E4' };
  if (!onPress) return <View style={style}>{corps}</View>;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={sansTiret(`${p.titre}, ${traduire('prévu')}${details ? `, ${details}` : ''}`)} style={({ pressed }) => [style, { opacity: pressed ? 0.75 : 1 }]}>
      {corps}
    </Pressable>
  );
}

/** Un jour de la semaine, en grand */
function CarteJour({ j, centre, unite, stamped, onSeance, onPrevu }: {
  j: JourSemaine;
  centre: boolean;
  unite: UnitePoids;
  stamped: Map<number, number>;
  onSeance: (t: Training) => void;
  onPrevu?: (p: PrevuJour, iso: string) => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const bleu = useTeinte('bleu');
  const menthe = useTeinte('menthe');
  const indigo = theme.isDark ? '#9DB1FF' : '#4256C9';
  const nom = format(dateOf(j.iso), 'EEEE d MMMM', { locale: DATE_FNS_LOCALE });
  const titre = nom.charAt(0).toLocaleUpperCase() + nom.slice(1);
  const n = j.seances.length;
  return (
    <View style={[carte, { padding: 14, gap: 10, borderWidth: j.aujourdhui || centre ? 2.5 : 0, borderColor: j.aujourdhui ? indigo : bleu.texte }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Ink size={17} weight="black" tight accessibilityRole="header">{titre}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {j.aujourdhui ? <Pastille texte={traduire('Aujourd’hui')} fond={bleu.fond} couleur={bleu.texte} /> : null}
            {j.etat === 'fait' ? <Pastille texte={traduirePluriel(n, n > 1, '{0} séance', '{0} séances', n)} fond={menthe.fond} couleur={menthe.texte} /> : null}
            {j.etat === 'prevu' ? <Pastille texte={traduire('Prévu')} fond={c.fillSoft} couleur={c.ink} /> : null}
          </View>
        </View>
        {j.etat === 'fait' ? <TamponValide taille={40} /> : null}
        {j.etat === 'repos' ? <CarreSticker nom="sommeil" teinte="lilas" taille={40} rayon={12} /> : null}
      </View>
      {j.etat === 'fait'
        ? j.seances.map((t, k) => <LigneFaite key={t.id ?? `${t.date}${k}`} t={t} unite={unite} record={!!t.id && (stamped.get(t.id) ?? 0) > 0} onPress={() => onSeance(t)} />)
        : null}
      {j.etat === 'prevu'
        ? j.prevus.map((p, k) => <LignePrevue key={`${p.titre}${k}`} p={p} onPress={p.programme && onPrevu ? () => onPrevu(p, j.iso) : undefined} />)
        : null}
      {j.etat === 'repos' ? (
        <Ink size={13} weight="bold" color={c.textSecondary}>{j.passe ? traduire('Repos, aucune séance ce jour là.') : traduire('Repos, rien de prévu.')}</Ink>
      ) : null}
    </View>
  );
}

export default function TaSemaine() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const page = usePageLarge(false);
  const unite = useUnitePoids();
  const params = useLocalSearchParams<{ semaine?: string; jour?: string }>();
  const today = todayISO();
  const { trainings, plan, weeklyGoal, typeDays, records } = useSeancesData();
  const { d } = useProchaines({ completer: false });
  const carteA = useCarteA();
  const menthe = useTeinte('menthe');

  const jourDemande = typeof params.jour === 'string' && ISO.test(params.jour) ? params.jour : null;
  const depart = typeof params.semaine === 'string' && ISO.test(params.semaine) ? params.semaine : jourDemande ?? today;
  const [lundi, setLundi] = useState(() => mondayOf(depart));
  const bornes = useMemo(() => bornesSemaines(trainings, today), [trainings, today]);
  const vu = dansLesBornes(lundi, bornes);
  const k = decalageDe(vu, today);

  // les séances du programme en cours pour cette semaine (aujourd'hui et après seulement)
  const programme = useMemo(() => {
    if (!d || k < 0) return undefined;
    const out: Record<string, PrevuJour> = {};
    try {
      for (const jp of joursPrevus(d.actif, d.p, 1, new Date(), d.trainings, k)) {
        if (!jp.jour || jp.statut === 'faite' || jp.date < today) continue;
        const v = vueDuJour(d, jp);
        out[jp.date] = { titre: v.nom, minutes: v.minutes || undefined, sport: v.muscu ? 'musculation' : jp.jour.cardio?.sport, programme: true };
      }
    } catch {
      return undefined;
    }
    return out;
  }, [d, k, today]);

  const jours = useMemo(() => joursDeLaSemaine({ trainings, lundi: vu, aujourdhui: today, plan, programme, typeDays }), [trainings, vu, today, plan, programme, typeDays]);
  const chiffres = useMemo(() => chiffresSemaine(trainings, vu, today), [trainings, vu, today]);
  const etat = k < 0 ? 'passee' : k > 0 ? 'a_venir' : 'en_cours';
  const objectif = objectifSemaine(chiffres.current.sessions, chiffres.current.days, weeklyGoal, etat);
  const centre = jourCentre(jours, jourDemande);

  // à l'ouverture, le jour demandé est amené à l'écran
  const defile = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const baseJours = useRef<number | null>(null);
  const amene = useRef<string | null>(null);
  const amener = () => {
    // en grand écran, les jours sont dans leur colonne, déjà à l'écran
    if (page.grand || !jourDemande || amene.current === jourDemande || baseJours.current === null) return;
    const y = positions.current[jourDemande] === undefined ? undefined : baseJours.current + positions.current[jourDemande];
    if (y === undefined) return;
    amene.current = jourDemande;
    defile.current?.scrollTo({ y: Math.max(0, y - 12), animated: false });
  };
  useEffect(() => { amene.current = null; }, [jourDemande]);

  const changer = (pas: number) => {
    const l = dansLesBornes(decalerSemaine(vu, pas), bornes);
    setLundi(l);
    router.setParams({ semaine: l, jour: '' } as never);
    defile.current?.scrollTo({ y: 0, animated: false });
  };
  const ouvrirSeance = (t: Training) => {
    if (t.id) router.push({ pathname: '/workout-detail', params: { id: String(t.id) } } as never);
  };
  const ouvrirPrevu = d ? (_p: PrevuJour, iso: string) => router.push({ pathname: '/programmes/[id]', params: { id: d.p.id, jour: iso } } as never) : undefined;

  const navigation = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Fleche sens="avant" actif={vu > bornes.min} onPress={() => changer(-1)} label={traduire('Semaine précédente')} />
      <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
        <Ink size={18} weight="black" tight numberOfLines={1}>{titreSemaine(vu, today)}</Ink>
        <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={1}>{periodeSemaine(vu)}</Ink>
      </View>
      <Fleche sens="apres" actif={vu < bornes.max} onPress={() => changer(1)} label={traduire('Semaine suivante')} />
    </View>
  );

  const carteObjectif = (
    <View style={[carteA, { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
      <Anneau fait={objectif.fait} total={objectif.total} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Petites texte={weeklyGoal > 0 ? traduire('Ton objectif') : traduire('Jours entraînés')} teinte="bleu" />
        <Ink size={20} weight="black" tight>
          {weeklyGoal > 0
            ? traduire('{0} sur {1}', traduirePluriel(objectif.fait, objectif.fait > 1, '{0} séance', '{0} séances', objectif.fait), objectif.total)
            : traduire('{0} sur 7', objectif.fait)}
        </Ink>
        <Ink size={13} weight="extraBold" color={objectif.tenu ? menthe.texte : c.textSecondary}>{objectif.phrase}</Ink>
      </View>
    </View>
  );

  const lesChiffres = k <= 0 ? (
    <View style={{ gap: 10 }}>
      <Petites texte={traduire('Les chiffres de la semaine')} teinte="creme" style={{ marginTop: 6 }} />
      <WeekTiles week={chiffres} onOpenCharge={() => router.push('/charge' as never)} />
    </View>
  ) : null;

  const lesJours = (
    <View style={{ gap: 10 }} onLayout={(e) => { baseJours.current = e.nativeEvent.layout.y; amener(); }}>
      {jours.map((j, i) => (
        <View
          key={j.iso}
          onLayout={(e) => { positions.current[j.iso] = e.nativeEvent.layout.y; if (j.iso === jourDemande) amener(); }}
        >
          <CarteJour j={j} centre={!!jourDemande && i === centre} unite={unite} stamped={records.stampedTrainings} onSeance={ouvrirSeance} onPrevu={ouvrirPrevu} />
        </View>
      ))}
    </View>
  );

  const largeurGauche = page.grand ? Math.min(420, Math.floor(page.largeur * 0.42)) : page.largeur;
  const largeurDroite = page.grand ? page.largeur - largeurGauche - 24 : page.largeur;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <LargeurPage actif={page.grand} largeur={page.largeur}>
        <ScrollView ref={defile} contentContainerStyle={{ paddingHorizontal: page.grand ? page.marge : 16, paddingBottom: insets.bottom + 40, gap: 14 }} showsVerticalScrollIndicator={false}>
          {/* 3 novembre 2026 (Houari) : la période une seule fois, sous le nom de la semaine, à côté des flèches */}
          <EnTete titre={traduire('Ta semaine')} onRetour={() => router.back()} repli="/(tabs)/seances" zoneSure="insets" style={{ marginHorizontal: -16 }} />
          {navigation}
          {page.grand ? (
            <Rangee actif espace={24}>
              <Colonne actif largeur={largeurGauche}>
                {carteObjectif}
                {lesChiffres}
              </Colonne>
              <Colonne actif largeur={largeurDroite}>{lesJours}</Colonne>
            </Rangee>
          ) : (
            <>
              {carteObjectif}
              {lesJours}
              {lesChiffres}
            </>
          )}
        </ScrollView>
      </LargeurPage>
    </View>
  );
}
