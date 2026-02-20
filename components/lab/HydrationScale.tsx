import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Droplet, AlertTriangle, CheckCircle } from 'lucide-react-native';

interface HydrationLevel {
  level: number;
  color: string;
  status: 'optimal' | 'attention' | 'danger';
  statusLabel: string;
  advice: string;
}

const HYDRATION_LEVELS: HydrationLevel[] = [
  {
    level: 1,
    color: '#F7F3E3',
    status: 'optimal',
    statusLabel: 'HYDRATATION OPTIMALE',
    advice: 'Couleur jaune très pâle. État idéal. Maintenir cette hydratation.',
  },
  {
    level: 2,
    color: '#F5E6B3',
    status: 'optimal',
    statusLabel: 'BIEN HYDRATÉ',
    advice: 'Jaune pâle. Hydratation correcte. Continuer ainsi.',
  },
  {
    level: 3,
    color: '#F0D870',
    status: 'optimal',
    statusLabel: 'HYDRATATION NORMALE',
    advice: 'Jaune clair. Niveau acceptable. Boire régulièrement.',
  },
  {
    level: 4,
    color: '#E8C547',
    status: 'attention',
    statusLabel: 'DÉBUT DE DÉSHYDRATATION',
    advice: 'Jaune foncé. Augmenter l\'apport en eau immédiatement.',
  },
  {
    level: 5,
    color: '#D4A520',
    status: 'attention',
    statusLabel: 'DÉSHYDRATATION MODÉRÉE',
    advice: 'Jaune ambré. Boire 500-750ml d\'eau dans l\'heure.',
  },
  {
    level: 6,
    color: '#B8860B',
    status: 'danger',
    statusLabel: 'DÉSHYDRATATION SÉVÈRE',
    advice: 'Jaune-brun foncé. Boire 1L d\'eau progressivement + électrolytes.',
  },
  {
    level: 7,
    color: '#8B6914',
    status: 'danger',
    statusLabel: 'DÉSHYDRATATION CRITIQUE',
    advice: 'Brun foncé. État dangereux. Réhydratation urgente requise.',
  },
];

export const HydrationScale: React.FC = () => {
  const getStatusIcon = (status: HydrationLevel['status']) => {
    switch (status) {
      case 'optimal':
        return <CheckCircle size={16} color="#10B981" strokeWidth={2.5} />;
      case 'attention':
        return <AlertTriangle size={16} color="#F59E0B" strokeWidth={2.5} />;
      case 'danger':
        return <AlertTriangle size={16} color="#EF4444" strokeWidth={2.5} />;
    }
  };

  const getStatusColor = (status: HydrationLevel['status']) => {
    switch (status) {
      case 'optimal':
        return '#10B981';
      case 'attention':
        return '#F59E0B';
      case 'danger':
        return '#EF4444';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Droplet size={20} color="#3B82F6" strokeWidth={2} />
        <Text style={styles.title}>ÉCHELLE D'HYDRATATION</Text>
      </View>

      <Text style={styles.subtitle}>
        Vérifie la couleur de tes urines pour évaluer ton niveau d'hydratation
      </Text>

      {/* Échelle des niveaux */}
      <View style={styles.scaleContainer}>
        {HYDRATION_LEVELS.map((level) => (
          <View key={level.level} style={styles.levelRow}>
            {/* Niveau numéro */}
            <View style={styles.levelNumber}>
              <Text style={styles.levelNumberText}>{level.level}</Text>
            </View>

            {/* Pastille de couleur */}
            <View style={[styles.colorCircle, { backgroundColor: level.color }]}>
              <View style={styles.colorCircleInner} />
            </View>

            {/* Informations */}
            <View style={styles.levelInfo}>
              <View style={styles.statusRow}>
                {getStatusIcon(level.status)}
                <Text
                  style={[
                    styles.statusLabel,
                    { color: getStatusColor(level.status) },
                  ]}
                >
                  {level.statusLabel}
                </Text>
              </View>
              <Text style={styles.advice}>{level.advice}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Note scientifique */}
      <View style={styles.noteContainer}>
        <Text style={styles.noteTitle}>À SAVOIR</Text>
        <Text style={styles.noteText}>
          La couleur des urines est un indicateur simple de ton état d'hydratation.
          Une couleur jaune pâle (niveaux 1-3) indique une bonne hydratation.
          Au-delà du niveau 5, tes performances physiques et ta concentration
          peuvent être affectées.
        </Text>
      </View>

      {/* Référence */}
      <View style={styles.referenceContainer}>
        <Text style={styles.referenceTitle}>RÉFÉRENCE</Text>
        <Text style={styles.referenceText}>
          Armstrong LE, Maresh CM, Castellani JW, et al. (1994). Urinary Indices of
          Hydration Status. International Journal of Sport Nutrition. 4(3): 265-279.
        </Text>
        <Text style={styles.referenceDoi}>DOI: 10.1123/ijsn.4.3.265</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  scaleContainer: {
    gap: 12,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorCircleInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  levelInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  advice: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  noteContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  noteText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  referenceContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  referenceTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
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
