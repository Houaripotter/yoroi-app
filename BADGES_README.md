import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Image } from 'react-native';
import { X, Lock, Award } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { getMeasurements, getWorkouts } from '@/lib/storage';

// Liste des Badges
const BADGES = [
  { id: 'first_weight', name: 'Première Pesée', icon: '⚖️', condition: 'measurements >= 1' },
  { id: 'first_workout', name: 'Premier Entraînement', icon: '🥋', condition: 'workouts >= 1' },
  { id: 'warrior', name: 'Guerrier (10 Séances)', icon: '⚔️', condition: 'workouts >= 10' },
  { id: 'samurai', name: 'Samouraï (30 Séances)', icon: '👹', condition: 'workouts >= 30' },
];

export const BadgesScreen = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const [unlocked, setUnlocked] = useState<string[]>([]);

  useEffect(() => {
    if (visible) checkBadges();
  }, [visible]);

  const checkBadges = async () => {
    const measurements = await getMeasurements();
    const workouts = await getWorkouts();
    const newUnlocked = [];

    if (measurements.length >= 1) newUnlocked.push('first_weight');
    if (workouts.length >= 1) newUnlocked.push('first_workout');
    if (workouts.length >= 10) newUnlocked.push('warrior');
    if (workouts.length >= 30) newUnlocked.push('samurai');

    setUnlocked(newUnlocked);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Mes Badges</Text>
            <TouchableOpacity onPress={onClose}><X color="#000" size={24} /></TouchableOpacity>
          </View>
          <ScrollView>
            <View style={styles.grid}>
              {BADGES.map((badge) => {
                const isUnlocked = unlocked.includes(badge.id);
                return (
                  <View key={badge.id} style={[styles.badge, !isUnlocked && styles.locked]}>
                    <Text style={{fontSize: 32}}>{isUnlocked ? badge.icon : '🔒'}</Text>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center' },
  badge: { width: '45%', aspectRatio: 1, backgroundColor: '#F5F5F5', borderRadius: 15, alignItems: 'center', justifyContent: 'center', padding: 10 },
  locked: { opacity: 0.5 },
  badgeName: { marginTop: 10, textAlign: 'center', fontWeight: '600' }
});