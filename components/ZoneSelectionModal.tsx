// ============================================
// YOROI - MODAL DE SÉLECTION DE ZONES MULTIPLES
// ============================================
// Permet de choisir entre plusieurs zones qui se chevauchent

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { X, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';

export interface Zone {
  id: string;
  name: string;
}

interface ZoneSelectionModalProps {
  visible: boolean;
  zones: Zone[];
  onSelect: (zone: Zone) => void;
  onClose: () => void;
}

export const ZoneSelectionModal: React.FC<ZoneSelectionModalProps> = ({
  visible,
  zones,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();

  const handleSelect = (zone: Zone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(zone);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Plusieurs zones détectées
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Sélectionnez la zone concernée
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={[styles.closeButton, { backgroundColor: colors.backgroundCard }]}
            >
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Liste des zones */}
          <ScrollView style={styles.list}>
            {zones.map((zone, index) => (
              <TouchableOpacity
                key={zone.id}
                style={[
                  styles.zoneItem,
                  { backgroundColor: colors.backgroundCard },
                  index < zones.length - 1 && styles.zoneBorder,
                  { borderColor: colors.border },
                ]}
                onPress={() => handleSelect(zone)}
                activeOpacity={0.7}
              >
                <View style={styles.zoneInfo}>
                  <Text style={[styles.zoneName, { color: colors.textPrimary }]}>
                    {zone.name}
                  </Text>
                  <Text style={[styles.zoneId, { color: colors.textMuted }]}>
                    #{zone.id}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 400,
  },
  zoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  zoneBorder: {
    marginBottom: SPACING.xs,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  zoneId: {
    fontSize: 13,
  },
});
