/**
 * Calendrier du mois (vague 26) : le retour des logos de club de l'ancien Planning.
 * - SessionMark : la pastille d'une seance, logo du club, sinon ses initiales dans sa couleur,
 *   sinon l'icone du sport dans la couleur de sa famille.
 * - DayMarks : les pastilles d'un jour (deux au plus, puis « +n »).
 * - MonthCard : la carte « Ton mois » de l'onglet Seances, toujours visible, un appui ouvre le planning.
 */
import React, { useMemo } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Competition, Training } from '@/lib/database';
import { getClubLogoSource } from '@/lib/sports';
import { durationOf, formatDuration } from '@/lib/v2/trainingWeek';
import { MONTHS, PLAN_DAYS_SHORT, dateOf, familyInk, familyOf, isoOf } from '@/lib/v2/seances/sessionData';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { tap } from './ui';
import { P } from '@/components/yoroi/livePalette';
import { STICKERS, useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { useScreenshotMode } from '@/lib/ScreenshotModeContext';
import { LOGO_FIRST_JJA } from '@/lib/v2/demo/logoFirstJJA';
import { useModeDemo } from '@/lib/v2/demo/useModeDemo';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const SMALL_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'club', 'team', 'the']);

/** Initiales d'un club : « Gracie Barra Marseille » donne « GB », « Basic Fit » donne « BF » */
export function clubInitials(name?: string | null): string {
  const words = (name ?? '').split(/[^A-Za-z0-9\u00C0-\u024F]+/).filter(Boolean);
  const strong = words.filter((w) => !SMALL_WORDS.has(w.toLowerCase()));
  const pick = (strong.length ? strong : words).slice(0, 2);
  if (pick.length === 1) return pick[0].slice(0, 2).toUpperCase();
  return pick.map((w) => w[0]).join('').toUpperCase() || '?';
}

function sportIcon(sport?: string): IconName {
  const f = familyOf(sport);
  if (f === 'combat_sol') return 'belt';
  if (f === 'combat_pied') return 'glove';
  if (f === 'cardio') return 'steps';
  if (f === 'muscu') return 'dumbbell';
  return 'bolt';
}

/**
 * 27 octobre 2026 soir (Houari : « les vrais logos de clubs, pas JJ ou BF dans des ronds ») : les logos de club deja
 * dans l'app (assets/images, assets/clubs), retrouves par le nom du club quand la seance n'a pas de logo enregistre.
 * Affichage seulement, rien n'est ecrit. En mode capture (captures du store), pas de logo de marque.
 */
const LOGOS_PAR_NOM: { re: RegExp; src: () => unknown }[] = [
  { re: /basic[\s-]*fit/i, src: () => getClubLogoSource('basic-fit') },
  { re: /gracie[\s-]*barra/i, src: () => getClubLogoSource('gracie-barra') },
  { re: /first\s*jiu/i, src: () => getClubLogoSource(LOGO_FIRST_JJA) },
  // 27 octobre 2026 nuit (Houari) : le club generique de la demo Heny (CLUB_JJB_DEMO) porte le logo fourni
  { re: /^club de jjb$/i, src: () => getClubLogoSource(LOGO_FIRST_JJA) },
];

/**
 * 27 octobre 2026 : les trois logos de marques integres a l'app (Basic Fit, Gracie Barra, First Jiu-Jitsu Academy).
 * Ils ne s'affichent qu'en mode demo (Heny) ; chez un vrai utilisateur, seulement le logo qu'il a ajoute lui-meme
 * a son club (une photo de son telephone), sinon le sticker du sport.
 * 27 octobre 2026 soir (Houari : « j'ai ajouté le logo de mon club et je ne le vois plus ») : la regle est faite
 * ainsi. Le logo IMPORTE par l'utilisateur (un fichier de son telephone, jamais une de ces trois cles) s'affiche
 * TOUJOURS, demo ou pas. Seuls les logos FOURNIS par l'app restent reserves a la demo. Si le fichier importe ne
 * s'ouvre plus, la pastille retombe sur le sticker du sport au lieu d'un rond blanc vide (SessionMark, onError),
 * et getClubLogoSource recale son chemin sur le dossier de l'app (lib/v2/clubs/cheminLogo.ts).
 */
export const LOGOS_DE_MARQUE: readonly string[] = ['basic-fit', 'gracie-barra', LOGO_FIRST_JJA];

export function estLogoDeMarque(logo?: string | null): boolean {
  return !!logo && LOGOS_DE_MARQUE.includes(logo);
}

