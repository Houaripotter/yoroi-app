import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { ViewModeSwitch } from '@/components/home/ViewModeSwitch';
import { ViewMode } from '@/hooks/useViewMode';
import AvatarDisplay from '@/components/AvatarDisplay';
import { Profile } from '@/lib/database';

const quotes = [
  "Chaque jour est une nouvelle chance.",
  "Petit à petit, l'oiseau fait son nid.",
  "Le plus dur, c'est de commencer.",
  "Tu es plus fort que tu ne le penses.",
  "La constance bat l'intensité.",
  "Un pas à la fois vers ton objectif.",
  "Crois en toi, tu en es capable.",
  "Chaque effort compte.",
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

interface EssentielHeaderProps {
  userName?: string;
  viewMode?: ViewMode;
  onToggleMode?: () => void;
  profile?: Profile | null;
  refreshTrigger?: number;
}

export const EssentielHeader: React.FC<EssentielHeaderProps> = ({
  userName = 'Champion',
  viewMode = 'essentiel',
  onToggleMode,
  profile,
  refreshTrigger = 0,
}) => {
  const { colors } = useTheme();
  const [quote, setQuote] = useState(quotes[0]);

  useEffect(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
  }, []);

  return (
    <>
      {/* Avatar + Salutation + Photo profil */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push('/avatar-selection')} activeOpacity={0.8}>
          <AvatarDisplay size="small" refreshTrigger={refreshTrigger} />
        </TouchableOpacity>

        <View style={styles.greetingContainer}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()}</Text>
          <View style={styles.userNameRow}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{userName}</Text>
            {onToggleMode && (
              <ViewModeSwitch mode={viewMode} onToggle={onToggleMode} />
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.profilePhotoContainer, { borderColor: colors.border }]}
          onPress={() => router.push('/profile')}
          activeOpacity={0.8}
        >
          {profile?.profile_photo ? (
            <Image
              source={{ uri: profile.profile_photo }}
              style={styles.profilePhotoImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={28} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Citation */}
      <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
        <Sparkles size={18} color="#F59E0B" />
        <Text style={[styles.quote, { color: colors.textSecondary }]} numberOfLines={2}>"{quote}"</Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  profilePhotoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePhotoImage: {
    width: 70,
    height: 70,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  quote: {
    flex: 1,
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '600',
    lineHeight: 22,
  },
});
