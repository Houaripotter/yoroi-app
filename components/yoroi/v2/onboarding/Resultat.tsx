/**
 * Ecran 16 : ton plan (vague 27). D'abord la courbe projetee jusqu'a la fourchette d'arrivee (vague 28 :
 * lib/v2/pesee/estimation.ts, affinee par tes seances), puis ta semaine type avec tes jours, un apercu de ta carte Poids telle qu'elle sera a l'accueil (ta vraie pesee du jour),
 * et en petit seulement ton personnage et ton rang. Uniquement tes reponses et ce que l'app calcule.
 * Vague 45 : le personnage suit l'univers choisi (Guerrier, Sportif, ou aucune figure) ; le nom du rang
 * arrive deja calcule par rangNom dans l'univers choisi.
 */
import React, { useState } from 'react';
import { Image, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CartePoids } from '@/components/yoroi/v2/accueil/CartePoids';
import { guerrierImage } from '@/components/yoroi/v2/espace/assets';
import { CLASSIQUE_IMAGES } from '@/lib/v2/dojo/personnages';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { getSportName } from '@/lib/sports';
import type { Goal } from '@/lib/v2/onboarding/draft';
import { isoOf } from '@/lib/v2/onboarding/plan';
import { sensDe } from '@/lib/v2/onboarding/objectifs';
import { PAS_UNE_PROMESSE, estimerArrivee, fourchetteDates, seancesTexte } from '@/lib/v2/pesee/estimation';
import { PiedArrivee } from '@/components/yoroi/v2/premium/TonPlan';
import { joursTexte } from '@/components/yoroi/v2/espace/JoursPicker';
import { WeekDots } from './Rythme';
import { arriveeVue, gapText } from './Cap';
import { PlanCurve } from './PlanCurve';
import { MainButton, OR_PROFOND, Riche, Shell, kg, marquer, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

export function Resultat({ nav, name, genre, univers = 'japon', rankName, start, target, goal, goals, sessions, days = [], height = null, sports, onNext }: {
  nav: Nav;
  name: string;
  genre: 'h' | 'f';
  /** vague 45 : univers choisi a l'ecran 4 */
  univers?: ChoixUnivers;
  /** nom du rang, deja dans l'univers choisi (rangNom) */
  rankName: string;
  start: number | null;
  target: number | null;
  goal: Goal | null;
  /** vague 29 : tous les objectifs choisis */
  goals?: Goal[];
  sessions: number | null;
  /** jours d'entrainement choisis, 0 = lundi */
  days?: number[];
  height?: number | null;
  sports: string[];
  onNext: () => void;
}) {
  const c = useColors();
  const [w, setW] = useState(0);
  const title = name.trim() ? traduire("{0}, voici **ton plan**", name.trim()) : traduire('Voici **ton plan**');
  const liste = goals && goals.length ? goals : goal ? [goal] : [];
  const sens = sensDe(liste);
  const maintain = sens === 'stable' || target == null;
  const recompo = sens === 'recompo';
  const e = start != null && !maintain ? estimerArrivee({ start, target: target as number, sessions, heightCm: height, recompo: recompo && (target as number) < start }) : null;
  const v = e && start != null ? arriveeVue(e, start, target as number) : null;
  const ok = e?.kind === 'ok';
  const today = isoOf(new Date());
  const sportNames = sports.map((s) => getSportName(s) ?? s).filter(Boolean).slice(0, 4);
  const perso = univers === 'japon' ? guerrierImage(genre, 0) : univers === 'classique' ? CLASSIQUE_IMAGES[genre === 'f' ? 'f' : 'h'][0] : null;
  const phraseRang = perso ? traduire("Ton personnage commence au rang {0}. Il évolue avec toi dans le Dojo.", rankName) : traduire("Tu commences au rang {0}. Ta progression se suit dans le Dojo.", rankName);

  return (
    <Shell {...nav} title={title} gap={14} footer={<MainButton label={traduire("Continuer")} onPress={onNext} />}>
      {start != null ? (
        <Animated.View entering={FadeInDown.duration(380)} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 8 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Ton chemin")}</Ink>
          {/* vague 30 : le poids vise en indigo, la date estimee dans l'or profond, en gras */}
          <Riche
            size={22}
            weight="black"
            color={c.ink}
            lineHeight={27}
            style={{ letterSpacing: -0.6 }}
            text={maintain ? `Garder **${kg(start)} kg**` : v ? (ok ? traduire("Cap sur **{0} kg**", kg(target as number)) : v.titre) : traduire('Tu es déjà sur ton cap')}
          />
          {/* vague 50 : l'arrivee prevue comme sur Ton plan : le vrai torii et les vraies dates, en indigo fonce */}
          {ok && e?.kind === 'ok' ? <PiedArrivee arrivee={fourchetteDates(e.earliest, e.latest)} style={{ borderRadius: 16, borderWidth: 1, borderColor: '#EFE4C8', marginVertical: 2 }} /> : null}
          {w > 0 ? <PlanCurve start={start} target={maintain ? null : v ? v.courbeVers : target} width={w - 32} height={140} endLabel={v ? v.fin : null} /> : <View style={{ height: 140 }} />}
          <Riche
            size={14}
            lineHeight={20}
            text={
              maintain
                ? liste.includes('gain')
                  ? traduire('Ton poids reste **stable** pendant que le muscle se construit : tes charges et tes mensurations montrent le progrès.')
                  : traduire('Ta courbe lissée te montre si tu restes **dans ta zone**, sans t’inquiéter d’une pesée isolée.')
                : v && v.texte
                  ? marquer(`${v.texte}${ok ? ` ${seancesTexte(sessions)}` : ''} ${PAS_UNE_PROMESSE}`, [start != null && target != null ? gapText(start, target) : null, sessions ? `${sessions} ${sessions > 1 ? traduire('séances') : traduire('séance')}` : null, traduire('ton alimentation'), traduire('Une estimation')])
                  : traduire('Ta courbe lissée te montre ta tendance jour après jour.')
            }
          />
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(150).duration(380)} style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12 }}>
        <View style={{ gap: 2 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Ta semaine type")}</Ink>
          <Riche size={18} weight="black" color={c.ink} lineHeight={23} text={sessions ? traduire("**{0} {1}** par semaine", sessions, sessions > 1 ? 'séances' : 'séance') : traduire('À ton rythme')} />
          {days.length ? <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={2}>{joursTexte(days).replace(/^./, (x) => x.toUpperCase())}</Ink> : null}
          {sportNames.length ? <Ink size={13} color={c.textSecondary} numberOfLines={2}>{sportNames.join(', ')}</Ink> : null}
        </View>
        <WeekDots count={sessions ?? 0} days={days} size={34} />
      </Animated.View>

      {start != null ? (
        <Animated.View entering={FadeInDown.delay(300).duration(380)} style={{ gap: 8 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Ton accueil, dès maintenant")}</Ink>
          <View pointerEvents="none">
            <CartePoids demo series={[{ date: today, value: start, trend: start, hasComposition: false }]} targetWeight={maintain ? null : target} startWeight={start} />
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(450).duration(380)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: c.fillSoft, paddingHorizontal: 12, paddingVertical: 8 }}>
        {perso ? <Image source={perso} style={{ width: 44, height: 52 }} resizeMode="contain" /> : null}
        <Ink size={13} color={c.textSecondary} style={{ flex: 1, lineHeight: 18, paddingVertical: perso ? 0 : 6 }}>{phraseRang}</Ink>
      </Animated.View>
    </Shell>
  );
}

export default Resultat;
