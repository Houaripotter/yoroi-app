/**
 * Ecran 16 : ton plan (vague 27). D'abord la courbe projetee jusqu'a la fourchette d'arrivee (vague 28 :
 * lib/v2/pesee/estimation.ts, affinee par tes seances), puis ta semaine type avec tes jours, un apercu de ta carte Poids telle qu'elle sera a l'accueil (ta vraie pesee du jour),
 * et en petit seulement ton personnage et ton rang. Uniquement tes reponses et ce que l'app calcule.
 * Vague 45 : le personnage suit l'univers choisi (Guerrier, Sportif, ou aucune figure) ; le nom du rang
 * arrive deja calcule par rangNom dans l'univers choisi.
 * 26 octobre 2026 (revue de l'onboarding) : sous ton chemin, « Sport, alimentation, ou les deux ? » (PlanSport.tsx,
 * seulement les etudes de sources.ts) quand ton poids doit baisser ; ta semaine en couleurs avec tes sports
 * (SemaineCouleurs.tsx) ; « Ton accueil, des maintenant » devient un apercu qui donne envie (ApercuProgres.tsx :
 * le chemin qui se remplit, ta premiere semaine en XP, le prochain rang) ; enfin, ton coach qui suit avec tes reponses.
 * La carte Poids complete reste a l'ecran Demonstration (pas de doublon).
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { guerrierImage } from '@/components/yoroi/v2/espace/assets';
import { CLASSIQUE_IMAGES } from '@/lib/v2/dojo/personnages';
import { rangNom } from '@/lib/v2/dojo/univers';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import type { Goal } from '@/lib/v2/onboarding/draft';
import { sensDe } from '@/lib/v2/onboarding/objectifs';
import { PAS_UNE_PROMESSE, estimerArrivee, fourchetteDates, seancesTexte } from '@/lib/v2/pesee/estimation';
import { PiedArrivee } from '@/components/yoroi/v2/premium/TonPlan';
import { joursTexte } from '@/components/yoroi/v2/espace/JoursPicker';
import { arriveeVue, gapText } from './Cap';
import { PlanCurve } from './PlanCurve';
import { SemaineCouleurs } from './SemaineCouleurs';
import { PlanSport } from './PlanSport';
import { ApercuProgres } from './ApercuProgres';
import { MainButton, Riche, Shell, kg, marquer, useColors } from './ui';
import type { Nav } from './types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export function Resultat({ nav, name, genre, univers = 'japon', rankName, rankIndex = 0, start, target, goal, goals, sessions, days = [], height = null, sports, pesees = 0, onNext }: {
  nav: Nav;
  name: string;
  genre: 'h' | 'f';
  /** vague 45 : univers choisi a l'ecran 4 */
  univers?: ChoixUnivers;
  /** nom du rang, deja dans l'univers choisi (rangNom) */
  rankName: string;
  /** 26 octobre 2026 : index du rang (0 a 4), pour l'apercu du Dojo */
  rankIndex?: number;
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
  /** pesees prevues par semaine (ecran Pesee) */
  pesees?: number;
  onNext: () => void;
}) {
  const c = useColors();
  const pal = usePaletteProgramme();
  const [w, setW] = useState(0);
  const title = name.trim() ? traduire("{0}, voici **ton plan**", name.trim()) : traduire('Voici **ton plan**');
  const liste = goals && goals.length ? goals : goal ? [goal] : [];
  const sens = sensDe(liste);
  const maintain = sens === 'stable' || target == null;
  const recompo = sens === 'recompo';
  const e = start != null && !maintain ? estimerArrivee({ start, target: target as number, sessions, heightCm: height, recompo: recompo && (target as number) < start }) : null;
  const v = e && start != null ? arriveeVue(e, start, target as number) : null;
  const ok = e?.kind === 'ok';
  const baisse = start != null && target != null && !maintain && (target as number) < start;
  const g = genre === 'f' ? 'f' : 'h';
  const ri = Math.max(0, Math.min(4, rankIndex));
  const persoDe = (i: number) => (univers === 'japon' ? guerrierImage(genre, i) : univers === 'classique' ? CLASSIQUE_IMAGES[g][i] : null);
  const nextName = ri < 4 ? rangNom(ri + 1, univers === 'japon' ? 'japon' : 'classique') : null;

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

      {baisse ? (
        <Animated.View entering={FadeInDown.delay(120).duration(380)}>
          <PlanSport sessions={sessions} sports={sports} />
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(220).duration(380)} style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12 }}>
        <View style={{ gap: 2 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Ta semaine type")}</Ink>
          <Riche size={18} weight="black" color={c.ink} lineHeight={23} text={sessions ? traduirePluriel(sessions, sessions > 1, "**{0} séance** par semaine", "**{0} séances** par semaine", sessions) : traduire('À ton rythme')} />
          {days.length ? <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={2}>{joursTexte(days).replace(/^./, (x) => x.toUpperCase())}</Ink> : null}
        </View>
        <SemaineCouleurs days={days} sports={sports} size={36} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).duration(380)} style={{ gap: 8 }}>
        <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Ton accueil, dès maintenant")}</Ink>
        <ApercuProgres
          start={start}
          target={maintain ? null : target}
          sessions={sessions}
          recompo={recompo}
          pesees={pesees}
          rankIndex={ri}
          rankName={rankName}
          nextName={nextName}
          image={persoDe(ri)}
          imageSuivante={ri < 4 ? persoDe(ri + 1) : null}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(420).duration(380)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, backgroundColor: pal.teinte, padding: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: pal.indigo, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="list" size={22} color="#FFFFFF" />
        </View>
        <Riche size={13} lineHeight={18} color={c.ink} style={{ flex: 1 }} text={traduire('Ensuite, **ton coach** te propose un programme sur ces jours. Il reprend tes réponses, sans tout redemander.')} />
      </Animated.View>
    </Shell>
  );
}

export default Resultat;
