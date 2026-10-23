/**
 * « Personnaliser l'accueil » (vague 36) : une feuille pour montrer, cacher et reordonner les blocs
 * sous la carte Poids (Ta semaine, Ta forme du jour, Ton prochain rendez-vous, Le conseil du jour, Ton mois).
 * Le haut de l'accueil (scene, tes outils en raccourcis, Ton poids) reste fixe. Memorise dans AsyncStorage.
 * 16 octobre (Houari : « c'est grave caché ») : en bas de l'accueil, une carte « Personnalise ton accueil » avec
 * deux boutons : Tes blocs (la meme feuille qu'avant) et Tout personnaliser (l'ecran Personnaliser : scene,
 * personnage, courbes, widgets, icone). Elle est montree par la visite guidee (ancre accueil.personnaliser).
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BLOCS_ACCUEIL, DISPOSITION_DEFAUT, useDisposition } from '@/lib/v2/accueil/disposition';
import type { BlocAccueil } from '@/lib/v2/accueil/disposition';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { ROUTES_PERSONNALISER } from '@/lib/v2/personnaliser/acces';
import { Card, Icon, P, Press, useAccent } from './kit';
import { carteNeutre } from './domaines';
import { traduire } from '@/lib/i18n/tr';

function Fleche({ up, color }: { up: boolean; color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} stroke={color} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Petit({ onPress, label, disabled, children }: { onPress: () => void; label: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Press onPress={onPress} disabled={disabled} haptic="light" accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: P.line2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>{children}</View>
    </Press>
  );
}

/** La liste reglable, reutilisee par la feuille de l'accueil et par l'ecran Ton accueil des Reglages */
export function DispositionEditor() {
  const { disposition, changer } = useDisposition();
  const { accent } = useAccent();
  const { ordre, caches } = disposition;

  const move = (id: BlocAccueil, dir: -1 | 1) => {
    const i = ordre.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordre.length) return;
    const next = [...ordre];
    [next[i], next[j]] = [next[j], next[i]];
    changer({ ordre: next, caches });
  };
  const toggle = (id: BlocAccueil) => changer({ ordre, caches: caches.includes(id) ? caches.filter((c) => c !== id) : [...caches, id] });

  return (
    <View style={{ gap: 8 }}>
      {ordre.map((id, i) => {
        const b = BLOCS_ACCUEIL.find((x) => x.id === id);
        if (!b) return null;
        const on = !caches.includes(id);
        return (
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingLeft: 12, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
            <Pressable onPress={() => toggle(id)} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={`${b.titre}, ${on ? traduire('affiché') : traduire('caché')}`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
              <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: on ? accent : P.dashed, backgroundColor: on ? accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Icon name="check" size={14} color={P.white} width={3.2} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="black" tight color={on ? P.ink : P.muted}>
                  {b.titre}
                </Ink>
                <Ink size={12} weight="medium" color={P.muted} numberOfLines={2}>
                  {b.aide}
                </Ink>
              </View>
            </Pressable>
            <Petit onPress={() => move(id, -1)} disabled={i === 0} label={`Monter ${b.titre}`}>
              <Fleche up color={P.ink} />
            </Petit>
            <Petit onPress={() => move(id, 1)} disabled={i === ordre.length - 1} label={`Descendre ${b.titre}`}>
              <Fleche up={false} color={P.ink} />
            </Petit>
          </View>
        );
      })}
      <Press onPress={() => changer(DISPOSITION_DEFAUT)} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("Revenir à l’accueil de départ")}>
        <View style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
          <Ink size={14} weight="extraBold" color={accent}>
            {traduire("Revenir à l’accueil de départ")}</Ink>
        </View>
      </Press>
    </View>
  );
}

/** Le lien en bas de l'accueil et sa feuille */
export function PersonnaliserAccueil() {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { accent, accentTint } = useAccent();
  const { theme } = useYoroiTheme();
  const router = useRouter();
  return (
    <>
      <TourAnchor id="accueil.personnaliser">
        <Card style={[{ padding: 14, gap: 12, marginTop: 4 }, carteNeutre()]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: accentTint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="settings" size={20} color={accent} width={2.4} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={15.5} weight="black" tight>
                {traduire("Personnalise ton accueil")}</Ink>
              <Ink size={12.5} weight="medium" color={P.ink2} numberOfLines={2}>
                {traduire("Affiche ou cache tes blocs, comme tes pas, change ta scène et tes courbes")}</Ink>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Press onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={traduire("Tes blocs : montrer, cacher et ranger les blocs de l’accueil")}>
                <View style={{ minHeight: 44, borderRadius: 22, borderWidth: 1.5, borderColor: accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }}>
                  <Ink size={14} weight="extraBold" color={accent} numberOfLines={1}>
                    {traduire("Tes blocs")}</Ink>
                </View>
              </Press>
            </View>
            <View style={{ flex: 1.3 }}>
              <Press onPress={() => router.push(ROUTES_PERSONNALISER.personnaliser as any)} accessibilityRole="button" accessibilityLabel={traduire("Tout personnaliser : scène, personnage, courbes, widgets et icône")}>
                <View style={{ minHeight: 44, borderRadius: 22, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }}>
                  <Ink size={14} weight="extraBold" color={theme.colors.onAccent} numberOfLines={1}>
                    {traduire("Tout personnaliser")}</Ink>
                </View>
              </Press>
            </View>
          </View>
        </Card>
      </TourAnchor>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(16,19,27,0.45)', justifyContent: 'flex-end' }} accessibilityLabel={traduire("Fermer")}>
          <Pressable onPress={() => {}} style={{ backgroundColor: P.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, maxHeight: '88%' }}>
            <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: P.line, marginBottom: 6 }} />
            <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Ink size={22} weight="black" tight accessibilityRole="header">
                  {traduire("Ton accueil")}</Ink>
                <Press onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} hitSlop={8}>
                  <View style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Ink size={15} weight="extraBold" color={accent}>
                      OK
                    </Ink>
                  </View>
                </Press>
              </View>
              <Ink size={13} weight="medium" color={P.ink2}>
                {traduire("Tes outils et Ton poids restent en haut. Décoche un bloc pour le cacher, coche-le pour le retrouver, range-le avec les flèches.")}</Ink>
              <DispositionEditor />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
