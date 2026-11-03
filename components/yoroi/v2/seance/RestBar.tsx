/**
 * Minuteur de repos de la seance de muscu, en bas de l'ecran, dans le style des chronos :
 * fond mousse du repos, barre du temps restant, gros chiffres, moins et plus 15 s, passer.
 * Les 10 dernieres secondes passent en or : prepare-toi, ca repart. Horloge calee sur l'instant de fin
 * (chaque chiffre reste une seconde pile, aucune acceleration). Son « wizz » et vibration a la fin.
 * 30 octobre 2026 : le son seulement si tu as l'app sous les yeux a la fin ; vue en retard (retour dans l'app),
 * la fin est discrete (lib/v2/seances/finRepos.ts).
 */
import React, { useEffect, useRef } from 'react';
import { AppState, Image, Pressable, Vibration, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import { playClapSound, playWizzSound } from '@/lib/soundManager';
import { decisionFinRepos } from '@/lib/v2/seances/finRepos';
import { fmtClock } from '@/lib/v2/seance/format';
import { PHASE_COLORS, loadClapEnabled } from '@/lib/v2/carnet/chrono';
import { claquettesAuPassage, tapsClaquettes } from '@/lib/v2/carnet/claquettes';
import { niveauCoach } from '@/lib/v2/coachVocal/reglages';
import { useAlignedNow } from '@/lib/v2/carnet/useAlignedNow';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';
import { useIllustrations } from '@/components/yoroi/v2/stickers';

type Props = {
  endsAt: number;
  total: number;
  bottom: number;
  /** secondes a ajouter (negatif pour enlever) */
  onAdd: (sec: number) => void;
  onSkip: () => void;
  /** enRetard : fin vue au retour dans l'app, sans son */
  onFinish: (enRetard: boolean) => void;
};

const INK = '#1D2029';

export function RestBar({ endsAt, total, bottom, onAdd, onSkip, onFinish }: Props) {
  const now = useAlignedNow(endsAt, true);
  // 30 octobre 2026 (Houari : des stickers partout) : le sablier du repos, rien en Encre japonaise comme avant
  const illus = useIllustrations();
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    clapFait.current = false;
  }, [endsAt]);

  // 3 novembre 2026 : clac clac clac à 10 s de la fin du repos, app sous les yeux (réglage commun des chronos).
  // Le coach vocal parle déjà à 10 s : avec lui, pas de claquettes par dessus sa voix.
  const clapOn = useRef(true);
  const clapFait = useRef(false);
  useEffect(() => {
    loadClapEnabled().then((v) => { clapOn.current = v; }).catch(() => {});
  }, []);
  useEffect(() => {
    if (clapFait.current || !clapOn.current || AppState.currentState !== 'active') return;
    if (!claquettesAuPassage(total, endsAt - Date.now())) return;
    clapFait.current = true;
    if (niveauCoach() !== 'off') return;
    playClapSound().catch(() => {});
    tapsClaquettes(() => { impactAsync(ImpactFeedbackStyle.Light).catch(() => {}); });
  }, [now, endsAt, total]);

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000 - 1e-6));
  const final = left <= 10;
  const pc = final ? PHASE_COLORS.prepa : PHASE_COLORS.repos;

  useEffect(() => {
    if (left === 0 && !fired.current) {
      const d = decisionFinRepos({ finMs: endsAt, maintenant: Date.now(), etatApp: AppState.currentState, sansRepos: false });
      // en arriere plan : la notification previent, l'ecran attend ton retour
      if (d === 'attendre' || d === 'rien') return;
      fired.current = true;
      if (d === 'son') {
        Vibration.vibrate([0, 400, 150, 400]);
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        playWizzSound().catch(() => {});
      }
      onFinish(d === 'discret');
    }
  }, [left, onFinish, now, endsAt]);

  const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;

  const btn = (label: string, a11y: string, fn: () => void, icon?: 'minus' | 'plus') => (
    <Pressable
      onPress={fn}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={4}
      style={({ pressed }) => ({ minHeight: 48, minWidth: 48, paddingHorizontal: icon ? 9 : 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: pressed ? blancA(0.75) : blancA(0.92) })}
    >
      {icon ? (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d={icon === 'plus' ? 'M12 5v14M5 12h14' : 'M5 12h14'} stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
        </Svg>
      ) : null}
      <Ink size={14} weight="extraBold" color={INK}>{label}</Ink>
    </Pressable>
  );

  return (
    <View
      style={{ position: 'absolute', left: 12, right: 12, bottom, borderRadius: 26, backgroundColor: pc.soft, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', overflow: 'hidden', shadowColor: INK, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}
      accessibilityLiveRegion="polite"
      accessibilityLabel={traduire("Repos, {0}", fmtClock(left))}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, paddingRight: 10, paddingTop: 10, paddingBottom: 12 }}>
        {illus.stickers ? <Image source={illus.img('sablier')} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Ink size={12} weight="extraBold" color={pc.deep} numberOfLines={1}>{final ? traduire('Ça repart') : traduire('Repos')}</Ink>
          <Ink size={32} weight="black" color={final ? pc.deep : INK} style={{ fontVariant: ['tabular-nums'] }} numberOfLines={1}>{fmtClock(left)}</Ink>
        </View>
        {btn('15 s', traduire('Enlever 15 secondes de repos'), () => onAdd(-15), 'minus')}
        {btn('15 s', traduire('Ajouter 15 secondes de repos'), () => onAdd(15), 'plus')}
        {btn(traduire('Passer'), traduire('Passer le repos'), onSkip)}
      </View>
      {/* le temps qui reste, en barre sur toute la largeur */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, backgroundColor: 'rgba(29,32,41,0.06)' }}>
        <View style={{ width: `${Math.round(frac * 1000) / 10}%`, height: 5, backgroundColor: pc.main }} />
      </View>
    </View>
  );
}
