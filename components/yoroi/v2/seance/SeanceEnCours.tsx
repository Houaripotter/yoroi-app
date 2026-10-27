/**
 * « Séance en cours », au dessus de la barre d'onglets (24 octobre 2026) : tu as réduit ta séance ou tu es
 * passé sur l'accueil, elle reste visible partout, avec le chrono, l'exercice et la série. Un toucher la reprend.
 * Houari : « il faut qu'on voie qu'une séance est en cours ». Lit le brouillon (lib/v2/seance/model.ts).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import { blancA } from '@/components/yoroi/livePalette';
import { loadDraft } from '@/lib/v2/seance/model';
import type { SeanceDraft } from '@/lib/v2/seance/model';
import { draftRoute, draftTitle } from '@/lib/v2/seance/resume';
import { fmtClock } from '@/lib/v2/seance/format';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { traduire } from '@/lib/i18n/tr';

/** Ce qu'on montre sous le titre : l'exercice et la série en cours (musculation), sinon rien */
export function ligneEnCours(d: SeanceDraft): string {
  if (d.kind !== 'muscu') return '';
  const cur = d.exercises.find((e) => e.id === d.currentId) ?? d.exercises[0];
  if (!cur) return traduire('Choisis ton premier exercice');
  const i = cur.sets.findIndex((s) => !s.done);
  const nom = traduire(nomFr(cur.name));
  return i >= 0 ? traduire('{0}, série {1} sur {2}', nom, i + 1, cur.sets.length) : traduire('{0}, bouclé', nom);
}

export function SeanceEnCours() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<SeanceDraft | null>(null);
  const [now, setNow] = useState(Date.now());

  const lire = useCallback(() => {
    loadDraft()
      .then((d) => setDraft(d && !d.form ? d : null))
      .catch(() => setDraft(null));
  }, []);

  // a chaque changement d'onglet et au retour dans l'app
  useEffect(() => {
    lire();
  }, [lire, pathname]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') lire();
    });
    return () => sub.remove();
  }, [lire]);
  // le chrono avance chaque seconde, seulement quand la barre est visible
  useEffect(() => {
    if (!draft) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [draft]);

  const pouls = useSharedValue(1);
  // le point pulse seulement quand la barre est visible
  const visible = !!draft;
  useEffect(() => {
    if (!visible) return;
    pouls.value = withRepeat(withTiming(0.35, { duration: 900 }), -1, true);
    return () => cancelAnimation(pouls);
  }, [pouls, visible]);
  const point = useAnimatedStyle(() => ({ opacity: pouls.value }));

  if (!draft) return null;
  const finRepos = draft.kind === 'muscu' ? draft.restEndsAt : null;
  const repos = finRepos && finRepos > now ? Math.ceil((finRepos - now) / 1000) : 0;
  const sous = repos > 0 ? traduire('Repos, {0}', fmtClock(repos)) : ligneEnCours(draft);
  const ouvrir = () => router.push({ pathname: draftRoute(draft) as any, params: { resume: '1' } });

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom - 8, 0) + 14 + 64 + 10 }}>
      <Pressable
        onPress={ouvrir}
        accessibilityRole="button"
        accessibilityLabel={traduire('Séance en cours : {0}, {1}. Toucher pour reprendre', traduire(draftTitle(draft)), fmtClock(Math.floor((now - draft.startedAt) / 1000)))}
        style={({ pressed }) => ({
          marginHorizontal: 16,
          minHeight: 62,
          borderRadius: 20,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: pressed ? c.primaryPressed : c.primary,
          shadowColor: c.shadow,
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        })}
      >
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: blancA(0.75), alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.detail }, point]} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ink size={12} weight="extraBold" color={c.onPrimary} style={{ opacity: 0.8 }}>{traduire('SÉANCE EN COURS')}</Ink>
            <Ink size={14} weight="black" color={c.onPrimary} style={{ fontVariant: ['tabular-nums'] }}>{fmtClock(Math.floor((now - draft.startedAt) / 1000))}</Ink>
          </View>
          <Ink size={15} weight="black" color={c.onPrimary} numberOfLines={1}>{sous || traduire(draftTitle(draft))}</Ink>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ink size={13} weight="extraBold" color={c.onPrimary}>{traduire('Reprendre')}</Ink>
          <Icon name="chevron" size={16} color={c.onPrimary} />
        </View>
      </Pressable>
    </View>
  );
}
