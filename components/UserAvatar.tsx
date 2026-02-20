import { StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserAvatarProps {
  imageUrl?: string;
  size?: number;
  onPress?: () => void;
}

export function UserAvatar({ imageUrl, size = 40, onPress }: UserAvatarProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.container, { width: size, height: size }]}
      activeOpacity={0.7}
    >
      <View style={[styles.avatarContainer, { borderRadius: size / 2 }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
            <Ionicons name="settings" size={size * 0.5} color="#4D96FF" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {},
  avatarContainer: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
