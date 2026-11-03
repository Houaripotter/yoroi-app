/**
 * « Ton mois », maquette A de l'onglet Séances (28 octobre 2026) : une pastille pastel par séance, une couleur par
 * sport (combat au sol lilas, musculation bleu, cardio menthe, frappe pêche, le reste crème), et la légende.
 * Fermée, la section garde le résumé du mois et la rangée des jours ; ouverte, le calendrier. Un appui sur le
 * calendrier ouvre le planning sur le mois, comme avant. La carte aux logos de clubs (MonthCard) reste sur l'accueil.
 * 3 novembre 2026 (Houari) : chaque sport du mois porte le logo de son club. Le logo que tu as ajouté à ton club
 * (Mes clubs, une photo de ton téléphone, table clubs, colonne logo_uri) s'affiche ; sans logo, le sticker du sport.
 * Jamais un logo de marque fourni par l'app (estLogoDeMarque), même en démo. On le voit dans la section fermée
 * (les sports du mois), sur chaque jour du calendrier et dans la légende. Les règles : lib/v2/seances/logosDuMois.ts.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Competition, Training } from '@/lib/database';
import { durationOf, formatDuration } from '@/lib/v2/trainingWeek';
import { MONTHS, PLAN_DAYS_SHORT, dateOf, firstSport, isoOf } from '@/lib/v2/seances/sessionData';
import { sportShortName } from '@/lib/v2/seance/sportVisuals';
import { estLogoDeMarque, groupByDay, monthCells, stickerDuSport } from './MonthMarks';
import { getClubLogoSource } from '@/lib/sports';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { P } from '@/components/yoroi/livePalette';
import { sportsDuJour, sportsDuMois } from '@/lib/v2/seances/logosDuMois';
import type { SportDuMois } from '@/lib/v2/seances/logosDuMois';
import { Icon } from './Icon';
import { tap } from './ui';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type FamillePastille = 'sol' | 'muscu' | 'cardio' | 'frappe' | 'autre';
const ORDRE: FamillePastille[] = ['sol', 'muscu', 'cardio', 'frappe', 'autre'];
const COULEURS: Record<FamillePastille, { clair: string; sombre: string }> = {
  sol: { clair: '#C9B3E6', sombre: '#B79AD9' },
  muscu: { clair: '#9FB3F7', sombre: '#8EA4F0' },
  cardio: { clair: '#8FD9B6', sombre: '#7CC9A5' },
  frappe: { clair: '#F4A38C', sombre: '#EC937B' },
  autre: { clair: '#F2CF8A', sombre: '#E0BC74' },
};
const NOMS_FAMILLE: Record<FamillePastille, string> = { sol: 'Combat au sol', muscu: 'Musculation', cardio: 'Cardio', frappe: 'Sports de frappe', autre: 'Autres sports' };

export function familleDuSport(sport?: string | null, dehors?: boolean | null): FamillePastille {
  const s = stickerDuSport(sport, dehors);
  if (s === 'jjb') return 'sol';
  if (s === 'gants') return 'frappe';
  if (s === 'musculation') return 'muscu';
  if (s === 'course' || s === 'sport_velo' || s === 'sport_nage') return 'cardio';
  return 'autre';
}

/** Un logo importé par toi ; jamais un logo de marque fourni par l'app */
const logoValable = (logo: string) => !estLogoDeMarque(logo);

/** La marque d'un sport : le logo de ton club s'il s'ouvre, sinon le sticker du sport */
export function MarqueSport({ sport, logo, dehors, taille }: { sport: string; logo: string | null; dehors?: boolean; taille: number }) {
  const { theme } = useYoroiTheme();
  const illus = useIllustrations();
  const [casse, setCasse] = useState(false);
  useEffect(() => setCasse(false), [logo]);
  const src = !casse && logo ? getClubLogoSource(logo) : null;
  if (src) {
    return (
      <View style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: P.white, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.divider }}>
        <Image source={src as never} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setCasse(true)} accessibilityIgnoresInvertColors />
      </View>
    );
  }
  return <Image source={illus.img(stickerDuSport(sport, dehors))} style={{ width: taille, height: taille }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

function useCouleur() {
  const { theme } = useYoroiTheme();
  return (f: FamillePastille) => COULEURS[f][theme.isDark ? 'sombre' : 'clair'];
}

/** Familles des séances d'un jour, sans doublon, dans l'ordre de la légende */
function famillesDuJour(list: Training[]): FamillePastille[] {
  const set = new Set(list.map((t) => familleDuSport(t.sport, !!t.is_outdoor)));
  return ORDRE.filter((f) => set.has(f));
}

export function useMois(trainings: Training[]) {
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const today = isoOf(now);
  return useMemo(() => {
    const inMonth = trainings.filter((t) => {
      const d = dateOf(t.date);
      return d.getFullYear() === y && d.getMonth() === mo;
    });
    const minutes = inMonth.reduce((s, t) => s + durationOf(t), 0);
    const days = new Set(inMonth.map((t) => t.date.slice(0, 10))).size;
    const nom = `${MONTHS[mo].charAt(0).toUpperCase()}${MONTHS[mo].slice(1)}`;
    const chiffres = inMonth.length
      ? [traduirePluriel(inMonth.length, inMonth.length > 1, '{0} séance', '{0} séances', inMonth.length), days !== inMonth.length ? traduire('{0} jours', days) : '', minutes ? formatDuration(minutes) : ''].filter(Boolean).join(', ')
      : traduire('Pas encore de séance');
    const byDay = groupByDay(inMonth);
    const sports: SportDuMois[] = sportsDuMois(trainings, y, mo, logoValable);
    const logos = new Map(sports.map((x) => [x.sport, x]));
    // la légende : chaque famille présente ce mois, avec le nom du sport s'il est seul dans sa famille
    const parFamille = new Map<FamillePastille, Set<string>>();
    inMonth.forEach((t) => {
      const f = familleDuSport(t.sport, !!t.is_outdoor);
      if (!parFamille.has(f)) parFamille.set(f, new Set());
      parFamille.get(f)!.add(firstSport(t.sport));
    });
    const legende = ORDRE.filter((f) => parFamille.has(f)).map((f) => {
      const sports = [...parFamille.get(f)!];
      return { f, nom: sports.length === 1 ? sportShortName(sports[0]) : traduire(NOMS_FAMILLE[f]) };
    });
    return { y, mo, today, nom, resume: traduire('{0} : {1}', nom, chiffres), byDay, legende, nombre: inMonth.length, sports, logos };
  }, [trainings, y, mo, today]);
}

/** La rangée des jours du mois jusqu'à aujourd'hui, une pastille par jour (le résumé de la section fermée) */
export function RangeeDuMois({ trainings }: { trainings: Training[] }) {
  const { theme } = useYoroiTheme();
  const couleur = useCouleur();
  const m = useMois(trainings);
  const n = Number(m.today.slice(8, 10));
  return (
    <View style={{ gap: 6 }}>
    {m.sports.length ? <SportsDuMois sports={m.sports} /> : null}
    <View style={{ marginTop: m.sports.length ? 0 : 6, flexDirection: 'row', flexWrap: 'wrap', gap: 3 }} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: n }, (_, i) => {
        const iso = `${m.today.slice(0, 8)}${String(i + 1).padStart(2, '0')}`;
        const f = famillesDuJour(m.byDay.get(iso) ?? [])[0];
        return <View key={iso} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: f ? couleur(f) : theme.isDark ? '#2B3142' : '#ECEEF5' }} />;
      })}
    </View>
    </View>
  );
}

