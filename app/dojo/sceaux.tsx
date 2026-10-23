/**
 * Les 41 sceaux, en 5 familles : regularite, force, combat, souffle, decouverte,
 * et la Lune du mois, le seul sceau qui se gagne plusieurs fois.
 * Gagnes en couleur, a gagner en pointille avec ta progression.
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { SealMedal } from '@/components/yoroi/v2/dojo/SealMedal';
import Animated from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { THEME_IMAGES } from '@/lib/v2/dojo/personnages';
import { conditionSceau, nomSceau, universDe } from '@/lib/v2/dojo/dojoAffichage';
import { BackHeader, Bar, formatDay, tap } from '@/components/yoroi/v2/dojo/parts';
import { LUNE, SEAL_FAMILIES, familyOf } from '@/lib/v2/dojo/seals';
import { Hanko } from '@/components/yoroi/v2/dojo/Hanko';
import type { SealView } from '@/lib/v2/armure';
import { XP_VALUES } from '@/lib/v2/armure';
import { useArmure } from '@/lib/v2/dojo/useArmure';
import { P } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export default function Sceaux() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { snap, espace } = useArmure();
  // vague 47 : la banniere suit ton univers
  const classique = universDe(espace) === 'classique';
  const [open, setOpen] = useState<SealView | null>(null);
  const seals = snap?.seals ?? [];
  const earned = seals.filter((s) => s.earned).length;
  const [filter, setFilter] = useState<string>('all');
  const lunes = snap?.state.lunes ?? 0;
  const latest = seals.filter((s) => s.earned).sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? '')).slice(0, 3);
  /** Couleur d'une famille de sceaux */
  const famColor = (id: string) => SEAL_FAMILIES.find((f) => f.id === id)?.color ?? c.accent;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        <BackHeader title={traduire("Tes sceaux")} scene={classique ? THEME_IMAGES.classique_salle_nuit : THEME_IMAGES.forge} subtitle={traduire("{0} XP chacun, aucun ne dépend de ton poids", XP_VALUES.sceau)} />

        <Animated.View entering={ENTREE} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 14, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <Ink size={50} weight="black" tight color={c.goldDeep}>{String(earned)}</Ink>
                <Ink size={15} weight="bold" color={c.textSecondary} style={{ marginBottom: 8, flexShrink: 1 }}>{traduirePluriel(earned, earned > 1, "sceau sur {0}", "sceaux sur {0}", seals.length || 41)}</Ink>
              </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {latest.map((x, i) => (
                <View key={x.id} style={{ marginLeft: i ? -14 : 0 }}>
                  <SealMedal id={x.id} color={familyOf(x.family).ink} size={52} />
                </View>
              ))}
            </View>
          </View>
          <Bar progress={seals.length ? earned / seals.length : 0} color={c.gold} />
          <Ink size={13} color={c.textSecondary}>{latest[0] ? traduire("Dernier gagné : {0}{1}", nomSceau(latest[0], (classique ? 'classique' : 'japon')), latest[0].earnedAt ? `, le ${formatDay(latest[0].earnedAt)}` : '') : traduire('Ton premier sceau t’attend. Appuie sur un sceau pour voir comment le gagner.')}</Ink>
        </Animated.View>

        <Animated.View entering={ENTREE} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16 }}>
          <Hanko size={56} shape="rond" color={c.indigo} earned={lunes > 0} tampon="lapin_lune" />
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={17} weight="black">{LUNE.name}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire("{0}. Il se gagne chaque mois, +{1} XP à chaque fois.", LUNE.condition, XP_VALUES.lune)}</Ink>
            <Ink size={14} weight="extraBold" color={lunes > 0 ? c.indigo : c.textMuted}>{lunes > 0 ? traduire("Gagnée {0} fois", lunes) : traduire('Pas encore gagnée')}</Ink>
          </View>
        </Animated.View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}>
          {([{ id: 'all', name: traduire('Tous') }, ...SEAL_FAMILIES] as { id: string; name: string }[]).map((f) => {
            const on = filter === f.id;
            const list = f.id === 'all' ? seals : seals.filter((x) => x.family === f.id);
            return (
              <Pressable
                key={f.id}
                onPress={() => {
                  tap();
                  setFilter(f.id);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: on ? c.ink : pressed ? c.fillSoft : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border })}
              >
                {f.id !== 'all' ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: famColor(f.id) }} /> : null}
                <Ink size={14} weight="extraBold" color={on ? P.paper : c.ink}>{f.name}</Ink>
                <Ink size={12} weight="bold" color={on ? P.paper : c.textMuted} style={on ? { opacity: 0.75 } : undefined}>{`${list.filter((x) => x.earned).length}/${list.length}`}</Ink>
              </Pressable>
            );
          })}
        </ScrollView>

        {SEAL_FAMILIES.filter((f) => filter === 'all' || f.id === filter).map((f) => {
          const list = seals.filter((s) => s.family === f.id);
          return (
            <View key={f.id} style={{ backgroundColor: P.white, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 14 }}>
              <View style={{ gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: famColor(f.id) }} />
                  <Ink size={17} weight="black" style={{ flex: 1 }}>{f.name}</Ink>
                  <Ink size={13} weight="bold" color={c.textMuted}>{list.filter((s) => s.earned).length} / {list.length}</Ink>
                </View>
                <Ink size={13} color={c.textSecondary}>{f.description}</Ink>
              </View>
              {/* 3 colonnes reelles : largeurs en pourcentage, rien ne deborde a droite */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, rowGap: 6 }}>
                {list.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      tap();
                      setOpen(s);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${nomSceau(s, (classique ? 'classique' : 'japon'))}, ${s.earned ? traduire('gagné') : traduire("à gagner, {0} sur {1}", s.current, s.target)}`}
                    style={({ pressed }) => ({ width: '33.333%', paddingHorizontal: 4, minHeight: 128, alignItems: 'center', gap: 6, paddingVertical: 8, borderRadius: 16, backgroundColor: pressed ? c.fillSoft : 'transparent' })}
                  >
                    <SealMedal id={s.id} color={f.ink} size={66} earned={s.earned} />
                    <Ink size={12} weight="bold" color={s.earned ? c.ink : c.textMuted} style={{ textAlign: 'center' }} numberOfLines={2}>{nomSceau(s, (classique ? 'classique' : 'japon'))}</Ink>
                    {s.earned ? null : s.target > 1 ? (
                      <View style={{ alignSelf: 'stretch', paddingHorizontal: 10, gap: 3 }}>
                        <Bar progress={s.current / s.target} color={famColor(f.id)} height={4} />
                        <Ink size={10} color={c.textMuted} style={{ textAlign: 'center' }}>{s.current} / {s.target}</Ink>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable onPress={() => setOpen(null)} accessibilityLabel={traduire("Fermer")} style={{ flex: 1, backgroundColor: 'rgba(20,22,30,0.55)', justifyContent: 'flex-end' }}>
          {open ? (
            <Pressable onPress={() => undefined} style={{ backgroundColor: c.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 22, alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 10 }} />
              <SealMedal id={open.id} color={SEAL_FAMILIES.find((f) => f.id === open.family)?.ink} size={130} earned={open.earned} />
              <Ink size={24} weight="black" tight style={{ marginTop: 6 }}>{nomSceau(open, (classique ? 'classique' : 'japon'))}</Ink>
              <Ink size={15} color={c.textSecondary} style={{ textAlign: 'center' }}>{conditionSceau(open.condition, (classique ? 'classique' : 'japon'))}</Ink>
              {open.earned ? (
                <Ink size={14} weight="bold" color={c.successText}>{traduire("Gagné le {0}, +{1} XP", formatDay(open.earnedAt ?? ''), XP_VALUES.sceau)}</Ink>
              ) : (
                <View style={{ alignSelf: 'stretch', gap: 6, marginTop: 4 }}>
                  <Bar progress={open.current / open.target} color={famColor(open.family)} />
                  <Ink size={14} weight="bold" color={c.textSecondary} style={{ textAlign: 'center' }}>
                    {traduire("{0}, +{1} XP à la clé", open.target > 1 ? `${open.current} sur ${open.target}` : 'Pas encore', XP_VALUES.sceau)}
                  </Ink>
                </View>
              )}
              <Pressable
                onPress={() => {
                  tap();
                  setOpen(null);
                }}
                accessibilityRole="button"
                style={({ pressed }) => ({ alignSelf: 'stretch', minHeight: 56, borderRadius: 18, marginTop: 10, backgroundColor: pressed ? c.fillSoft : c.fillSubtle, alignItems: 'center', justifyContent: 'center' })}
              >
                <Ink size={16} weight="extraBold">{traduire("Fermer")}</Ink>
              </Pressable>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
