// ============================================
// YOROI - DÉMONSTRATION TRAINING SCREEN
// ============================================
// Écran d'exemple montrant l'intégration complète de :
// - HealthKit (lecture FC en temps réel)
// - Dynamic Island (affichage du Timer)
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLiveActivity } from '@/lib/hooks/useLiveActivity';
import { useHealthKit } from '@/lib/hooks/useHealthKit';
import healthConnect from '@/lib/healthConnect.ios';

export default function TrainingScreen() {
  // ============================================
  // HOOKS
  // ============================================

  // Dynamic Island
  const {
    isAvailable: liveActivityAvailable,
    isRunning: trainingRunning,
    startActivity,
    stopActivity,
    updateHeartRate,
    elapsedSeconds,
  } = useLiveActivity();

  // HealthKit
  const {
    isConnected: healthKitConnected,
    connectToHealthKit,
  } = useHealthKit();

  // ============================================
  // STATE
  // ============================================

  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const [activityType, setActivityType] = useState<string>('Course');

  // ============================================
  // EFFETS
  // ============================================

  // Mettre à jour la fréquence cardiaque toutes les 5 secondes pendant l'entraînement
  useEffect(() => {
    if (!trainingRunning || !healthKitConnected) return;

    const fetchHeartRate = async () => {
      try {
        const hrData = await healthConnect.getTodayHeartRate();
        if (hrData?.current) {
          setCurrentHeartRate(hrData.current);
          // Mettre à jour la Dynamic Island
          await updateHeartRate(hrData.current);
        }
      } catch (error) {
        console.error('Erreur récupération FC:', error);
      }
    };

    // Première récupération immédiate
    fetchHeartRate();

    // Puis toutes les 5 secondes
    const interval = setInterval(fetchHeartRate, 5000);

    return () => clearInterval(interval);
  }, [trainingRunning, healthKitConnected, updateHeartRate]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleStartTraining = async () => {
    // Vérifier HealthKit
    if (!healthKitConnected) {
      Alert.alert(
        'Apple Santé requis',
        'Connecte-toi à Apple Santé pour suivre ta fréquence cardiaque en temps réel.',
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Connecter',
            onPress: async () => {
              await connectToHealthKit();
            },
          },
        ]
      );
      return;
    }

    // Vérifier Dynamic Island
    if (!liveActivityAvailable) {
      Alert.alert(
        'Live Activities non disponibles',
        'iOS 16.1+ requis pour afficher le timer dans la Dynamic Island.'
      );
      return;
    }

    // Démarrer l'entraînement
    const started = await startActivity(activityType);

    if (started) {
      Alert.alert('Entraînement démarré', 'Le timer est affiché dans la Dynamic Island.');
    } else {
      Alert.alert('Erreur', 'Impossible de démarrer l\'entraînement.');
    }
  };

  const handleStopTraining = async () => {
    Alert.alert(
      'Terminer l\'entraînement ?',
      `Durée : ${formatTime(elapsedSeconds)}`,
      [
        { text: 'Continuer', style: 'cancel' },
        {
          text: 'Terminer',
          style: 'destructive',
          onPress: async () => {
            const stopped = await stopActivity();

            if (stopped) {
              // Optionnel : Enregistrer l'entraînement dans HealthKit
              if (healthKitConnected) {
                await healthConnect.writeWorkout({
                  activityType,
                  startDate: new Date(Date.now() - elapsedSeconds * 1000),
                  endDate: new Date(),
                  calories: Math.round(elapsedSeconds * 0.15), // Estimation
                });
              }

              Alert.alert('Entraînement terminé', `Durée totale : ${formatTime(elapsedSeconds)}`);
            }
          },
        },
      ]
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Text style={styles.title}>Entraînement</Text>

      {/* STATUS */}
      <View style={styles.statusContainer}>
        <StatusItem
          label="HealthKit"
          connected={healthKitConnected}
          onPress={healthKitConnected ? undefined : connectToHealthKit}
        />
        <StatusItem
          label="Dynamic Island"
          connected={liveActivityAvailable}
        />
      </View>

      {/* TIMER PRINCIPAL */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        <Text style={styles.timerLabel}>{activityType}</Text>
      </View>

      {/* FRÉQUENCE CARDIAQUE */}
      {currentHeartRate && (
        <View style={styles.heartRateContainer}>
          <Text style={styles.heartRateLabel}>Fréquence cardiaque</Text>
          <View style={styles.heartRateValue}>
            <Text style={styles.heartRateNumber}>{currentHeartRate}</Text>
            <Text style={styles.heartRateUnit}>BPM</Text>
          </View>
        </View>
      )}

      {/* BOUTONS */}
      <View style={styles.buttonsContainer}>
        {!trainingRunning ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={handleStartTraining}
          >
            <Text style={styles.buttonText}>Démarrer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={handleStopTraining}
          >
            <Text style={styles.buttonText}>Terminer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* INFO */}
      {trainingRunning && (
        <Text style={styles.infoText}>
          Le timer est affiché dans la Dynamic Island.{'\n'}
          Appuie longuement pour voir les détails.
        </Text>
      )}
    </View>
  );
}

// ============================================
// COMPOSANTS HELPERS
// ============================================

interface StatusItemProps {
  label: string;
  connected: boolean;
  onPress?: () => void;
}

function StatusItem({ label, connected, onPress }: StatusItemProps) {
  return (
    <TouchableOpacity
      style={styles.statusItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.statusDot, connected ? styles.statusConnected : styles.statusDisconnected]} />
      <Text style={styles.statusLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============================================
// HELPERS
// ============================================

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 48,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusConnected: {
    backgroundColor: '#00ff00',
  },
  statusDisconnected: {
    backgroundColor: '#ff0000',
  },
  statusLabel: {
    color: '#fff',
    fontSize: 14,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 18,
    color: '#888',
    marginTop: 8,
  },
  heartRateContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    marginBottom: 48,
    alignItems: 'center',
  },
  heartRateLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  heartRateValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  heartRateNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff0000',
  },
  heartRateUnit: {
    fontSize: 18,
    color: '#888',
  },
  buttonsContainer: {
    gap: 16,
  },
  button: {
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#00ff00',
  },
  stopButton: {
    backgroundColor: '#ff0000',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  infoText: {
    marginTop: 32,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