/** Les sports du mois : le logo de ton club (ou le sticker du sport), son nom et son nombre de séances */
function SportsDuMois({ sports }: { sports: SportDuMois[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 6 }}>
      {sports.map((x) => (
        <View
          key={x.sport}
          accessible
          accessibilityLabel={`${sansTiret(sportShortName(x.sport))}, ${traduirePluriel(x.nombre, x.nombre > 1, '{0} séance', '{0} séances', x.nombre)}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <MarqueSport sport={x.sport} logo={x.logo} dehors={x.dehors} taille={22} />
          <Ink size={12} weight="extraBold" color={c.ink}>{sansTiret(sportShortName(x.sport))}</Ink>
          <Ink size={12} weight="bold" color={c.textSecondary}>{String(x.nombre)}</Ink>
        </View>
      ))}
    </View>
  );
}

export function MoisPastilles({ trainings, competitions, onOpen }: { trainings: Training[]; competitions: Competition[]; onOpen: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const m = useMois(trainings);
  const cells = useMemo(() => monthCells(m.y, m.mo), [m.y, m.mo]);
  const compDays = useMemo(() => new Set(competitions.map((cp) => (cp.date ?? '').slice(0, 10))), [competitions]);
  return (
    <View style={{ gap: 10 }}>
      <Pressable onPress={() => { tap(); onOpen(); }} accessibilityRole="button" accessibilityLabel={traduire('Ton mois, {0}. Ouvrir le calendrier', m.resume)}>
        <View style={{ flexDirection: 'row' }}>
          {PLAN_DAYS_SHORT.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: 4 }}>
              <Ink size={11} weight="extraBold" color={c.textMuted}>{d}</Ink>
            </View>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {cells.slice(r * 7, r * 7 + 7).map((iso, k) => {
              if (!iso) return <View key={k} style={{ flex: 1, height: 46 }} />;
              // les sports qui ont le logo de ton club d'abord, pour qu'il se voie
              const duJour = sportsDuJour(m.byDay.get(iso) ?? []).sort((x, y) => Number(!!m.logos.get(y)?.logo) - Number(!!m.logos.get(x)?.logo));
              const auj = iso === m.today;
              const futur = iso > m.today;
              const comp = compDays.has(iso);
              return (
                <View key={k} style={{ flex: 1, height: 46, alignItems: 'center', gap: 2 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: auj ? c.primary : 'transparent', borderWidth: comp && !auj ? 1.5 : 0, borderColor: c.gold }}>
                    <Ink size={12.5} weight="extraBold" color={auj ? c.onPrimary : futur ? c.textMuted : c.ink}>{String(dateOf(iso).getDate())}</Ink>
                  </View>
                  {/* le logo du club de chaque sport du jour, sinon son sticker ; trois au plus */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', height: 16 }}>
                    {duJour.slice(0, 3).map((sp, i) => (
                      <View key={sp} style={{ marginLeft: i === 0 ? 0 : -5, zIndex: 3 - i }}>
                        <MarqueSport sport={sp} logo={m.logos.get(sp)?.logo ?? null} dehors={m.logos.get(sp)?.dehors} taille={16} />
                      </View>
                    ))}
                    {duJour.length > 3 ? <Ink size={9} weight="black" color={c.textSecondary} style={{ marginLeft: 1 }}>{`+${duJour.length - 3}`}</Ink> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </Pressable>
      {m.sports.length ? <SportsDuMois sports={m.sports} /> : null}
      <Pressable onPress={() => { tap(); onOpen(); }} accessibilityRole="link" hitSlop={6} style={{ alignSelf: 'flex-start', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ink size={13} weight="extraBold" color={c.accentText}>{traduire('Ouvrir le calendrier')}</Ink>
        <Icon name="chevron" size={15} color={c.accentText} />
      </Pressable>
    </View>
  );
}
