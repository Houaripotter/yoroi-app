import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlaskConical, GraduationCap, FileCheck } from 'lucide-react-native';

export const ScientificCredibilityBadge: React.FC = () => {
  const sources = ['PubMed', 'Cochrane', 'ACSM', 'WHO', 'ISSN', 'NSCA', 'BJSM'];

  return (
    <View style={styles.container}>
      {/* Header avec icônes */}
      <View style={styles.header}>
        <View style={styles.iconsRow}>
          <FlaskConical size={18} color="#3B82F6" strokeWidth={2} />
          <GraduationCap size={18} color="#3B82F6" strokeWidth={2} />
          <FileCheck size={18} color="#3B82F6" strokeWidth={2} />
        </View>
        <Text style={styles.title}>CRÉDIBILITÉ SCIENTIFIQUE</Text>
      </View>

      {/* Description */}
      <Text style={styles.description}>
        Tous les contenus du LABO sont basés exclusivement sur des études
        peer-reviewed publiées dans des revues scientifiques reconnues.
      </Text>

      {/* Sources acceptées */}
      <View style={styles.sourcesContainer}>
        <Text style={styles.sourcesLabel}>SOURCES ACCEPTÉES</Text>
        <View style={styles.sourcesList}>
          {sources.map((source, index) => (
            <View key={source} style={styles.sourceBadge}>
              <Text style={styles.sourceText}>{source}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer note */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Aucun blog, YouTube, ou opinion personnelle. Uniquement des faits vérifiés.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  sourcesContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sourcesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  sourceBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
