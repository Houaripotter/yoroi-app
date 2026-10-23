/**
 * Carte « Ma séance » (refonte v2, l'armure vivante).
 * Sport en grand, illustration du sport ou guerrier du rang, duree, details (series, cardio,
 * rounds de combat), objectif de l'annee en pastilles, pied YOROI.
 * Les props restent celles de l'ancienne carte : tous les ecrans qui l'utilisent continuent de marcher.
 */
import React, { useMemo } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Training } from '@/lib/database';
import { accordSouleve, formatTonnage, tonnage as trainingTonnage } from '@/lib/v2/trainingWeek';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { chargeTexte, type UnitePoids } from '@/lib/v2/unitePoids';
import { getClubLogoSource, getSessionTypeLabel, getSportName } from '@/lib/sports';
import { useCardIdentity } from '@/lib/v2/partage/identity';
import {
  CardFoot, CardFrame, CardTop, Ground, Mini, Panel, PlateRow, RankTag, Stamp,
  figureFor, fmtDuration, paletteOf, toVariant,
} from '@/components/yoroi/v2/partage/cardKit';
import type { CardPalette } from '@/components/yoroi/v2/partage/cardKit';
import { traduire, traduirePluriel, DECIMAL, LOCALE } from '@/lib/i18n/tr';

// Nom d'affichage des soumissions
const SUBMISSION_NAME_MAP: Record<string, string> = {
  rnc: 'RNC', bowarrow: 'Bow and Arrow', bodytri: 'Body Triangle', reartri: traduire('Triangle arrière'),
  crucifix: 'Crucifix', triangle: 'Triangle', triangleinv: traduire('Triangle inversé'), montedtri: traduire('Triangle monté'),
  guillotine: 'Guillotine', guillarmin: 'Arm-in Guillotine', marcelo: 'Guillotine haute',
  hipbumpguil: 'Hip Bump Guillotine', darce: "D'Arce", anaconda: traduire('Anaconda'), armtri: 'Arm Triangle',
  northsouth: 'Nord-Sud', ezekiel: traduire('Ezekiel'), buggy: 'Buggy Choke', loop: 'Loop Choke',
  baseball: 'Baseball Bat', papercutter: 'Paper Cutter', brabo: 'Brabo', clockchoke: 'Clock Choke',
  vonflue: 'Von Flue', peruvian: 'Peruvian Necktie', gogoplata: 'Gogoplata', twister: 'Twister',
  lapelchoke: 'Lapel Choke', daratine: 'Daratine', katahajime: 'Kata Ha Jime',
  japanesenetie: 'Japanese Necktie', mountedguill: traduire('Guillotine montée'), kesagatame: 'Kesa Gatame',
  headscissor: 'Head Scissors', ezekielguard: 'Ezekiel garde', necklace: 'Necklace Choke',
  chinstrap: 'Chin Strap', crosstri: traduire('Triangle croisé'),
  armbar: traduire('Clé de bras'), armbarguard: traduire('Clé de bras garde'), armbarmount: traduire('Clé de bras montée'),
  armbarback: traduire('Clé de bras dos'), kimura: 'Kimura', kimuratrap: 'Kimura Trap',
  americana: traduire('Américaine'), omoplata: 'Omoplata', monoplata: 'Monoplata', baratoplata: 'Baratoplata',
  tarikoplata: 'Tarikoplata', wristlock: traduire('Clé de poignet'), bicepslicer: 'Bicep Slicer',
  shoulder: traduire("Clé d'épaule"), hammerlock: 'Hammerlock', straightarm: 'Straight Arm Lock',
  chickenwing: 'Chicken Wing', spiderweb: 'Spider Web', reversearmbar: 'Reverse Armbar',
  mirlock: 'Mir Lock', gooseneck: 'Gooseneck', canopener: 'Can Opener',
  heelint: 'Heel Hook int.', heelext: 'Heel Hook ext.', crossheel: 'Cross Heel Hook',
  kneebar: traduire('Clé de genou'), anklelock: traduire('Clé de cheville'), anklerot: 'Ankle Lock rotatif',
  toehold: traduire('Clé de pied'), calfslicer: 'Calf Slicer', estima: 'Estima Lock',
  electricchair: 'Electric Chair', bananasplit: 'Banana Split', saddle: 'Saddle, Sankaku',
  straightfoot: 'Straight Foot Lock', suloev: 'Suloev Stretch', aokilock: 'Aoki Lock',
  revheelhook: 'Reverse Heel Hook', fig4ankle: 'Figure 4 Ankle', texasclover: 'Texas Cloverleaf',
};
const subName = (id: string): string => SUBMISSION_NAME_MAP[id] ?? id;

