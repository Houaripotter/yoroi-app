import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check } from 'lucide-react-native';
import { ProtocolReference } from '@/data/labProtocols';
import logger from '@/lib/security/logger';
import { useTheme } from '@/lib/ThemeContext';

interface ProtocolChecklistProps {
  protocolId: string;
  title: string;
  categoryColor: string;
  items: { text: string; source: string | null }[];
  references: ProtocolReference[];
}

export const ProtocolChecklist: React.FC<ProtocolChecklistProps> = ({
  protocolId,
  title,
  categoryColor,
  items,
  references,
}) => {
  const { isDark, colors } = useTheme();
  const [checkedItems, setCheckedItems] = useState<boolean[]>(new Array(items.length).fill(false));

  // Charger la progression depuis AsyncStorage
  useEffect(() => {
    loadProgress();
  }, [protocolId]);

  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem(`protocol_${protocolId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCheckedItems(parsed);
      }
    } catch (error) {
      logger.error('Erreur chargement progression protocole:', error);
    }
  };

  const toggleItem = async (index: number) => {
    const newCheckedItems = [...checkedItems];
    newCheckedItems[index] = !newCheckedItems[index];
    setCheckedItems(newCheckedItems);

    // Sauvegarder dans AsyncStorage
    try {
      await AsyncStorage.setItem(
        `protocol_${protocolId}`,
        JSON.stringify(newCheckedItems)
      );
    } catch (error) {
      logger.error('Erreur sauvegarde progression protocole:', error);
    }
  };

  const resetProgress = async () => {
    const resetItems = new Array(items.length).fill(false);
    setCheckedItems(resetItems);
    try {
      await AsyncStorage.removeItem(`protocol_${protocolId}`);
    } catch (error) {
      logger.error('Erreur reset progression protocole:', error);
    }
  };

  const completedCount = checkedItems.filter(Boolean).length;
  const progressPercentage = (completedCount / items.length) * 100;

  return (
    <View style={[styles.container, {
      borderLeftColor: categoryColor,
      backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
      borderColor: isDark ? colors.border : '#E2E8F0',
    }]}>
      {/* Header avec titre et progression */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? colors.textPrimary : '#1E293B' }]}>{title}</Text>
        <Text style={[styles.progress, { color: isDark ? colors.textMuted : '#64748B' }]}>
          {completedCount}/{items.length} COMPLÉTÉ
        </Text>
      </View>

      {/* Barre de progression */}
      <View style={[styles.progressBarContainer, { backgroundColor: isDark ? colors.backgroundElevated : '#F1F5F9' }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progressPercentage}%`, backgroundColor: categoryColor },
          ]}
        />
      </View>

      {/* Liste des items avec checkboxes */}
      <View style={styles.itemsContainer}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.itemRow}
            onPress={() => toggleItem(index)}
            activeOpacity={0.7}
          >
            {/* Checkbox */}
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: isDark ? colors.background : '#FFFFFF',
                  borderColor: isDark ? colors.border : '#CBD5E1',
                },
                checkedItems[index] && {
                  backgroundColor: categoryColor,
                  borderColor: categoryColor,
                },
              ]}
            >
              {checkedItems[index] && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
            </View>

            {/* Texte de l'item */}
            <View style={styles.itemTextContainer}>
              <Text
                style={[
                  styles.itemText,
                  { color: isDark ? colors.textSecondary : '#1E293B' },
                  checkedItems[index] && [styles.itemTextCompleted, { color: isDark ? colors.textMuted : '#94A3B8' }],
                ]}
              >
                {item.text}
              </Text>
              {item.source && (
                <Text style={[styles.itemSource, { color: isDark ? colors.textMuted : '#94A3B8' }]}>
                  Source: {item.source}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bouton Reset */}
      {completedCount > 0 && (
        <TouchableOpacity
          style={[styles.resetButton, {
            backgroundColor: isDark ? colors.backgroundElevated : '#F8FAFC',
            borderColor: isDark ? colors.border : '#E2E8F0',
          }]}
          onPress={resetProgress}
          activeOpacity={0.7}
        >
          <Text style={[styles.resetButtonText, { color: isDark ? colors.textSecondary : '#64748B' }]}>
            RÉINITIALISER LA PROGRESSION
          </Text>
        </TouchableOpacity>
      )}

      {/* Section Références */}
      {references.length > 0 && (
        <View style={[styles.referencesContainer, { borderTopColor: isDark ? colors.border : '#E2E8F0' }]}>
          <Text style={[styles.referencesTitle, { color: isDark ? colors.textMuted : '#64748B' }]}>
            RÉFÉRENCES SCIENTIFIQUES
          </Text>
          {references.map((ref, index) => (
            <View key={index} style={styles.referenceItem}>
              <Text style={[styles.referenceText, { color: isDark ? colors.textMuted : '#64748B' }]}>
                [{index + 1}] {ref.author} ({ref.year}). {ref.journal}.
              </Text>
              {ref.doi && (
                <Text style={styles.referenceDoi}>DOI: {ref.doi}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  progress: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  itemsContainer: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  itemTextCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  itemSource: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontStyle: 'italic',
  },
  resetButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  referencesContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  referencesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  referenceItem: {
    marginBottom: 8,
  },
  referenceText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  referenceDoi: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 2,
  },
});
