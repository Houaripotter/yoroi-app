/**
 * Premier lancement : « Retrouver tes données du {date} ? » (7 novembre 2026).
 * Montree sur le premier ecran de l'onboarding (Accroche) quand le telephone est vide et qu'une sauvegarde entiere
 * est dans le coffre iCloud de l'app (lib/v2/sauvegarde/retrouver.ts). Retrouver la remet ; Commencer a zero ferme
 * la carte, l'onboarding continue comme d'habitude. « J'ai déjà une sauvegarde » reste en haut de l'ecran.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { GUTTER, MainButton } from './ui';
import { traduire, LOCALE } from '@/lib/i18n/tr';

/** « mardi 4 novembre » (l'annee seulement si ce n'est pas l'annee en cours) */
export function dateOffre(ms: number, now = Date.now()): string {
  const d = new Date(ms);
  const autreAnnee = d.getFullYear() !== new Date(now).getFullYear();
  return d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', ...(autreAnnee ? { year: 'numeric' } : {}) });
}

export function OffreRetrouver({ modifiedAt, busy, onRetrouver, onZero }: { modifiedAt: number; busy: boolean; onRetrouver: () => void; onZero: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const illus = useIllustrations();
  const titre = traduire('Retrouver tes données du {0} ?', dateOffre(modifiedAt));
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(20,22,40,0.38)' }} accessibilityViewIsModal>
      <View style={{ backgroundColor: c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 22, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 18, gap: 14 }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Image source={illus.img('sauvegarde')} style={{ width: 84, height: 84 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Ink size={24} weight="black" tight style={{ textAlign: 'center', lineHeight: 29 }} accessibilityRole="header">{titre}</Ink>
          <Ink size={14} color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 20 }}>
            {traduire('Ta dernière sauvegarde YOROI est dans ton iCloud. Tes séances, tes pesées et ton Dojo reviennent sur ce téléphone.')}
          </Ink>
        </View>
        <MainButton label={traduire('Retrouver')} onPress={onRetrouver} loading={busy} />
        <Pressable onPress={busy ? undefined : onZero} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={15} weight="extraBold" color={c.textSecondary}>{traduire('Commencer à zéro')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}

export default OffreRetrouver;