/** Vague 47 : taille du titre pour que le mot le plus long tienne sur une ligne (pas de mot coupe) */
function titleSize(title: string, width: number): number {
  const base = Math.round(width * 0.105);
  const longest = Math.max(1, ...String(title).split(/\s+/).map((w) => w.length));
  const room = width * 0.56;
  return Math.max(18, Math.min(base, Math.floor(room / (longest * 0.64))));
}

export interface CombatRoundData {
  number: number;
  result?: 'win' | 'loss' | 'draw' | null;
  pointsFor?: number;
  pointsAgainst?: number;
  methodsGiven?: string[];
  methodsTaken?: string[];
  usedTechniques?: { label: string; count?: number; pts?: number }[];
  roundIntensity?: string;
  partner?: string;
  partnerRating?: number;
  duration?: number;
}

type CardOption = {
  label: string; icon?: string; color?: string; weight?: string; reps?: string; sets?: string;
  distance?: string; duration?: string; speed?: string; pente?: string; calories?: string;
  watts?: string; resistance?: string; stairs?: string; pace?: string; sport?: string; sportName?: string;
};

interface SessionCardProps {
  training: Partial<Training>;
  backgroundImage?: string | null;
  backgroundType?: 'photo' | 'black' | 'white';
  keepPhotoClear?: boolean;
  customLocation?: string;
  isLandscape?: boolean;
  width?: number;
  userAvatar?: any;
  profilePhoto?: string | null;
  userName?: string;
  rank?: string;
  userLevel?: number;
  showDate?: boolean;
  showYearlyCount?: boolean;
  showMonthlyCount?: boolean;
  showWeeklyCount?: boolean;
  showGoalProgress?: boolean;
  showClub?: boolean;
  showLieu?: boolean;
  showExercises?: boolean;
  showStats?: boolean;
  yearlyCount?: number;
  monthlyCount?: number;
  weeklyCount?: number;
  yearlyObjective?: number;
  sessionsPerWeek?: number;
  disableInternalScroll?: boolean;
  combatRounds?: CombatRoundData[];
  options?: CardOption[];
}

const num = (v?: string) => parseFloat((v || '0').replace(',', '.'));
const fr = (v: number | string, d = 1) => {
  const n = typeof v === 'string' ? num(v) : v;
  return Number.isInteger(n) ? String(n) : n.toFixed(d).replace('.', DECIMAL);
};

function paceFromSpeed(speed?: string): string | null {
  const s = num(speed);
  if (s <= 0) return null;
  const p = 60 / s;
  const m = Math.floor(p);
  const sec = Math.round((p - m) * 60);
  return `${m}'${String(sec).padStart(2, '0')}"`;
}

