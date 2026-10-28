/**
 * « Cette semaine », maquette A de l'onglet Séances (28 octobre 2026) : l'anneau de ton objectif (séances faites sur
 * ton objectif, ou jours entraînés sur 7 sans objectif), la phrase qui dit où tu en es, et les sept jours de L à D :
 * le sticker du sport des jours faits (avec leur nombre s'il y en a plusieurs), aujourd'hui entouré, les jours prévus
 * en pointillés. Mêmes données qu'avant (computeWeekPlates, weekCompare) ; seuls la forme et l'ordre changent.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { STICKERS, useIllustrations } from '@/components/yoroi/v2/stickers';
import type { Training } from '@/lib/database';
import type { WeekCompare } from '@/lib/v2/seances/weekCompare';
import { PLAN_DAYS_SHORT } from '@/lib/v2/seances/sessionData';
import type { DayPlate } from './WeekPlates';
import { stickerDuSport } from './MonthMarks';
import { Petites, useCarteA, useTeinte } from './kitA';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

function Anneau({ fait, total, taille = 62 }: { fait: number; total: number; taille?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const bleu = useTeinte('bleu');
  const r = taille / 2 - 6;
  const tour = 2 * Math.PI * r;
  const part = total > 0 ? Math.min(1, fait / total) : 0;
  return (
    <View style={{ width: taille, height: taille }} accessible accessibilityLabel={traduire('{0} sur {1}', fait, total)}>
      <Svg width={taille} height={taille}>
        <Circle cx={taille / 2} cy={taille / 2} r={r} stroke={bleu.fond} strokeWidth={8} fill="none" />
        {part > 0 ? (
          <Circle cx={taille / 2} cy={taille / 2} r={r} stroke={theme.isDark ? '#9DB1FF' : '#4256C9'} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={`${tour * part} ${tour}`} transform={`rotate(-90 ${taille / 2} ${taille / 2})`} />
        ) : null}
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
        <Ink size={Math.round(taille * 0.3)} weight="black" tight>{String(fait)}</Ink>
        <Ink size={Math.round(taille * 0.18)} weight="extraBold" color={c.textSecondary}>{`/${total}`}</Ink>
      </View>
    </View>
  );
}

function Jour({ p, sports, lettre }: { p: DayPlate; sports: string[]; lettre: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const bleu = useTeinte('bleu');
  const indigo = theme.isDark ? '#9DB1FF' : '#4256C9';
  const fait = p.state === 'done';
  const sticker = sports[0] ? STICKERS[stickerDuSport(sports[0])] : null;
  const base = { height: 40, alignSelf: 'stretch' as const, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const };
  let fond: object;
  if (fait) fond = { backgroundColor: bleu.fond, borderWidth: p.isToday ? 2.5 : 0, borderColor: indigo };
  else if (p.isToday) fond = { backgroundColor: c.surface, borderWidth: 2.5, borderColor: indigo };
  else if (p.state === 'planned') fond = { borderWidth: 2, borderStyle: 'dashed', borderColor: theme.isDark ? '#4A5578' : '#B9C3E4' };
  else if (p.state === 'missed') fond = { backgroundColor: c.fillSubtle, borderWidth: 1.5, borderColor: c.border };
  else fond = { backgroundColor: theme.isDark ? c.fillSubtle : '#ECEEF5' };
  const etat = fait ? traduirePluriel(p.count, p.count > 1, '{0} séance', '{0} séances', p.count) : p.state === 'planned' ? traduire('prévu') : p.state === 'missed' ? traduire('manqué') : p.state === 'rest' ? traduire('repos') : traduire('libre');
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 5, minWidth: 0 }} accessible accessibilityLabel={`${lettre}, ${etat}${p.isToday ? `, ${traduire('aujourd’hui')}` : ''}`}>
      <View style={[base, fond]}>
        {fait ? (
          illus.stickers && sticker ? <Image source={sticker} style={{ width: 24, height: 24 }} resizeMode="contain" /> : <Ink size={14} weight="black" color={bleu.texte}>{String(Math.max(1, p.count))}</Ink>
        ) : p.state === 'rest' ? (
          <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M17 14a6 6 0 1 1-6-7 4.6 4.6 0 0 0 6 7z" fill={c.textMuted} /></Svg>
        ) : null}
        {fait && p.count > 1 && illus.stickers && sticker ? (
          <View style={{ position: 'absolute', right: -5, top: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 3, backgroundColor: theme.isDark ? '#9DB1FF' : '#23358F', borderWidth: 2, borderColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={10} weight="black" color={theme.isDark ? '#1A1E29' : '#FFFFFF'}>{String(p.count)}</Ink>
          </View>
        ) : null}
      </View>
      <Ink size={11.5} weight="extraBold" color={p.isToday ? c.accentText : c.textSecondary}>{lettre}</Ink>
    </View>
  );
}

export function SemaineAnneau({ week, plates, trainings, weeklyGoal, onChooseGoal }: {
  week: WeekCompare;
  plates: DayPlate[];
  trainings: Training[];
  weeklyGoal: number;
  onChooseGoal?: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const menthe = useTeinte('menthe');
  const cur = week.current;
  const avecObjectif = weeklyGoal > 0;
  const tenu = avecObjectif && cur.sessions >= weeklyGoal;
  const titre = avecObjectif
    ? traduire('{0} sur {1}', traduirePluriel(cur.sessions, cur.sessions > 1, '{0} séance', '{0} séances', cur.sessions), weeklyGoal)
    : traduirePluriel(cur.sessions, cur.sessions > 1, '{0} séance', '{0} séances', cur.sessions);
  const sportsDuJour = (iso: string) => trainings.filter((t) => t.date.slice(0, 10) === iso).map((t) => t.sport);

  return (
    <View style={carte} accessibilityLabel={traduire('Cette semaine, {0}', week.range)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Anneau fait={avecObjectif ? cur.sessions : cur.days} total={avecObjectif ? weeklyGoal : 7} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Petites texte={traduire('Cette semaine')} teinte="bleu" />
          <Ink size={18} weight="black" tight>{titre}</Ink>
          {tenu ? (
            <Ink size={12.5} weight="extraBold" color={menthe.texte}>{traduire('Objectif tenu')}</Ink>
          ) : avecObjectif ? (
            <Ink size={12.5} weight="bold" color={c.textSecondary}>{cur.sessions === 0 ? traduire('Ta semaine commence ici') : traduire('Encore {0} pour ton objectif', weeklyGoal - cur.sessions)}</Ink>
          ) : onChooseGoal ? (
            <Pressable onPress={onChooseGoal} accessibilityRole="button" accessibilityLabel={traduire('Choisir un objectif de séances')} hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 28, justifyContent: 'center' }}>
              <Ink size={12.5} weight="extraBold" color={c.accentText}>{traduire('Choisir un objectif, si tu veux')}</Ink>
            </Pressable>
          ) : (
            <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduirePluriel(cur.days, cur.days > 1, '{0} jour entraîné', '{0} jours entraînés', cur.days)}</Ink>
          )}
        </View>
      </View>
      <View style={{ marginTop: 12, flexDirection: 'row', gap: 6 }}>
        {plates.map((p, i) => <Jour key={p.iso} p={p} sports={sportsDuJour(p.iso)} lettre={PLAN_DAYS_SHORT[i]} />)}
      </View>
    </View>
  );
}
