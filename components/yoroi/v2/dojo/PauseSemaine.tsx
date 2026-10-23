/**
 * Vague 47 : la pause de la semaine, refaite pour etre comprise du premier coup.
 * Un bouton clair dans la carte des semaines, puis une feuille avec trois grands choix
 * (repos, blessure, maladie). En pause : un bandeau qui dit ce qui se passe et un bouton pour reprendre.
 */
import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/dojo/parts';
import type { PauseKind } from '@/lib/v2/armure';

type Icone = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const CHOIX: { kind: PauseKind; titre: string; texte: string; icone: Icone }[] = [
  { kind: 'repos', titre: 'Repos', texte: 'Vacances, semaine chargée, besoin de souffler', icone: 'sofa-outline' },
  { kind: 'blessure', titre: 'Blessé', texte: 'Tu te soignes, tu reviens plus fort', icone: 'bandage' },
  { kind: 'malade', titre: 'Malade', texte: 'Repose-toi, ta série t’attend', icone: 'thermometer' },
];

export const PAUSE_TEXTE: Record<PauseKind, string> = { repos: 'repos', blessure: 'blessure', malade: 'maladie' };

/** Bouton de la carte : mettre en pause, ou bandeau « en pause » avec Reprendre */
export function BoutonPause({ pause, onPause, onReprendre }: { pause: PauseKind | null; onPause: () => void; onReprendre: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (pause) {
    return (
      <View style={{ borderRadius: 16, backgroundColor: c.goldTint, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MaterialCommunityIcons name="pause-circle" size={26} color={c.goldDeep} />
          <View style={{ flex: 1 }}>
            <Ink size={15} weight="extraBold">{`Semaine en pause : ${PAUSE_TEXTE[pause]}`}</Ink>
            <Ink size={13} color={c.textSecondary}>Ta série est gelée. Elle ne casse pas cette semaine.</Ink>
          </View>
        </View>
        <Pressable
          onPress={() => {
            tap();
            onReprendre();
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({ minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.surface, borderWidth: 1, borderColor: c.border })}
        >
          <Ink size={14} weight="extraBold" color={c.accent}>Reprendre ma semaine</Ink>
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => {
        tap();
        onPause();
      }}
      accessibilityRole="button"
      accessibilityLabel="Mettre ma semaine en pause, en cas de repos, blessure ou maladie"
      style={({ pressed }) => ({ minHeight: 56, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSubtle : c.fillSoft })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="pause" size={20} color={c.goldDeep} />
      </View>
      <View style={{ flex: 1 }}>
        <Ink size={15} weight="extraBold">Pause cette semaine</Ink>
        <Ink size={12} color={c.textSecondary}>Repos, blessure ou maladie : ta série ne casse pas</Ink>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={c.textMuted} />
    </Pressable>
  );
}

/** Feuille des trois choix */
export function FeuillePause({ visible, onChoisir, onClose }: { visible: boolean; onChoisir: (k: PauseKind) => void; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(16,19,27,0.45)', justifyContent: 'flex-end' }} accessibilityLabel="Fermer">
        <Pressable onPress={() => {}} style={{ backgroundColor: c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 18, gap: 14 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border }} />
          <View style={{ gap: 4 }}>
            <Ink size={22} weight="black" tight accessibilityRole="header">Pause cette semaine</Ink>
            <Ink size={14} color={c.textSecondary}>Ta série est gelée : elle ne casse pas et n’avance pas. Tu reprends quand tu veux.</Ink>
          </View>
          {CHOIX.map((ch) => (
            <Pressable
              key={ch.kind}
              onPress={() => {
                tap();
                onChoisir(ch.kind);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${ch.titre}. ${ch.texte}`}
              style={({ pressed }) => ({ minHeight: 64, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: pressed ? c.accentTint : c.surface, borderWidth: 1, borderColor: c.border })}
            >
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.goldTint, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={ch.icone} size={22} color={c.goldDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Ink size={16} weight="extraBold">{ch.titre}</Ink>
                <Ink size={13} color={c.textSecondary}>{ch.texte}</Ink>
              </View>
            </Pressable>
          ))}
          <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={15} weight="extraBold" color={c.textSecondary}>Annuler</Ink>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