function optionValue(o: CardOption, unite: UnitePoids = 'kg'): string {
  const parts: string[] = [];
  // 18 octobre 2026 : charge stockee en kilos, affichee dans l'unite du reglage
  if (o.weight) parts.push(unite === 'kg' ? `${fr(o.weight)} kg` : chargeTexte(num(o.weight), unite, 1));
  if (o.reps) parts.push(`${o.reps} reps`);
  if (o.sets && parseInt(o.sets, 10) > 1) parts.push(traduire("{0} séries", o.sets));
  if (o.distance) parts.push(`${fr(o.distance, 2)} km`);
  if (o.duration) parts.push(`${o.duration} min`);
  if (o.watts) parts.push(`${o.watts} W`);
  if (o.resistance) parts.push(traduire("niveau {0}", o.resistance));
  if (o.speed) parts.push(`${fr(o.speed)} km/h`);
  const pace = paceFromSpeed(o.speed);
  if (pace) parts.push(traduire("{0} au km", pace));
  else if (o.pace) parts.push(o.pace);
  if (o.pente) parts.push(`${fr(o.pente)} %`);
  if (o.stairs) parts.push(traduire("{0} étages", o.stairs));
  if (o.calories) parts.push(`${o.calories} kcal`);
  return parts.join(', ');
}

