/**
 * Feuille de l'eau (vague 37). Houari : « on ne peut que mettre de l'eau et pas en enlever, c'est nul ».
 * La tuile Eau de « Ta forme du jour » l'ouvre : la quantite du jour en grand, ajouter (+250, +500, +1 L) ET
 * retirer (−250, −500), « Remettre à zéro » avec confirmation dans la feuille, et le lien vers le detail.
 * Meme source que la page Hydratation (saveHydrationAmount de lib/v2/accueil/hydration.ts) : retirer enleve
 * vraiment de la base, jamais sous zero.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { formatLiters, saveHydrationAmount } from '@/lib/v2/accueil/hydration';
import { Icon, P, Press, tap, useAccent } from './kit';

const AJOUTS = [0.25, 0.5, 1];
const RETRAITS = [0.25, 0.5];
const etiquette = (l: number, signe: '+' | '−') => `${signe}${l >= 1 ? `${formatLiters(l)} L` : `${Math.round(l * 1000)}`}`;
const dit = (l: number) => (l >= 1 ? 'un litre' : `${Math.round(l * 1000)} millilitres`);

/** Nouvelle quantite, au millilitre, jamais sous zero ni au-dessus de 15 litres */
export function eauApres(avant: number, delta: number): number {
  return Math.min(15, Math.max(0, Math.round((avant + delta) * 1000) / 1000));
}

