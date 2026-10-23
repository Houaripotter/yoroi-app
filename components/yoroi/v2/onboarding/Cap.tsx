/**
 * Ecran 10 (facultatif) : ton cap. Regle prereglee selon l'objectif, puis la courbe qui y mene
 * et une fourchette d'arrivee honnete (lib/v2/pesee/estimation.ts : 0,5 a 1 % du poids par semaine pour perdre,
 * 0,25 a 0,5 % pour prendre, en ralentissant pres du but). Les seances ne sont pas encore choisies :
 * la fourchette entiere est montree, Ton plan l'affine. Sans date si le cap est trop loin
 * ou hors des reperes d'IMC : un premier cap est propose, sans jugement. Une estimation, jamais une promesse.
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import type { Goal } from '@/lib/v2/onboarding/draft';
import { PAS_UNE_PROMESSE, estimerArrivee, fourchetteDates, fourchetteTexte, pourquoiTexte, sansDateTexte } from '@/lib/v2/pesee/estimation';
import type { Estimation } from '@/lib/v2/pesee/estimation';
import { Ruler } from './Ruler';
import { PAS_KG, Pas } from './Pas';
import { PlanCurve } from './PlanCurve';
import { MainButton, OR_PROFOND, Riche, Shell, kg, marquer, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

export { bmi } from './Taille';

export function gapText(start: number, target: number): string {
  const d = Math.round((target - start) * 10) / 10;
  if (Math.abs(d) < 0.1) return traduire('Tu es déjà sur ton cap');
  return traduire("{0} kg à {1}", kg(Math.abs(d)), d < 0 ? 'perdre' : 'prendre');
}

/** « 5 kg à perdre, entre le 15 et le 30 décembre » */
export function arrivalText(start: number, target: number, goal: Goal | null, sessions: number | null = null, heightCm: number | null = null): string {
  if (goal === 'maintain') return gapText(start, target);
  const e = estimerArrivee({ start, target, sessions, heightCm });
  return e.kind === 'ok' ? `${gapText(start, target)}, ${fourchetteTexte(e.earliest, e.latest)}` : gapText(start, target);
}

/** Le bloc « arrivee » commun a Ton cap et a Ton plan : titre, fin de courbe, explication, cap propose */
// vague 50 (Houari : « Fin, c'est moche ») : de vraies dates partout, « du 28 janv. au 15 mai », jamais « fin janv. »
export function arriveeVue(e: Estimation, start: number, target: number): { titre: string; fin: string | null; texte: string; cap: number | null; courbeVers: number } {
  if (e.kind === 'ok') {
    return { titre: fourchetteDates(e.earliest, e.latest), fin: fourchetteDates(e.earliest, e.latest), texte: `${gapText(start, target)}. ${pourquoiTexte(e)}`, cap: null, courbeVers: target };
  }
  const s = sansDateTexte(e, target);
  if (s && e.kind !== 'deja') {
    const r = e.capRange;
    return { titre: s.titre, fin: r ? fourchetteDates(r.earliest, r.latest) : null, texte: s.texte, cap: s.cap, courbeVers: s.cap ?? start };
  }
  return { titre: gapText(start, target), fin: null, texte: '', cap: null, courbeVers: target };
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** « mi-janvier » ne se coupe pas a la ligne (trait d'union insecable) */
export const insecable = (t: string) => t.replace(/-/g, '\u2011');

export function Cap({ nav, start, target, height, recompo = false, onTarget, onNext }: {
  nav: Nav;
  start: number;
  target: number;
  goal?: Goal | null;
  /** vague 29 : perdre du poids et prendre du muscle, baisse lente */
  recompo?: boolean;
  height?: number | null;
  onTarget: (v: number) => void;
  onNext: () => void;
}) {
  const c = useColors();
  const [w, setW] = useState(0);
  const e = estimerArrivee({ start, target, sessions: null, heightCm: height ?? null, recompo: recompo && target < start });
  const v = arriveeVue(e, start, target);
  const ok = e.kind === 'ok';
  const sub = recompo ? traduire('Le **poids que tu vises**. En recomposition, il baisse lentement pendant que le muscle se construit.') : traduire('Le **poids que tu vises**. Tu pourras le changer quand tu veux.');
  // vague 30 : les mots importants en gras et en couleur (kilos a perdre, une estimation)
  const texte = v.texte ? marquer(`${v.texte} ${PAS_UNE_PROMESSE}${ok ? traduire(' Ton plan l’affinera avec tes séances.') : ''}`, [gapText(start, target), traduire('Une estimation'), traduire('tes séances')]) : '';
  return (
    <Shell {...nav} title={traduire("Où veux-tu **arriver** ?")} sub={sub} gap={14} footer={<MainButton label={traduire("Continuer")} onPress={onNext} />}>
      <View style={{ alignItems: 'center' }}>
        <Ink size={64} weight="black" tight numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>{kg(target)}</Ink>
        <Ink size={15} weight="bold" color={c.textSecondary}>{traduire("kilos visés")}</Ink>
      </View>
      <Ruler value={target} onChange={onTarget} hardMin={30} hardMax={250} label={traduire("Règle du poids visé, fais glisser pour régler")} />
      {/* vague 30 : au kilo et au dixieme, appui long pour aller vite */}
      <Pas value={target} onChange={onTarget} pas={PAS_KG} clamp={(x) => Math.min(250, Math.max(30, Math.round(x * 10) / 10))} />

      <View onLayout={(ev) => setW(ev.nativeEvent.layout.width)} style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingVertical: 14, paddingHorizontal: 14, gap: 8 }}>
        <View style={{ gap: 1 }}>
          {ok ? <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Arrivée estimée")}</Ink> : null}
          {/* vague 30 : la date estimee dans l'or profond, en gras, visible d'un coup d'oeil */}
          <Ink size={ok ? 21 : 17} weight="black" tight color={ok ? OR_PROFOND : c.ink} style={{ lineHeight: ok ? 26 : 22 }}>{ok ? insecable(majuscule(v.titre)) : v.titre}</Ink>
        </View>
        {w > 0 ? <PlanCurve start={start} target={v.courbeVers} width={w - 28} height={124} endLabel={v.fin} /> : <View style={{ height: 124 }} />}
        {texte ? <Riche text={texte} size={14} lineHeight={20} /> : null}
        {v.cap != null ? (
          <Pressable
            onPress={() => {
              tap('medium');
              onTarget(v.cap as number);
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Viser {0} kilos pour commencer", kg(v.cap))}
            style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, backgroundColor: pressed ? c.fillSoft : c.accentTint })}
          >
            <Ink size={14} weight="extraBold" color={c.accent}>{traduire("Viser {0} kg pour commencer", kg(v.cap))}</Ink>
          </Pressable>
        ) : null}
      </View>
    </Shell>
  );
}

export default Cap;
