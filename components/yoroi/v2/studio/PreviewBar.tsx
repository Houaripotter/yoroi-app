/**
 * Barre d'apercu de l'onboarding (Studio, mode createur seulement), pour passer d'un ecran a l'autre
 * sans rien enregistrer. La grille de tous les ecrans s'ouvre a la demande, et la pastille peut se masquer
 * pour contempler l'ecran en entier (un petit point la fait revenir).
 * Vague 30 : elle ne passe plus jamais sur les titres. Les ecrans qui ont une barre du haut (Shell, Accroche)
 * la prennent a la place de leur barre de progression (ApercuDansBarre) ; les autres (preparation, Premium)
 * la gardent flottante et compacte, en haut entre leurs boutons (sur le paywall, a la place de la mention « Apercu, sans achat »).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { traduire } from '@/lib/i18n/tr';

// Vague 45 : « Ton univers » apres Toi
export const ONBOARDING_SCREEN_LABELS = ['Accroche', traduire('Prénom'), traduire('Toi'), traduire('Ton univers'), traduire('Objectif'), traduire('Ce qui te freine'), 'Affirmation', traduire('Sports'), 'Apple Santé', traduire('Poids du jour'), 'Taille', 'Cap', traduire('Rythme'), traduire('Moment de la pesée'), traduire('Démonstration'), traduire('Tout au même endroit'), traduire('Préparation'), traduire('Ton plan'), traduire('Premium')];
const COUNT = ONBOARDING_SCREEN_LABELS.length;
const LAST = COUNT - 1;
const GLASS = 'rgba(29,32,41,0.86)';

type Apercu = {
  page: number;
  onGo: (p: number) => void;
  onClose: () => void;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  openGrid: () => void;
  /** un ecran avec barre du haut prend la pastille : la version flottante se retire */
  claim: () => () => void;
};

const ApercuContext = createContext<Apercu | null>(null);

/** Pour les ecrans : null hors apercu du Studio */
export function useApercu(): Apercu | null {
  return useContext(ApercuContext);
}

const tapIt = (fn: () => void) => () => {
  selectionAsync().catch(() => {});
  fn();
};

