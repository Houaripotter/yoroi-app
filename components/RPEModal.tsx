import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { X, Check, AlertTriangle, Flame, Zap, Battery, Target } from 'lucide-react-native';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { calculateSessionLoad } from '@/lib/trainingLoadService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RPEModalProps {
  visible: boolean;
  durationMinutes: number;
  onClose: () => void;
  onSubmit: (rpe: number, load: number) => void;
}

const RPE_LEVELS = [
  { value: 1, label: 'Très facile', color: '#10B981', description: 'Récupération active' },
  { value: 2, label: 'Facile', color: '#22D3EE', description: 'Échauffement léger' },
  { value: 3, label: 'Modéré léger', color: '#22D3EE', description: 'Confortable' },
  { value: 4, label: 'Modéré', color: '#F59E0B', description: 'Un peu challengeant' },
  { value: 5, label: 'Modéré+', color: '#F59E0B', description: 'Effort soutenu' },
  { value: 6, label: 'Difficile', color: '#F97316', description: 'Conversation difficile' },
  { value: 7, label: 'Très difficile', color: '#F97316', description: 'Essoufflement' },
  { value: 8, label: 'Intense', color: '#EF4444', description: 'Très exigeant' },
  { value: 9, label: 'Extrême', color: '#EF4444', description: 'Presque au max' },
  { value: 10, label: 'Maximum', color: '#991B1B', description: 'Effort maximal' },
];

export function RPEModal({ visible, durationMinutes, onClose, onSubmit }: RPEModalProps) {
  const { colors } = useTheme();
  const [selectedRPE, setSelectedRPE] = useState<number | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      setSelectedRPE(null);
    }
  }, [visible]);

  const handleSelect = (rpe: number) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setSelectedRPE(rpe);
  };

  const handleSubmit = () => {
    if (selectedRPE === null) return;
    notificationAsync(NotificationFeedbackType.Success);
    const load = calculateSessionLoad(durationMinutes, selectedRPE);
    onSubmit(selectedRPE, load);
  };

  const currentRPE = selectedRPE ? RPE_LEVELS[selectedRPE - 1] : null;
  const estimatedLoad = selectedRPE ? calculateSessionLoad(durationMinutes, selectedRPE) : 0;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View 
          style={[
            styles.modal, 
            { 
              backgroundColor: colors.backgroundCard,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Target size={20} color={colors.accentText} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Ressenti de l'effort
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Comment c'était cette séance de {durationMinutes} min ?
          </Text>

          {/* RPE Grid */}
          <View style={styles.rpeGrid}>
            {RPE_LEVELS.map((level) => {
              const isSelected = selectedRPE === level.value;
              return (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.rpeBtn,
                    { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
                    isSelected && { backgroundColor: level.color, borderColor: level.color },
                  ]}
                  onPress={() => handleSelect(level.value)}
                >
                  <Text
                    style={[
                      styles.rpeValue,
                      { color: isSelected ? '#FFFFFF' : level.color },
                    ]}
                  >
                    {level.value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected RPE Info */}
          {currentRPE && (
            <View style={[styles.selectedInfo, { backgroundColor: `${currentRPE.color}15` }]}>
              <View style={styles.selectedHeader}>
                <Flame size={18} color={currentRPE.color} />
                <Text style={[styles.selectedLabel, { color: currentRPE.color }]}>
                  {currentRPE.label}
                </Text>
              </View>
              <Text style={[styles.selectedDesc, { color: colors.textMuted }]}>
                {currentRPE.description}
              </Text>
              
              <View style={styles.loadPreview}>
                <View style={styles.loadItem}>
                  <Zap size={14} color={colors.accentText} />
                  <Text style={[styles.loadLabel, { color: colors.textMuted }]}>Charge</Text>
                  <Text style={[styles.loadValue, { color: colors.textPrimary }]}>
                    {estimatedLoad} pts
                  </Text>
                </View>
                {estimatedLoad > 600 && (
                  <View style={[styles.warningBadge, { backgroundColor: '#F59E0B20' }]}>
                    <AlertTriangle size={12} color="#F59E0B" />
                    <Text style={styles.warningText}>Séance intense !</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.skipBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.skipText, { color: colors.textMuted }]}>Ignorer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: selectedRPE ? colors.accent : colors.border },
              ]}
              onPress={handleSubmit}
              disabled={!selectedRPE}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.submitText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  rpeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  rpeBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  rpeValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  selectedInfo: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  selectedDesc: {
    fontSize: 13,
    marginBottom: 12,
  },
  loadPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadLabel: {
    fontSize: 12,
  },
  loadValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default RPEModal;