/** Le logo a montrer pour une seance : celui de son club, ou celui retrouve par son nom, selon le mode demo */
export function logoAffiche(o: { clubLogo?: string | null; clubNom?: string | null; demo: boolean; parNom: boolean }): unknown {
  const propre = o.clubLogo && (o.demo || !estLogoDeMarque(o.clubLogo)) ? getClubLogoSource(o.clubLogo) : null;
  if (propre) return propre;
  return o.demo && o.parNom ? logoParNom(o.clubNom) : null;
}

export function logoParNom(nom?: string | null): unknown {
  if (!nom) return null;
  const l = LOGOS_PAR_NOM.find((x) => x.re.test(nom));
  return l ? l.src() : null;
}

/** Le sticker du sport d'une seance (repli quand le club n'a pas de logo) */
export function stickerDuSport(sport?: string | null, dehors?: boolean | null): NomSticker {
  const id = String(sport ?? '').split(',')[0].trim().toLowerCase();
  if (/jjb|bjj|jiu|grappling|judo|lutte|wrestling|sambo|luta/.test(id)) return 'jjb';
  if (/boxe|box|mma|kick|muay|karate|taekwondo|savate|striking/.test(id)) return 'gants';
  if (/muscu|fitness|crossfit|halt|force|powerlifting|street/.test(id)) return 'musculation';
  if (/run|course|trail|jogging|marche/.test(id)) return 'course';
  if (/foot|soccer|futsal/.test(id)) return 'sport_football';
  if (/velo|cycl|bike/.test(id)) return 'sport_velo';
  if (/nata|swim|nage/.test(id)) return 'sport_nage';
  if (dehors) return 'montagne_drapeau';
  const f = familyOf(sport ?? undefined);
  if (f === 'combat_sol') return 'jjb';
  if (f === 'combat_pied') return 'gants';
  if (f === 'cardio') return 'course';
  if (f === 'muscu') return 'musculation';
  return 'activite';
}

/**
 * Pastille ronde d'une seance. sticker (Ton mois et le calendrier, reglage Stickers) : le logo du club s'il existe
 * (enregistre, ou retrouve par son nom), sinon le sticker de son sport, a la place des initiales.
 */
export function SessionMark({ t, size = 18, ring, sticker }: { t: Training; size?: number; ring?: string; sticker?: boolean }) {
  const illus = useIllustrations();
  const { isScreenshotMode } = useScreenshotMode();
  const demo = useModeDemo();
  const enSticker = !!sticker && illus.stickers;
  // 27 octobre 2026 : les logos de marques seulement en mode demo, ton propre logo de club toujours
  const src0 = logoAffiche({ clubLogo: t.club_logo, clubNom: t.club_name, demo, parNom: enSticker && !isScreenshotMode });
  // un logo qui ne s'ouvre plus : le sticker du sport (ou les initiales), jamais un rond blanc vide
  const [casse, setCasse] = React.useState(false);
  React.useEffect(() => setCasse(false), [t.club_logo]);
  const src = casse ? null : src0;
  const border = ring ? { borderWidth: Math.max(1.5, size * 0.08), borderColor: ring } : null;
  if (!src && enSticker) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={STICKERS[stickerDuSport(t.sport, !!t.is_outdoor)]} style={{ width: size * 1.08, height: size * 1.08 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    );
  }
  if (src) {
    return (
      <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: P.white, overflow: 'hidden' }, border]}>
        <Image source={src as never} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setCasse(true)} />
      </View>
    );
  }
  if (t.club_id || t.club_name) {
    const ini = clubInitials(t.club_name);
    return (
      <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.club_color || familyInk(t.sport), alignItems: 'center', justifyContent: 'center' }, border]}>
        <Ink size={Math.max(7, size * (ini.length > 1 ? 0.4 : 0.5))} weight="black" color="#FFFFFF" style={{ letterSpacing: -0.3 }}>{ini}</Ink>
      </View>
    );
  }
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: familyInk(t.sport), alignItems: 'center', justifyContent: 'center' }, border]}>
      <Icon name={t.is_outdoor ? 'mountain' : sportIcon(t.sport)} size={size * 0.6} color="#FFFFFF" strokeWidth={2.6} />
    </View>
  );
}

