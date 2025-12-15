import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import { theme } from '@/lib/theme';
import { router } from 'expo-router';

// ============================================
// APP HEADER - Nouveau Design Premium
// ============================================
// Logo Yoroi a gauche (dans cercle blanc)
// Greeting + Avatar a droite

interface AppHeaderProps {
  username?: string;
  greeting?: string;
  onAvatarPress?: () => void;
  showGreeting?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  username = 'Guerrier',
  greeting,
  onAvatarPress,
  showGreeting = true
}) => {
  const handleAvatarPress = () => {
    if (onAvatarPress) {
      onAvatarPress();
    } else {
      router.push('/settings');
    }
  };

  // Determine le salut selon l'heure
  const getGreeting = () => {
    if (greeting) return greeting;
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon apres-midi';
    return 'Bonsoir';
  };

  return (
    <View style={styles.header}>
      {/* Logo Yoroi dans cercle blanc */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/yoroi-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Greeting + Avatar */}
      {showGreeting && (
        <TouchableOpacity
          onPress={handleAvatarPress}
          activeOpacity={0.8}
          style={styles.rightSection}
        >
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>
              {getGreeting()}, {username}
            </Text>
          </View>
          <UserAvatar size={44} />
        </TouchableOpacity>
      )}

      {!showGreeting && (
        <TouchableOpacity
          onPress={handleAvatarPress}
          activeOpacity={0.8}
          style={styles.avatarButton}
        >
          <UserAvatar size={44} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },

  logoContainer: {
    flex: 1,
  },

  logo: {
    width: 120,
    height: 40,
  },

  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  greetingContainer: {
    alignItems: 'flex-end',
  },

  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },

  avatarButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderRadius: 22,
  },
});
