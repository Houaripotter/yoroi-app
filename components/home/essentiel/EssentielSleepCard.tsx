import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Moon, Edit3, Plus, CheckCircle, ThumbsUp, Minus, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

type QualityLevel = 'excellent' | 'bon' | 'moyen' | 'mauvais' | null;

interface EssentielSleepCardProps {
  hours?: number | null;
  quality?: QualityLevel;
  onPress?: () => void;
}

export const EssentielSleepCard: React.FC<EssentielSleepCardProps> = ({
  hours = null,
  quality = null,
  onPress,
}) => {
  const { colors } = useTheme();

  const getQualityInfo = () => {
    switch(quality) {
      case 'excellent': return { icon: CheckCircle, label: 'Excellent', color: '#10B981' };
      case 'bon': return { icon: ThumbsUp, label: 'Bon', color: '#3B82F6' };
      case 'moyen': return { icon: Minus, label: 'Moyen', color: '#F59E0B' };
      case 'mauvais': return { icon: AlertTriangle, label: 'Mauvais', color: '#EF4444' };
      default: return null;
    }
  };

  const qualityInfo = getQualityInfo();
  const hasData = hours !== null;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <Moon size={18} color="#8B5CF6" />
        <Text style={styles.title}>SOMMEIL</Text>
      </View>

      {/* Contenu */}
      {hasData ? (
        <>
          {/* Icône sommeil */}
          <View style={styles.iconContainer}>
            <Moon size={40} color="#8B5CF6" />
          </View>

          {/* Durée */}
          <View style={styles.valueContainer}>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{hours}h</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>Cette nuit</Text>
          </View>

          {/* Qualité */}
          {qualityInfo && (
            <View style={[styles.qualityBadge, { backgroundColor: `${qualityInfo.color}15` }]}>
              <qualityInfo.icon size={16} color={qualityInfo.color} />
              <Text style={[styles.qualityText, { color: qualityInfo.color }]}>
                {qualityInfo.label}
              </Text>
            </View>
          )}
        </>
      ) : (
        <>
          {/* Pas de données */}
          <View style={styles.noDataContainer}>
            <Moon size={40} color={colors.border} />
            <Text style={[styles.noDataText, { color: colors.textMuted }]}>Pas de données</Text>
            <Text style={[styles.noDataSubtext, { color: colors.border }]}>cette nuit</Text>
          </View>
        </>
      )}

      {/* Bouton */}
      <TouchableOpacity style={[styles.addButton, { backgroundColor: '#F3E8FF' }]} onPress={onPress}>
        {hasData ? <Edit3 size={16} color="#8B5CF6" /> : <Plus size={16} color="#8B5CF6" />}
        <Text style={styles.addButtonText}>
          {hasData ? "Modifier" : "Ajouter"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B5CF6',
    letterSpacing: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  valueContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 12,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noDataText: {
    fontSize: 14,
    marginTop: 8,
  },
  noDataSubtext: {
    fontSize: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});
