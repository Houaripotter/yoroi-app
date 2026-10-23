/**
 * Formulaire de club v2 (ajout et modification) : logo, nom, sport, objectif par semaine, couleur.
 * Remplace visuellement l'ancien AddClubModal, memes donnees (addClub, updateClub, setGoal).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { addClub, updateClub } from '@/lib/database';
import type { Club } from '@/lib/database';
import { SPORTS, getClubLogoSource, getSportName } from '@/lib/sports';
import { deactivateGoal, getGoalBySport, setGoal } from '@/lib/trainingGoalsService';
import { logger } from '@/lib/security/logger';
import { Icon } from './Icon';
import { BackButton, BigButton, Chip, tap } from './ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P } from '@/components/yoroi/livePalette';

const COLORS = ['#2C4A84', '#B0282E', '#C59D45', '#6E8C3A', '#3D5D9E', '#A8832F', '#1D2029', '#8B8D96'];
const QUICK = ['jjb', 'musculation', 'boxe', 'mma', 'muay_thai', 'judo', 'crossfit', 'running', 'grappling', 'kickboxing', 'yoga', 'natation'];

async function saveImagePermanently(tempUri: string): Promise<string> {
  try {
    const ext = tempUri.split('.').pop()?.split('?')[0] ?? 'jpg';
    const dest = `${FileSystem.documentDirectory}club_logo_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    return dest;
  } catch (e) {
    logger.warn('Copie du logo de club impossible', e);
    return tempUri;
  }
}

export function ClubFormContent({ editingClub, onDone, onCancel }: { editingClub?: Club | null; onDone: () => void; onCancel: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(editingClub?.name ?? '');
  const [sport, setSport] = useState(editingClub?.sport ?? 'jjb');
  const [color, setColor] = useState(editingClub?.color && COLORS.includes(editingClub.color) ? editingClub.color : editingClub?.color ?? COLORS[0]);
  const [logo, setLogo] = useState<string | null>(editingClub?.logo_uri ?? null);
  // 0 : pas d'objectif dans ce sport (rien d'impose, l'utilisateur choisit)
  const [goal, setGoalValue] = useState(0);
  const [hadGoal, setHadGoal] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  // garde synchrone : deux appuis rapproches ne creent jamais le club deux fois
  const savingRef = useRef(false);

  useEffect(() => {
    getGoalBySport(sport)
      .then((g) => {
        const on = !!g?.weekly_target && g.is_active !== false;
        setHadGoal(on);
        setGoalValue(on ? g!.weekly_target : 0);
      })
      .catch(() => {});
  }, [sport]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return SPORTS.filter((s) => s.name.toLowerCase().includes(q) || s.id.includes(q)).slice(0, 12);
  }, [search]);

  const pick = async (source: 'camera' | 'gallery') => {
    try {
      const perm = source === 'camera' ? await requestCameraPermissionsAsync() : await requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        appAlert('Autorisation nécessaire', source === 'camera' ? 'Autorise l’accès à l’appareil photo dans les réglages.' : 'Autorise l’accès à tes photos dans les réglages.');
        return;
      }
      const res = source === 'camera'
        ? await launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
        : await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!res.canceled && res.assets[0]) setLogo(await saveImagePermanently(res.assets[0].uri));
    } catch (e) {
      logger.error('Erreur image club', e);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      notificationAsync(NotificationFeedbackType.Error).catch(() => {});
      appAlert('Il manque le nom', 'Donne un nom à ton club.');
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (editingClub?.id) await updateClub(editingClub.id, { name: name.trim(), sport, color, logo_uri: logo || undefined });
      else await addClub({ name: name.trim(), sport, color, logo_uri: logo || undefined });
      if (goal > 0) await setGoal(sport, goal);
      else if (hadGoal) await deactivateGoal(sport);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      onDone();
    } catch (e) {
      logger.error('Erreur sauvegarde club', e);
      appAlert('Oups', 'Le club n’a pas pu être enregistré. Réessaie.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const logoSrc = logo ? getClubLogoSource(logo) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 30, gap: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BackButton onPress={onCancel} />
          <Ink size={26} weight="black" tight style={{ flex: 1 }}>{editingClub ? 'Modifier le club' : 'Nouveau club'}</Ink>
        </View>

        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ width: 110, height: 110, borderRadius: 32, backgroundColor: logoSrc ? P.white : color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
            {logoSrc ? <Image source={logoSrc} style={{ width: 110, height: 110 }} resizeMode="cover" /> : <Ink size={46} weight="black" color="#FFFFFF">{(name.trim()[0] ?? 'C').toUpperCase()}</Ink>}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Galerie" on={false} onPress={() => pick('gallery')} />
            <Chip label="Appareil photo" on={false} onPress={() => pick('camera')} />
            {logo ? <Chip label="Retirer" on={false} onPress={() => setLogo(null)} /> : null}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Ink size={14} weight="bold" color={c.textSecondary}>Nom du club</Ink>
          <TextInput value={name} onChangeText={setName} placeholder="Ex. Dojo du quartier" placeholderTextColor={c.textMuted} style={{ minHeight: 52, borderRadius: 16, backgroundColor: P.white, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, fontSize: 16, color: c.ink }} />
        </View>

        <View style={{ gap: 8 }}>
          <Ink size={14} weight="bold" color={c.textSecondary}>{`Sport : ${getSportName(sport)}`}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {Array.from(new Set([sport, ...QUICK])).map((id) => (
              <Chip key={id} label={getSportName(id)} on={id === sport} onPress={() => setSport(id)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 48, borderRadius: 16, backgroundColor: P.white, borderWidth: 1, borderColor: c.border }}>
            <Icon name="search" size={18} color={c.textMuted} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Chercher un autre sport" placeholderTextColor={c.textMuted} style={{ flex: 1, fontSize: 15, color: c.ink, paddingVertical: 10 }} />
          </View>
          {results.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {results.map((s) => (
                <Chip key={s.id} label={s.name} on={s.id === sport} onPress={() => { setSport(s.id); setSearch(''); }} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <Ink size={14} weight="bold" color={c.textSecondary}>Ton objectif dans ce sport, si tu en veux un</Ink>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 18, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider }}>
            <Pressable onPress={() => { tap(); setGoalValue((g) => Math.max(0, g - 1)); }} accessibilityRole="button" accessibilityLabel="Une séance de moins" style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={22} weight="black">−</Ink>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Ink size={goal > 0 ? 34 : 20} weight="black" tight>{goal > 0 ? String(goal) : 'Aucun'}</Ink>
              <Ink size={12} weight="bold" color={c.textMuted}>{goal > 0 ? `séance${goal > 1 ? 's' : ''} par semaine` : 'objectif pour l’instant'}</Ink>
            </View>
            <Pressable onPress={() => { tap(); setGoalValue((g) => Math.min(14, g + 1)); }} accessibilityRole="button" accessibilityLabel="Une séance de plus" style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={20} color={c.ink} strokeWidth={2.6} />
            </Pressable>
          </View>
        </View>

        {!logoSrc ? (
          <View style={{ gap: 8 }}>
            <Ink size={14} weight="bold" color={c.textSecondary}>Couleur</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {COLORS.map((col) => (
                <Pressable key={col} onPress={() => { tap(); setColor(col); }} accessibilityRole="button" accessibilityLabel="Choisir cette couleur" accessibilityState={{ selected: col === color }} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: col, borderWidth: col === color ? 3 : 0, borderColor: P.white, shadowColor: c.ink, shadowOpacity: col === color ? 0.25 : 0, shadowRadius: 6 }} />
              ))}
            </View>
          </View>
        ) : null}

        <BigButton label={saving ? 'Enregistrement...' : editingClub ? 'Enregistrer' : 'Ajouter le club'} icon="check" onPress={() => { if (!saving) save(); }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function ClubFormModal({ visible, editingClub, onClose, onSave }: { visible: boolean; editingClub?: Club | null; onClose: () => void; onSave: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible ? <ClubFormContent key={editingClub?.id ?? 'nouveau'} editingClub={editingClub} onCancel={onClose} onDone={() => { onSave(); onClose(); }} /> : null}
    </Modal>
  );
}
