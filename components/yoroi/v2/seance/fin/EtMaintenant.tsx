/**
 * « Et maintenant ? » (24 octobre 2026) : une raison de revenir. Le prochain jour de ton programme,
 * sinon ton prochain creneau du planning, sinon l'idee de creneau tiree de tes habitudes,
 * sinon une invitation a poser ta semaine. Une seule carte, appuyable.
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import { getWeeklyPlan } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { chargerProgrammeActif, prochainJour } from '@/lib/v2/programmes/suivi';
import { motApresSeance } from '@/lib/v2/programmes/coach';
import { sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { sportImage, sportTint } from '@/lib/v2/seance/sportVisuals';
import { PLAN_DAYS } from '@/lib/v2/seances/sessionData';
import { findNextSlot } from '@/components/yoroi/v2/seances/NextUp';
import type { NextSlot } from '@/components/yoroi/v2/seances/NextUp';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { LANG, traduire } from '@/lib/i18n/tr';

/** cri : le mot du coach après une séance du programme (lib/v2/programmes/coach.ts) */
type Suite = { titre: string; sous: string | null; sport: string; action: string; href: string; cri?: string };

function quand(n: NextSlot): string {
  const nom = PLAN_DAYS[n.slot.day_of_week] ?? '';
  const jour = n.dayOffset === 0 ? traduire('Aujourd’hui') : n.dayOffset === 1 ? traduire('Demain') : nom.charAt(0).toUpperCase() + nom.slice(1);
  return n.slot.time ? traduire("{0} à {1}", jour, LANG === 'fr' ? n.slot.time.slice(0, 5).replace(':', ' h ') : n.slot.time.slice(0, 5)) : jour;
}