/** La pastille : precedent, ecran courant (ouvre la grille), suivant, masquer, et fermer si demande */
function Pastille({ a, compact, withClose }: { a: Apercu; compact?: boolean; withClose?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const btn = { width: compact ? 28 : 32, height: compact ? 30 : 32, borderRadius: 16, alignItems: 'center' as const, justifyContent: 'center' as const };
  const label = `${a.page + 1}/${COUNT} ${ONBOARDING_SCREEN_LABELS[a.page] ?? ''}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3, height: compact ? 36 : 40, borderRadius: 20, backgroundColor: GLASS, maxWidth: '100%', flexShrink: 1 }}>
      <Pressable onPress={tapIt(() => a.onGo(Math.max(0, a.page - 1)))} disabled={a.page === 0} accessibilityRole="button" accessibilityLabel={traduire("Écran précédent")} style={[btn, { opacity: a.page === 0 ? 0.35 : 1 }]}>
        <Icon name="back" size={14} color={c.onDark} />
      </Pressable>
      <Pressable onPress={tapIt(a.openGrid)} accessibilityRole="button" accessibilityLabel={traduire("Aperçu, choisir un écran, {0}", label)} style={{ paddingHorizontal: 2, height: 32, justifyContent: 'center', flexShrink: 1 }}>
        <Ink size={compact ? 11 : 12} weight="extraBold" color={c.onDark} numberOfLines={1}>{label}</Ink>
      </Pressable>
      <Pressable onPress={tapIt(() => a.onGo(Math.min(LAST, a.page + 1)))} disabled={a.page === LAST} accessibilityRole="button" accessibilityLabel={traduire("Écran suivant")} style={[btn, { opacity: a.page === LAST ? 0.35 : 1 }]}>
        <Icon name="chevron" size={14} color={c.onDark} />
      </Pressable>
      <View style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 1 }} />
      <Pressable onPress={tapIt(() => a.setHidden(true))} accessibilityRole="button" accessibilityLabel={traduire("Masquer la barre pour voir tout l’écran")} style={btn}>
        <Icon name="eye" size={14} color={c.onDark} />
      </Pressable>
      {withClose ? (
        <Pressable onPress={tapIt(a.onClose)} accessibilityRole="button" accessibilityLabel={traduire("Fermer l’aperçu")} style={btn}>
          <Icon name="close" size={14} color={c.onDark} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Dans la barre du haut d'un ecran, a la place de la barre de progression.
 * Rend null hors apercu ou quand la pastille est masquee : l'ecran remet alors sa barre de progression.
 */
export function ApercuDansBarre() {
  const a = useApercu();
  const claim = a?.claim;
  useEffect(() => (claim ? claim() : undefined), [claim]);
  if (!a || a.hidden) return null;
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
      <Pastille a={a} compact />
    </View>
  );
}

/** true quand la pastille doit remplacer la barre de progression */
export function useApercuVisible(): boolean {
  const a = useApercu();
  return !!a && !a.hidden;
}

/**
 * Fournisseur de l'apercu, autour des ecrans. enabled false : rien n'est rendu en plus.
 * La pastille flottante n'apparait que sur les ecrans sans barre du haut.
 */
export function PreviewBar({ enabled = true, page, onGo, onClose, children }: { enabled?: boolean; page: number; onGo: (p: number) => void; onClose: () => void; children?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(false);
  const [grid, setGrid] = useState(false);
  const [claims, setClaims] = useState(0);
  const claim = useCallback(() => {
    setClaims((n) => n + 1);
    return () => setClaims((n) => Math.max(0, n - 1));
  }, []);
  const openGrid = useCallback(() => setGrid(true), []);
  const value = useMemo<Apercu>(() => ({ page, onGo, onClose, hidden, setHidden, openGrid, claim }), [page, onGo, onClose, hidden, openGrid, claim]);

  if (!enabled) return <>{children}</>;

  const btn = { width: 32, height: 32, borderRadius: 16, alignItems: 'center' as const, justifyContent: 'center' as const };

  return (
    <ApercuContext.Provider value={value}>
      {children}
      {hidden ? (
        <Pressable
          onPress={tapIt(() => setHidden(false))}
          accessibilityRole="button"
          accessibilityLabel={traduire("Montrer la barre d’aperçu")}
          hitSlop={14}
          style={{ position: 'absolute', right: 6, top: insets.top + 64, width: 14, height: 14, borderRadius: 7, backgroundColor: c.accent, opacity: 0.75 }}
        />
      ) : claims === 0 ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 60, right: 108, top: insets.top + 8, alignItems: 'center' }}>
          <Pastille a={value} compact />
        </View>
      ) : null}

      <Modal visible={grid} transparent animationType="fade" onRequestClose={() => setGrid(false)}>
        <Pressable onPress={() => setGrid(false)} style={{ flex: 1, backgroundColor: 'rgba(29,32,41,0.45)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 16, maxHeight: '75%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ink size={18} weight="black" style={{ flex: 1 }}>{traduire("Aller à un écran")}</Ink>
              <Pressable onPress={tapIt(() => setGrid(false))} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} style={[btn, { backgroundColor: c.fillSoft }]}>
                <Icon name="close" size={15} color={c.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 6 }}>
              {ONBOARDING_SCREEN_LABELS.map((label, i) => {
                const on = i === page;
                return (
                  <Pressable
                    key={label}
                    onPress={tapIt(() => {
                      setGrid(false);
                      onGo(i);
                    })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: on ? c.accent : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.border }}
                  >
                    <Ink size={14} weight="black" color={on ? '#FFFFFF' : c.textMuted} style={{ width: 22 }}>{String(i + 1)}</Ink>
                    <Ink size={15} weight="bold" color={on ? '#FFFFFF' : c.ink}>{label}</Ink>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ApercuContext.Provider>
  );
}

export default PreviewBar;
