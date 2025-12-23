import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, User } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

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
  const [image, setImage] = useState<string | null>(currentImage || null);

  const pickImage = async () => {
    // Demander la permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Nous avons besoin d\'accéder à vos photos.'
      );
      return;
    }

    // Ouvrir la galerie avec crop
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,        // ← Permet le crop
      aspect: [1, 1],             // ← Carré
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Redimensionner l'image pour optimiser le stockage
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImage(manipulated.uri);
      onImageSelected(manipulated.uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à la caméra.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImage(manipulated.uri);
      onImageSelected(manipulated.uri);
    }
  };

  const showOptions = () => {
    Alert.alert(
      'Photo de profil',
      'Comment voulez-vous ajouter votre photo ?',
      [
        { text: 'Prendre une photo', onPress: takePhoto },
        { text: 'Choisir dans la galerie', onPress: pickImage },
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
