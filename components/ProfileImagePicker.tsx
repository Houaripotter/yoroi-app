import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { launchImageLibraryAsync, launchCameraAsync, requestMediaLibraryPermissionsAsync, getMediaLibraryPermissionsAsync, requestCameraPermissionsAsync, getCameraPermissionsAsync } from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Camera, User } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useCustomPopup } from '@/components/CustomPopup';

interface ProfileImagePickerProps {
  currentImage?: string | null;
  onImageSelected: (uri: string) => void;
  size?: number;
}

export const ProfileImagePicker: React.FC<ProfileImagePickerProps> = ({
  currentImage,
  onImageSelected,
  size = 120,
}) => {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [image, setImage] = useState<string | null>(currentImage || null);

  const pickImage = async () => {
    try {
      // Demander la permission
      const { status } = await requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        showPopup(
          'Permission requise',
          'Nous avons besoin d\'acceder a tes photos.',
          [{ text: 'OK', style: 'primary' }]
        );
        return;
      }

      // Ouvrir la galerie avec crop
      const result = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,        // ← Permet le crop
        aspect: [1, 1],             // ← Carré
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        // Redimensionner l'image pour optimiser le stockage
        const manipulated = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );

        setImage(manipulated.uri);
        onImageSelected(manipulated.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showPopup(
        'Erreur',
        'Impossible de charger la photo. Réessaye.',
        [{ text: 'OK', style: 'primary' }]
      );
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await requestCameraPermissionsAsync();

      if (status !== 'granted') {
        showPopup('Permission requise', 'Nous avons besoin d\'acceder a la camera.', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const result = await launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const manipulated = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );

        setImage(manipulated.uri);
        onImageSelected(manipulated.uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showPopup(
        'Erreur',
        'Impossible de prendre la photo. Réessaye.',
        [{ text: 'OK', style: 'primary' }]
      );
    }
  };

  const showOptions = () => {
    showPopup(
      'Photo de profil',
      'Comment veux-tu ajouter ton photo ?',
      [
        { text: 'Prendre une photo', style: 'primary', onPress: takePhoto },
        { text: 'Choisir dans la galerie', style: 'primary', onPress: pickImage },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  return (
    <TouchableOpacity onPress={showOptions} style={styles.container}>
      {image ? (
        <Image
          source={{ uri: image }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: colors.accent,
            }
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.backgroundElevated,
              borderColor: colors.accent,
            }
          ]}
        >
          <User size={size * 0.4} color={colors.textMuted} />
        </View>
      )}

      {/* Badge caméra */}
      <View style={[styles.cameraBadge, { backgroundColor: colors.accent }]}>
        <Camera size={16} color="#FFF" />
      </View>
      <PopupComponent />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    borderWidth: 3,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
});