/** Les pastilles d'un jour : deux au plus qui se chevauchent, puis « +n » */
export function DayMarks({ list, size = 18, ring, sticker }: { list: Training[]; size?: number; ring: string; sticker?: boolean }) {
  const { theme } = useYoroiTheme();
  if (!list.length) return null;
  const shown = list.slice(0, 2);
  const more = list.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((t, i) => (
        <View key={t.id ?? i} style={{ marginLeft: i === 0 ? 0 : -size * 0.32, zIndex: 2 - i }}>
          <SessionMark t={t} size={size} ring={ring} sticker={sticker} />
        </View>
      ))}
      {more > 0 ? <Ink size={Math.max(9, size * 0.55)} weight="black" color={theme.colors.textSecondary} style={{ marginLeft: 1 }}>{`+${more}`}</Ink> : null}
    </View>
  );
}

/** Cases du mois (lundi en premier), null pour les cases vides */
export function monthCells(y: number, mo: number): (string | null)[] {
  const first = new Date(y, mo, 1, 12);
  const lead = (first.getDay() + 6) % 7;
  const nDays = new Date(y, mo + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= nDays; d++) cells.push(isoOf(new Date(y, mo, d, 12)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function groupByDay(trainings: Training[]): Map<string, Training[]> {
  const m = new Map<string, Training[]>();
  trainings.forEach((t) => {
    const k = (t.date ?? '').slice(0, 10);
    if (!k) return;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(t);
  });
  m.forEach((l) => l.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')));
  return m;
}

/** Carte « Ton mois » : mini calendrier du mois en cours, un appui ouvre le planning complet */
export function MonthCard({ trainings, competitions, onOpen }: { trainings: Training[]; competitions: Competition[]; onOpen: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const today = isoOf(now);
  const cells = useMemo(() => monthCells(y, mo), [y, mo]);
  const byDay = useMemo(() => groupByDay(trainings), [trainings]);
  const compDays = useMemo(() => new Set(competitions.map((cp) => (cp.date ?? '').slice(0, 10))), [competitions]);
  const inMonth = trainings.filter((t) => {
    const d = dateOf(t.date);
    return d.getFullYear() === y && d.getMonth() === mo;
  });
  const minutes = inMonth.reduce((s, t) => s + durationOf(t), 0);
  const days = new Set(inMonth.map((t) => t.date.slice(0, 10))).size;
  const monthLabel = `${MONTHS[mo].charAt(0).toUpperCase()}${MONTHS[mo].slice(1)}`;
  const summary = inMonth.length
    ? [traduirePluriel(inMonth.length, inMonth.length > 1, "{0} séance", "{0} séances", inMonth.length), days !== inMonth.length ? traduire("{0} jours", days) : '', minutes ? formatDuration(minutes) : ''].filter(Boolean).join(', ')
    : traduire('Pas encore de séance');

  return (
    <Pressable
      onPress={() => { tap(); onOpen(); }}
      accessibilityRole="button"
      accessibilityLabel={traduire("Ton mois, {0}, {1}. Ouvrir le calendrier", monthLabel, summary)}
      style={({ pressed }) => ({ borderRadius: 22, backgroundColor: pressed ? P.white : P.carte, borderWidth: 1, borderColor: c.divider, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={17} weight="black" tight>{monthLabel}</Ink>
          <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>{summary}</Ink>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }}>
          <Ink size={13} weight="extraBold" color={c.accent}>{traduire("Calendrier")}</Ink>
          <Icon name="chevron" size={15} color={c.accent} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        {PLAN_DAYS_SHORT.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: 4 }}>
            <Ink size={11} weight="bold" color={c.textMuted}>{d}</Ink>
          </View>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {cells.slice(r * 7, r * 7 + 7).map((iso, k) => {
            if (!iso) return <View key={k} style={{ flex: 1, height: 44 }} />;
            const list = byDay.get(iso) ?? [];
            const isToday = iso === today;
            const comp = compDays.has(iso);
            const future = iso > today;
            return (
              <View key={k} style={{ flex: 1, height: 44, alignItems: 'center', paddingTop: 2, gap: 2 }}>
                <View style={{ minWidth: 22, height: 20, paddingHorizontal: 3, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? c.primary : 'transparent', borderWidth: comp && !isToday ? 1.5 : 0, borderColor: c.gold }}>
                  <Ink size={12} weight={isToday || list.length ? 'black' : 'bold'} color={isToday ? c.onPrimary : future ? c.textMuted : list.length ? c.ink : c.textSecondary}>{String(dateOf(iso).getDate())}</Ink>
                </View>
                <DayMarks list={list} size={16} ring="#FFFFFF" />
              </View>
            );
          })}
        </View>
      ))}
    </Pressable>
  );
}
