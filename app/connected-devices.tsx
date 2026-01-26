// ============================================
// YOROI - ÉCRAN APPAREILS CONNECTÉS
// ============================================
// Préparation pour synchronisation future

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bluetooth, Scale, Watch, Heart, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface Device {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  comingSoon: boolean;
}

export default function ConnectedDevicesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const devices: Device[] = [
    {
      id: 'scale',
      name: 'Balance connectée',
      icon: <Scale size={24} color={colors.accent} />,
      connected: false,
      comingSoon: true,
    },
    {
      id: 'watch',
      name: 'Apple Watch / Wear OS',
      icon: <Watch size={24} color={colors.accent} />,
      connected: false,
      comingSoon: true,
    },
    {
      id: 'heart',
      name: 'Ceinture cardio',
      icon: <Heart size={24} color={colors.accent} />,
      connected: false,
      comingSoon: true,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={styles.headerTitleRow}>
              <Bluetooth size={28} color={colors.accent} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Appareils connectés
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Synchronise tes appareils pour un suivi automatique
            </Text>
          </View>
        </View>

        <View style={styles.devicesList}>
          {devices.map((device) => (
            <TouchableOpacity
              key={device.id}
              style={[styles.deviceCard, { backgroundColor: colors.backgroundElevated }]}
              disabled={device.comingSoon}
            >
              <View style={[styles.deviceIcon, { backgroundColor: colors.accent + '15' }]}>
                {device.icon}
              </View>

              <View style={styles.deviceInfo}>
                <Text style={[styles.deviceName, { color: colors.textPrimary }]}>
                  {device.name}
                </Text>
                {device.comingSoon ? (
                  <View style={[styles.comingSoonBadge, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.comingSoonText, { color: isDark ? colors.accent : colors.textPrimary }]}>
                      Bientôt disponible
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.deviceStatus, { color: colors.textMuted }]}>
                    {device.connected ? 'Connecté' : 'Non connecté'}
                  </Text>
                )}
              </View>

              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundElevated }]}>
          <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
            💡 Fonctionnalité en développement
          </Text>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            La connexion avec les balances Xiaomi, Withings et autres appareils Bluetooth arrive bientôt.
            Tu pourras synchroniser automatiquement ton poids et ta composition corporelle.
          </Text>
        </View>

        {/* Marques supportées */}
        <View style={[styles.brandsCard, { backgroundColor: colors.backgroundElevated }]}>
          <Text style={[styles.brandsTitle, { color: colors.textPrimary }]}>
            Marques compatibles (à venir)
          </Text>
          <View style={styles.brandsList}>
            {['Xiaomi', 'Withings', 'Omron', 'Garmin', 'Fitbit', 'Polar'].map((brand, index) => (
              <View
                key={index}
                style={[styles.brandTag, { backgroundColor: colors.backgroundLight }]}
              >
                <Text style={[styles.brandText, { color: colors.textSecondary }]}>
                  {brand}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
  },
  devicesList: {
    gap: 12,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  deviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 14,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  deviceStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  brandsCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
  },
  brandsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  brandsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandTag: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