export const SessionCard = React.memo(React.forwardRef<View, SessionCardProps>(
  ({
    training, backgroundImage, backgroundType = 'black', width: widthProp, userName, options, combatRounds,
    customLocation, showYearlyCount = true, showDate = true, showClub = true, showLieu = true,
    showExercises = true, showStats = true, yearlyCount = 0, yearlyObjective = 365,
  }, ref) => {
    const { width: sw } = useWindowDimensions();
    const id = useCardIdentity();
    const unite = useUnitePoids();
    const width = widthProp ?? (sw - 40);
    const height = Math.round(width * (16 / 9));
    const variant = toVariant(backgroundType, !!backgroundImage);
    const isPhoto = variant === 'photo';
    const p = paletteOf(variant);
    const pad = Math.round(width * 0.055);

    const date = training.date ? new Date(training.date) : new Date();
    const dateLabel = date.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
    const sports = (training.sport ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const sportName = sports.length ? sports.map((s) => getSportName(s) ?? s).join(traduire(' et ')) : traduire('Séance');
    const clubLogo = training.club_logo ? getClubLogoSource(training.club_logo) : null;
    const place = customLocation || training.location_name || '';
    const duration = training.duration_minutes || 0;
    const objective = yearlyObjective && yearlyObjective > 0 ? yearlyObjective : 365;

    const rawTypes: string[] = useMemo(() => {
      if (training.session_types) {
        try {
          const v = JSON.parse(training.session_types as string);
          return Array.isArray(v) ? v : [String(v)];
        } catch {
          return [String(training.session_types)];
        }
      }
      return training.session_type ? [String(training.session_type)] : [];
    }, [training.session_types, training.session_type]);
    const typeLabels = Array.from(new Set(rawTypes.map((t) => getSessionTypeLabel(String(t ?? ''))).filter(Boolean))).slice(0, 3);

    // regle unique du tonnage (lib/v2/trainingWeek) quand la seance a ses exercices, sinon les options saisies
    const tonnage = useMemo(() => {
      const fromTraining = Array.isArray(training.exercises) || typeof training.exercises === 'string' ? trainingTonnage(training as Training) : 0;
      if (fromTraining > 0) return fromTraining;
      return (options ?? []).reduce((sum, o) => {
        const w = num(o.weight);
        const r = parseInt(o.reps || '0', 10);
        const s = parseInt(o.sets || '1', 10) || 1;
        return w > 0 && r > 0 ? sum + w * r * s : sum;
      }, 0);
    }, [options, training]);

    const combat = useMemo(() => {
      if (!combatRounds || combatRounds.length === 0) return null;
      const wins = combatRounds.filter((r) => r.result === 'win').length;
      const losses = combatRounds.filter((r) => r.result === 'loss').length;
      const draws = combatRounds.filter((r) => r.result === 'draw').length;
      const pf = combatRounds.reduce((a, r) => a + (r.pointsFor ?? 0), 0);
      const pa = combatRounds.reduce((a, r) => a + (r.pointsAgainst ?? 0), 0);
      const given = Array.from(new Set(combatRounds.flatMap((r) => r.methodsGiven ?? [])));
      const taken = Array.from(new Set(combatRounds.flatMap((r) => r.methodsTaken ?? [])));
      const techCount: Record<string, number> = {};
      combatRounds.forEach((r) => (r.usedTechniques ?? []).forEach((t) => { techCount[t.label] = (techCount[t.label] ?? 0) + (t.count ?? 1); }));
      const techs = Object.entries(techCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l]) => l);
      return { wins, losses, draws, pf, pa, given, taken, techs };
    }, [combatRounds]);

    // Metriques globales quand il n'y a pas d'exercices detailles
    const metrics: { value: string; label: string }[] = [];
    if ((training.distance || 0) > 0) metrics.push({ value: `${fr(training.distance || 0, 2)} km`, label: 'Distance' });
    if ((training.distance || 0) > 0 && duration > 0) {
      const sec = Math.round((duration * 60) / (training.distance || 1));
      metrics.push({ value: `${Math.floor(sec / 60)}'${String(sec % 60).padStart(2, '0')}"`, label: traduire('Allure au km') });
    } else if ((training.speed || 0) > 0) {
      const pc = paceFromSpeed(String(training.speed));
      if (pc) metrics.push({ value: pc, label: traduire('Allure au km') });
    }
    if ((training.speed || 0) > 0) metrics.push({ value: `${fr(training.speed || 0)} km/h`, label: traduire('Vitesse') });
    if ((training.heart_rate || 0) > 0) metrics.push({ value: `${training.heart_rate}`, label: traduire('Cœur moyen') });
    if ((training.max_heart_rate || 0) > 0) metrics.push({ value: `${training.max_heart_rate}`, label: traduire('Cœur max') });
    if ((training.calories || 0) > 0) metrics.push({ value: `${Math.round(training.calories || 0)}`, label: traduire('Kcal') });
    if ((training.watts || 0) > 0) metrics.push({ value: `${Math.round(training.watts || 0)} W`, label: traduire('Puissance') });
    if ((training.cadence || 0) > 0) metrics.push({ value: `${Math.round(training.cadence || 0)}`, label: traduire('Cadence') });
    if ((training.pente || 0) > 0) metrics.push({ value: `${fr(training.pente || 0)} %`, label: traduire('Pente') });
    if ((training.resistance || 0) > 0) metrics.push({ value: `${training.resistance}`, label: traduire('Résistance') });
    if ((training.rounds || 0) > 0) metrics.push({ value: `${training.rounds}${training.round_duration ? ` x ${training.round_duration} min` : ''}`, label: traduire('Rounds') });
    if ((training.intensity || 0) > 0) metrics.push({ value: `${training.intensity}/10`, label: traduire('Intensité') });

    const maxLines = Math.max(4, Math.floor((height - 470) / 22));
    const opts = options ?? [];
    const shown = opts.slice(0, maxLines);
    const hidden = Math.max(0, opts.length - shown.length);

    const figure = figureFor({ personnage: id.personnage, rankIndex: id.rankIndex, genre: id.genre, sport: training.sport });
    const figW = Math.round(width * 0.46);
    const name = userName && userName !== 'Champion' ? userName : id.name;

    const renderCombat = (pp: CardPalette) => {
      if (!combat || !combatRounds) return null;
      const rounds = combatRounds.slice(0, 4);
      return (
        <Panel p={pp} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
            <Score pp={pp} value={combat.wins} label={traduire("Victoires")} color={pp.accent} />
            <Score pp={pp} value={combat.draws} label={traduire("Nuls")} color={pp.panelInk2} />
            <Score pp={pp} value={combat.losses} label={traduire("Défaites")} color={pp.panelInk} />
            <View style={{ flex: 1 }} />
            {combat.pf > 0 || combat.pa > 0 ? <Ink size={13} weight="black" color={pp.panelInk}>{traduire("{0} à {1} pts", combat.pf, combat.pa)}</Ink> : null}
          </View>
          {rounds.map((r, i) => {
            const res = r.result === 'win' ? traduire('Victoire') : r.result === 'loss' ? traduire('Défaite') : r.result === 'draw' ? traduire('Nul') : '';
            const subs = [...(r.methodsGiven ?? []).map((m) => subName(m)), ...(r.methodsTaken ?? []).map((m) => traduire("subi : {0}", subName(m)))].slice(0, 2).join(', ');
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: r.result === 'win' ? pp.accent : r.result === 'loss' ? pp.panelInk : pp.gold }} />
                <View style={{ flex: 1 }}>
                  <Ink size={12} weight="extraBold" color={pp.panelInk} numberOfLines={1}>{r.partner ? traduire("Round {0} contre {1}", r.number, r.partner) : traduire("Round {0}", r.number)}</Ink>
                  {subs ? <Ink size={10} weight="bold" color={pp.panelInk2} numberOfLines={1}>{subs}</Ink> : null}
                </View>
                {res ? <Ink size={11} weight="black" color={r.result === 'win' ? pp.accent : pp.panelInk}>{res}</Ink> : null}
              </View>
            );
          })}
          {combatRounds.length > rounds.length ? <Ink size={10} weight="bold" color={pp.panelInk2}>{traduire("et {0} autres rounds", combatRounds.length - rounds.length)}</Ink> : null}
          {combat.techs.length > 0 ? <Ink size={10} weight="bold" color={pp.panelInk2} numberOfLines={1}>{combat.techs.join(', ')}</Ink> : null}
        </Panel>
      );
    };

    const renderDetails = (pp: CardPalette) => {
      if (shown.length > 0) {
        let prevSport: string | undefined;
        return (
          <Panel p={pp} style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ink size={12} weight="black" color={pp.panelInk} style={{ flex: 1 }}>{traduire("Le détail")}</Ink>
              {tonnage > 0 ? <Ink size={12} weight="black" color={pp.accent}>{`${formatTonnage(tonnage, unite)} ${accordSouleve(tonnage, unite)}`}</Ink> : null}
            </View>
            {shown.map((o, i) => {
              const sep = o.sport && o.sport !== prevSport && o.sportName ? o.sportName : null;
              prevSport = o.sport;
              const value = optionValue(o, unite);
              return (
                <React.Fragment key={i}>
                  {sep ? <Ink size={10} weight="black" color={pp.gold} style={{ marginTop: i > 0 ? 4 : 0 }}>{sep}</Ink> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 20 }}>
                    <Ink size={12} weight={o.label ? 'bold' : 'medium'} color={pp.panelInk} numberOfLines={1} style={{ flex: 1 }}>{o.label ? o.label.trim() : ''}</Ink>
                    {value ? <Ink size={12} weight="black" color={pp.panelInk} numberOfLines={1}>{value}</Ink> : null}
                  </View>
                </React.Fragment>
              );
            })}
            {hidden > 0 ? <Ink size={10} weight="bold" color={pp.panelInk2}>{traduirePluriel(hidden, hidden > 1, "et {0} autre", "et {0} autres", hidden)}</Ink> : null}
          </Panel>
        );
      }
      if (metrics.length > 0) {
        const rows = [metrics.slice(0, 3), metrics.slice(3, 6)].filter((r) => r.length);
        return (
          <Panel p={pp} style={{ gap: 10 }}>
            {rows.map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                {row.map((m) => <Mini key={m.label} p={pp} onPanel value={m.value} label={traduire(m.label)} />)}
                {row.length < 3 ? Array.from({ length: 3 - row.length }).map((_, k) => <View key={k} style={{ flex: 1 }} />) : null}
              </View>
            ))}
          </Panel>
        );
      }
      return (
        <Panel p={pp}>
          <Ink size={13} weight="bold" color={pp.panelInk} numberOfLines={3}>{training.notes?.trim() || traduire('Séance validée, un jour de plus dans ton année.')}</Ink>
        </Panel>
      );
    };

    return (
      <CardFrame ref={ref} variant={variant} width={width} height={height} photo={backgroundImage}>
        <View style={{ flex: 1, paddingTop: pad, paddingBottom: pad * 0.8, paddingLeft: pad + 4, paddingRight: pad, gap: 12 }}>
          <CardTop p={p} label={showDate ? dateLabel : undefined} />

          <View style={{ flex: 1, justifyContent: isPhoto ? 'flex-end' : 'flex-start' }}>
            {!isPhoto ? (
              <View pointerEvents="none" style={{ position: 'absolute', right: -pad * 0.4, top: 0, bottom: 0, width: figW, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Image source={figure} style={{ width: figW, height: '100%', maxHeight: figW * 1.33 }} resizeMode="contain" />
                <View style={{ marginTop: -10 }}><Ground width={figW * 0.8} color={variant === 'papier' ? '#D9D5CB' : 'rgba(255,255,255,0.18)'} /></View>
              </View>
            ) : null}
            <View style={{ gap: 4, maxWidth: isPhoto ? '100%' : width * 0.56, paddingTop: isPhoto ? 0 : 8 }}>
              <Ink size={14} weight="bold" color={p.ink2} numberOfLines={1}>{name ? traduire("La séance de {0}", name) : traduire('Séance du jour')}</Ink>
              <Ink size={titleSize(sportName, width)} weight="black" tight color={p.ink} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{sportName}</Ink>
              {typeLabels.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {typeLabels.map((t) => (
                    <View key={t} style={{ borderWidth: 1.5, borderColor: p.gold, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 }}>
                      <Ink size={11} weight="extraBold" color={p.gold}>{t}</Ink>
                    </View>
                  ))}
                </View>
              ) : null}
              {showClub ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  {clubLogo ? <Image source={clubLogo} style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: '#FFFFFF' }} resizeMode="contain" /> : null}
                  <Ink size={13} weight="bold" color={p.ink} numberOfLines={1}>{training.club_name || traduire('Séance en solo')}</Ink>
                </View>
              ) : null}
              {showLieu && place ? <Ink size={12} weight="bold" color={p.muted} numberOfLines={1}>{place}</Ink> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                {duration > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                    <Ink size={Math.round(width * (combat ? 0.12 : 0.15))} weight="black" tight color={p.ink} numberOfLines={1} style={{ lineHeight: Math.round(width * (combat ? 0.13 : 0.16)) }}>{fmtDuration(duration).replace(' min', '')}</Ink>
                    {duration < 60 ? <Ink size={16} weight="black" color={p.accent} style={{ marginBottom: 8 }}>min</Ink> : null}
                  </View>
                ) : null}
              </View>
            </View>
            {combat && combat.wins > 0 && combat.losses === 0 && combatRounds && combatRounds.length >= 3 ? (
              <View style={{ position: 'absolute', right: 2, top: 4 }}><Stamp p={p} size={48} /></View>
            ) : null}
          </View>

          {showExercises ? (combat ? renderCombat(p) : renderDetails(p)) : null}

          {showStats && showYearlyCount && yearlyCount > 0 ? (
            <View style={{ gap: 6 }}>
              <PlateRow p={p} progress={yearlyCount / objective} count={12} w={Math.floor((width - 70) / 12) - 2} />
              <Ink size={11} weight="bold" color={p.ink2}>{traduirePluriel(yearlyCount, yearlyCount > 1, "{0} séance cette année, objectif {1}", "{0} séances cette année, objectif {1}", yearlyCount, objective)}</Ink>
            </View>
          ) : null}

          <CardFoot p={p} />
        </View>
      </CardFrame>
    );
  },
));
SessionCard.displayName = 'SessionCard';

function Score({ pp, value, label, color }: { pp: CardPalette; value: number; label: string; color: string }) {
  return (
    <View>
      <Ink size={30} weight="black" tight color={color} style={{ lineHeight: 32 }}>{value}</Ink>
      <Ink size={10} weight="bold" color={pp.panelInk2}>{label}</Ink>
    </View>
  );
}

export default SessionCard;
