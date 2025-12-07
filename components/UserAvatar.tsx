import { StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';

interface UserAvatarProps {
  imageUrl?: string;
  size?: number;
}

export function UserAvatar({ imageUrl, size = 40 }: UserAvatarProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push('/(tabs)/settings');
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
            <Settings size={size * 0.5} color="#007AFF" strokeWidth={2.5} />
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