export function FeuilleEau({ visible, onClose, water, waterGoal }: { visible: boolean; onClose: () => void; water: number; waterGoal: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { accent } = useAccent();
  const [shown, setShown] = useState(water);
  const shownRef = useRef(water);
  const [confirme, setConfirme] = useState(false);

  useEffect(() => {
    shownRef.current = water;
    setShown(water);
  }, [water]);
  useEffect(() => {
    if (!visible) setConfirme(false);
  }, [visible]);

  const changer = (next: number) => {
    const before = shownRef.current;
    if (next === before) return;
    shownRef.current = next;
    setShown(next);
    tap(next > before && before < waterGoal && next >= waterGoal ? 'success' : next < before ? 'medium' : 'light');
    saveHydrationAmount(next, waterGoal).catch(() => {});
  };

  const reached = waterGoal > 0 && shown >= waterGoal;
  const ratio = waterGoal > 0 ? Math.min(1, shown / waterGoal) : 0;
  const vide = shown <= 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(16,19,27,0.45)', justifyContent: 'flex-end' }} accessibilityLabel="Fermer">
        <Pressable onPress={() => {}} style={{ backgroundColor: P.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 18, gap: 16 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: P.line }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ink size={22} weight="black" tight accessibilityRole="header">
              Ton eau du jour
            </Ink>
            <Press onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={8}>
              <View style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 }}>
                <Ink size={15} weight="extraBold" color={accent}>
                  OK
                </Ink>
              </View>
            </Press>
          </View>

          {/* la quantite du jour en grand */}
          <View style={{ gap: 8 }} accessible accessibilityLabel={`${formatLiters(shown)} litre sur ${formatLiters(waterGoal)} aujourd’hui`}>
            <Ink size={46} weight="black" tight color={reached ? P.mossText : P.water} style={{ fontVariant: ['tabular-nums'] }}>
              {`${formatLiters(shown)} L`}
              <Ink size={17} weight="bold" color={P.muted}>
                {` sur ${formatLiters(waterGoal)} L`}
              </Ink>
            </Ink>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: P.line2, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(ratio * 100)}%`, height: 8, borderRadius: 4, backgroundColor: reached ? P.moss : P.water }} />
            </View>
            <Ink size={13} weight="bold" color={reached ? P.mossText : P.ink2}>
              {reached ? 'Objectif atteint' : `encore ${formatLiters(Math.max(0, waterGoal - shown))} L`}
            </Ink>
          </View>

          {/* ajouter */}
          <View style={{ gap: 8 }}>
            <Ink size={13} weight="extraBold" color={P.ink2}>
              Ajouter
            </Ink>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {AJOUTS.map((l) => (
                <View key={`a${l}`} style={{ flex: 1 }}>
                  <Press onPress={() => changer(eauApres(shownRef.current, l))} haptic="none" accessibilityRole="button" accessibilityLabel={`Ajouter ${dit(l)} d’eau`}>
                    <View style={{ height: 54, borderRadius: 16, backgroundColor: P.water, alignItems: 'center', justifyContent: 'center' }}>
                      <Ink size={16} weight="black" color={P.pureWhite} numberOfLines={1}>
                        {l >= 1 ? '+1 L' : `${etiquette(l, '+')} ml`}
                      </Ink>
                    </View>
                  </Press>
                </View>
              ))}
            </View>
          </View>

          {/* retirer */}
          <View style={{ gap: 8 }}>
            <Ink size={13} weight="extraBold" color={P.ink2}>
              Retirer
            </Ink>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {RETRAITS.map((l) => (
                <View key={`r${l}`} style={{ flex: 1 }}>
                  <Press onPress={() => changer(eauApres(shownRef.current, -l))} disabled={vide} haptic="none" accessibilityRole="button" accessibilityLabel={`Retirer ${dit(l)} d’eau`} accessibilityState={{ disabled: vide }}>
                    <View style={{ height: 50, borderRadius: 16, backgroundColor: P.white, borderWidth: 1.5, borderColor: P.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: vide ? 0.4 : 1 }}>
                      <Icon name="minus" size={16} color={P.water} width={2.8} />
                      <Ink size={15} weight="black" color={P.water} numberOfLines={1}>
                        {`${Math.round(l * 1000)} ml`}
                      </Ink>
                    </View>
                  </Press>
                </View>
              ))}
            </View>
          </View>

          {/* remettre a zero, avec confirmation dans la feuille */}
          {confirme ? (
            <View style={{ gap: 10, padding: 14, borderRadius: 18, backgroundColor: P.dangerSoft }}>
              <Ink size={14} weight="extraBold" color={P.ink}>
                {`Remettre ton eau du jour à zéro ? Les ${formatLiters(shown)} L d’aujourd’hui seront effacés.`}
              </Ink>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Press onPress={() => setConfirme(false)} accessibilityRole="button" accessibilityLabel="Annuler">
                    <View style={{ height: 46, borderRadius: 14, backgroundColor: P.white, borderWidth: 1, borderColor: P.line, alignItems: 'center', justifyContent: 'center' }}>
                      <Ink size={14} weight="extraBold" color={P.ink}>
                        Annuler
                      </Ink>
                    </View>
                  </Press>
                </View>
                <View style={{ flex: 1 }}>
                  <Press
                    onPress={() => {
                      changer(0);
                      setConfirme(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Oui, remettre à zéro"
                  >
                    <View style={{ height: 46, borderRadius: 14, backgroundColor: P.danger, alignItems: 'center', justifyContent: 'center' }}>
                      <Ink size={14} weight="extraBold" color={P.pureWhite} numberOfLines={1}>
                        Remettre à zéro
                      </Ink>
                    </View>
                  </Press>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Press onPress={() => setConfirme(true)} disabled={vide} haptic="none" accessibilityRole="button" accessibilityLabel="Remettre l’eau du jour à zéro" accessibilityState={{ disabled: vide }}>
                <View style={{ minHeight: 44, justifyContent: 'center', opacity: vide ? 0.4 : 1 }}>
                  <Ink size={14} weight="extraBold" color={P.danger}>
                    Remettre à zéro
                  </Ink>
                </View>
              </Press>
              <Press
                onPress={() => {
                  onClose();
                  router.push('/hydration' as any);
                }}
                accessibilityRole="button"
                accessibilityLabel="Voir ton eau en détail"
              >
                <View style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Ink size={14} weight="extraBold" color={accent}>
                    Voir le détail
                  </Ink>
                </View>
              </Press>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