export function EtMaintenant({
  femme,
  anime,
  idee,
  onOuvrir,
}: {
  femme: boolean;
  anime: boolean;
  /** l'idee de creneau de la fin de seance (texte, bouton), quand il n'y a rien de prevu */
  idee: { texte: string; action: string | null; onPress: () => void } | null;
  onOuvrir: (href: string) => void;
}) {
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const [suite, setSuite] = useState<Suite | null>(null);
  const [lu, setLu] = useState(false);

  useEffect(() => {
    let vivant = true;
    (async () => {
      let prochain: NextSlot | null = null;
      try {
        prochain = findNextSlot((await getWeeklyPlan()) ?? [], true);
      } catch {
        prochain = null;
      }
      let s: Suite | null = null;
      try {
        const a = await chargerProgrammeActif();
        const p = a ? prochainJour(a) : null;
        if (p) {
          s = {
            titre: traduire('Jour {0}, {1}', p.index + 1, traduire(p.jour.titre)),
            sous: prochain ? `${traduire(p.programme.titre)}. ${quand(prochain)}` : traduire(p.programme.titre),
            sport: sportDuProgramme(p.programme),
            action: traduire('Voir mon programme'),
            href: '/programmes',
            cri: a ? motApresSeance(a.faits.filter((f) => f.date >= a.debut).length, femme) : undefined,
          };
        }
      } catch {
        s = null;
      }
      if (!s && prochain) {
        const sl = prochain.slot;
        s = {
          titre: sl.label?.trim() || getSportName(sl.sport),
          sous: quand(prochain),
          sport: String(sl.sport || '').split(',')[0].trim(),
          action: traduire('Voir mon planning'),
          href: '/planning',
        };
      }
      if (vivant) {
        setSuite(s);
        setLu(true);
      }
    })();
    return () => {
      vivant = false;
    };
  }, [femme]);

  if (!lu) return null;

  const entree = anime ? FadeInDown.delay(520).duration(380) : undefined;
  const titreBloc = (
    <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }} accessibilityRole="header">
      {traduire('Et maintenant ?')}
    </Ink>
  );

  if (suite) {
    const img = suite.sport ? sportImage(suite.sport, femme, 1) : null;
    return (
      <Animated.View entering={entree} style={{ marginHorizontal: 22, marginTop: 18, gap: 8 }}>
        {titreBloc}
        {suite.cri ? (
          <View style={{ borderRadius: 18, padding: 14, backgroundColor: c.darkCard }}>
            <Ink size={15} weight="extraBold" color={c.onDark} style={{ lineHeight: 21 }}>{suite.cri}</Ink>
          </View>
        ) : null}
        <Pressable
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
            onOuvrir(suite.href);
          }}
          accessibilityRole="button"
          accessibilityLabel={traduire("Ta prochaine séance : {0}. {1}", suite.titre, suite.sous ?? '')}
          accessibilityHint={suite.action}
          style={({ pressed }) => ({
            borderRadius: 22,
            minHeight: 132,
            padding: 16,
            overflow: 'hidden',
            backgroundColor: isDark ? c.surface : c.accentTint,
            borderWidth: 1,
            borderColor: isDark ? c.border : 'transparent',
            transform: [{ scale: pressed ? 0.985 : 1 }],
          })}
        >
          {img ? (
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', right: 12, top: 14, width: 96, height: 96, borderRadius: 48, backgroundColor: isDark ? c.fillSoft : sportTint(suite.sport), overflow: 'hidden' }}>
              <Image source={img} resizeMode="contain" style={{ width: 96, height: 112, marginTop: 4 }} />
            </View>
          ) : null}
          <View style={{ gap: 4, paddingRight: img ? 108 : 0 }}>
            <Ink size={12} weight="extraBold" color={c.accent} style={{ letterSpacing: 0.4, textTransform: 'uppercase' }}>{traduire('Ta prochaine séance')}</Ink>
            <Ink size={20} weight="black" tight numberOfLines={2}>{suite.titre}</Ink>
            {suite.sous ? <Ink size={14} weight="bold" color={c.textSecondary} numberOfLines={2}>{suite.sous}</Ink> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
            <Ink size={15} weight="extraBold" color={c.accent}>{suite.action}</Ink>
            <Icon name="chevron" size={16} color={c.accent} strokeWidth={2.6} />
          </View>
        </Pressable>
        {idee ? (
          <View style={{ borderRadius: 22, paddingTop: 12, paddingBottom: idee.action ? 2 : 12, paddingHorizontal: 16, backgroundColor: c.indigoTint }}>
            <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{idee.texte}</Ink>
            {idee.action ? (
              <Pressable onPress={idee.onPress} accessibilityRole="button" accessibilityLabel={idee.action} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
                <Ink size={14} weight="extraBold" color={c.indigo}>{idee.action}</Ink>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={entree} style={{ marginHorizontal: 22, marginTop: 18, gap: 8 }}>
      {titreBloc}
      <View style={{ borderRadius: 22, padding: 16, backgroundColor: isDark ? c.surface : c.accentTint, borderWidth: isDark ? 1 : 0, borderColor: c.border, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="calendar" size={18} color={c.accent} strokeWidth={2.4} />
          </View>
          <Ink size={17} weight="black" tight style={{ flex: 1 }}>{traduire('Garde le rythme')}</Ink>
        </View>
        <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>
          {idee ? idee.texte : traduire('Pose ta prochaine séance dans ton planning : elle t’attendra.')}
        </Ink>
        {idee ? (
          idee.action ? (
            <Pressable onPress={idee.onPress} accessibilityRole="button" accessibilityLabel={idee.action} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
              <Ink size={15} weight="extraBold" color={c.accent}>{idee.action}</Ink>
            </Pressable>
          ) : null
        ) : (
          <Pressable onPress={() => onOuvrir('/planning')} accessibilityRole="button" accessibilityLabel={traduire('Ouvrir mon planning')} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Ink size={15} weight="extraBold" color={c.accent}>{traduire('Ouvrir mon planning')}</Ink>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
