// ============================================
// PARTNER MEDIA GALLERY · Photos + liens video par partenaire
// ============================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, TextInput, Alert,
} from 'react-native';
import { Camera, Video, Plus, X, ExternalLink } from 'lucide-react-native';
import { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync, MediaTypeOptions } from 'expo-image-picker';
import { useTheme } from '@/lib/ThemeContext';
import { lightHaptic, successHaptic } from '@/lib/haptics';
import { safeOpenURL } from '@/lib/security/validators';
import type { PartnerMedia } from '@/lib/partnerModel';

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

interface Props {
  media: PartnerMedia[];
  onChange: (media: PartnerMedia[]) => void;
}

export const PartnerMediaGallery: React.FC<Props> = ({ media, onChange }) => {
  const { colors, isDark } = useTheme();
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');

  const addPhoto = async () => {
    lightHaptic().catch(() => {});
    const perm = await requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusee', 'Accorde l\'acces aux photos pour importer.');
      return;
    }
    const res = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const newItem: PartnerMedia = {
      id: makeId(),
      type: 'photo',
      uri: res.assets[0].uri,
      date: new Date().toISOString(),
    };
    onChange([newItem, ...media]);
    successHaptic().catch(() => {});
  };

  const addVideoLink = () => {
    const u = videoUrl.trim();
    if (!u) return;
    // Validation : YouTube / Vimeo / lien http
    if (!/^https?:\/\//i.test(u)) {
      Alert.alert('Lien invalide', 'Le lien doit commencer par https://');
      return;
    }
    const newItem: PartnerMedia = {
      id: makeId(),
      type: 'video_link',
      uri: u,
      caption: caption.trim() || undefined,
      date: new Date().toISOString(),
    };
    onChange([newItem, ...media]);
    successHaptic().catch(() => {});
    setShowVideoModal(false);
    setVideoUrl('');
    setCaption('');
  };

  const remove = (id: string) => {
    lightHaptic().catch(() => {});
    onChange(media.filter(m => m.id !== id));
  };

  const openVideo = async (uri: string) => {
    lightHaptic().catch(() => {});
    await safeOpenURL(uri);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={[styles.title, { color: colors.text }]}>Media</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={addPhoto} style={[styles.addBtn, { backgroundColor: '#3B82F620' }]}>
            <Camera size={14} color="#3B82F6" />
            <Text style={[styles.addText, { color: '#3B82F6' }]}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowVideoModal(true)} style={[styles.addBtn, { backgroundColor: '#EF444420' }]}>
            <Video size={14} color="#EF4444" />
            <Text style={[styles.addText, { color: '#EF4444' }]}>Video</Text>
          </TouchableOpacity>
        </View>
      </View>

      {media.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Aucune photo ni lien video pour l'instant.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
          {media.map(m => (
            <View key={m.id} style={[styles.cell, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              {m.type === 'photo' ? (
                <Image source={{ uri: m.uri }} style={styles.photo} />
              ) : (
                <TouchableOpacity onPress={() => openVideo(m.uri)} style={styles.videoBox}>
                  <ExternalLink size={28} color="#EF4444" />
                  <Text style={[styles.videoText, { color: colors.text }]} numberOfLines={2}>
                    {m.caption || 'Ouvrir la video'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => remove(m.id)} style={styles.removeBtn}>
                <X size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showVideoModal} transparent animationType="slide" onRequestClose={() => setShowVideoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ajouter un lien video</Text>
            <TextInput
              autoFocus
              autoCapitalize="none"
              keyboardType="url"
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://youtube.com/..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}
            />
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Description (optionnel)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', marginTop: 8 }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowVideoModal(false)} style={[styles.modalBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addVideoLink} style={[styles.modalBtn, { backgroundColor: colors.accent }]}>
                <Text style={{ color: colors.textOnGold, fontWeight: '800' }}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 13, fontWeight: '800' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addText: { fontSize: 11, fontWeight: '800' },
  empty: { fontSize: 12, fontStyle: 'italic', paddingVertical: 8 },
  cell: {
    width: 100, height: 100,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  videoBox: {
    width: '100%', height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 6,
  },
  videoText: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  removeBtn: {
    position: 'absolute',
    top: 4, right: 4,
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
});

export default PartnerMediaGallery;
