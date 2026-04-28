// ============================================
// EVENT DETAIL · page d'un événement du catalogue
// Reçoit les params depuis le planning (catalogue externe)
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  DeviceEventEmitter, Image, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, MapPin, Calendar, ExternalLink, BookmarkPlus, BookmarkCheck, Trophy, Building2 } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { safeOpenURL } from '@/lib/security/validators';
import { SportEvent } from '@/lib/eventsService';
import logger from '@/lib/security/logger';

const SAVED_EVENTS_KEY = 'my_saved_events';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  combat:    { label: 'Combat',    color: '#EF4444' },
  endurance: { label: 'Endurance', color: '#10B981' },
  force:     { label: 'Force',     color: '#F59E0B' },
  nature:    { label: 'Nature',    color: '#8B5CF6' },
  autre:     { label: 'Autre',     color: '#6B7280' },
};

export default function EventDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    date_start: string;
    city?: string;
    country?: string;
    full_address?: string;
    category?: string;
    sport_tag?: string;
    registration_link?: string;
    federation?: string;
    image_logo_url?: string;
  }>();

  const [isSaved, setIsSaved] = useState(false);

  const categoryMeta = CATEGORY_META[params.category || 'autre'] ?? CATEGORY_META.autre;
  const eventDate = params.date_start ? new Date(params.date_start) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysLeft = eventDate ? Math.ceil((eventDate.getTime() - today.getTime()) / 86400000) : null;

  // Vérifier si l'événement est déjà sauvegardé
  const checkSaved = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_EVENTS_KEY);
      if (!raw) { setIsSaved(false); return; }
      const saved: SportEvent[] = JSON.parse(raw);
      setIsSaved(saved.some(e => e.id === params.id));
    } catch (e) {
      logger.warn('[EventDetail] check saved error', e);
    }
  }, [params.id]);

  useEffect(() => { checkSaved(); }, [checkSaved]);

  const toggleSaved = async () => {
    try {
      impactAsync(ImpactFeedbackStyle.Medium);
      const raw = await AsyncStorage.getItem(SAVED_EVENTS_KEY);
      const saved: SportEvent[] = raw ? JSON.parse(raw) : [];
      let next: SportEvent[];

      if (isSaved) {
        next = saved.filter(e => e.id !== params.id);
        setIsSaved(false);
      } else {
        const newEvent: SportEvent = {
          id: params.id,
          title: params.title,
          date_start: params.date_start,
          location: {
            city: params.city || '',
            country: params.country || '',
            full_address: params.full_address || '',
          } as any,
          category: (params.category as any) || 'autre',
          sport_tag: (params.sport_tag as any) || 'jjb',
          registration_link: params.registration_link || '',
          federation: params.federation || null,
          image_logo_url: params.image_logo_url || null,
        };
        next = [...saved, newEvent];
        setIsSaved(true);
      }

      await AsyncStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(next));
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
    } catch (e) {
      logger.error('[EventDetail] toggle saved error', e);
      Alert.alert('Erreur', 'Impossible de sauvegarder cet événement.');
    }
  };

  const openRegistration = async () => {
    if (!params.registration_link) return;
    impactAsync(ImpactFeedbackStyle.Medium);
    const ok = await safeOpenURL(params.registration_link);
    if (!ok) {
      Alert.alert('Lien invalide', "Ce lien d'inscription n'a pas pu être ouvert.");
    }
  };

  const formattedDate = eventDate
    ? eventDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.back(); }}
          style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Événement</Text>
        <TouchableOpacity
          onPress={toggleSaved}
          style={[styles.iconBtn, { backgroundColor: isSaved ? categoryMeta.color + '22' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') }]}
        >
          {isSaved ? (
            <BookmarkCheck size={20} color={categoryMeta.color} />
          ) : (
            <BookmarkPlus size={20} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: categoryMeta.color }]}>
          <View style={[styles.heroOverlay, { backgroundColor: categoryMeta.color }]} />
          {params.image_logo_url ? (
            <Image source={{ uri: params.image_logo_url }} style={styles.heroImage} resizeMode="contain" />
          ) : (
            <View style={styles.heroIconWrap}>
              <Trophy size={64} color="#FFFFFF" />
            </View>
          )}
          {daysLeft !== null && daysLeft >= 0 && (
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownText}>
                {daysLeft === 0 ? "AUJOURD'HUI" : `J-${daysLeft}`}
              </Text>
            </View>
          )}
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          <View style={[styles.categoryPill, { backgroundColor: categoryMeta.color + '18' }]}>
            <Text style={[styles.categoryText, { color: categoryMeta.color }]}>{categoryMeta.label.toUpperCase()}</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{params.title}</Text>

          {/* Infos */}
          <View style={{ gap: 10, marginTop: 16 }}>
            {formattedDate !== '' && (
              <InfoRow
                icon={<Calendar size={18} color={categoryMeta.color} />}
                label="Date"
                value={formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}
                colors={colors}
                isDark={isDark}
              />
            )}

            {(params.city || params.country) && (
              <InfoRow
                icon={<MapPin size={18} color={categoryMeta.color} />}
                label="Lieu"
                value={[params.city, params.country].filter(Boolean).join(', ')}
                colors={colors}
                isDark={isDark}
              />
            )}

            {params.full_address ? (
              <InfoRow
                icon={<MapPin size={18} color={categoryMeta.color} />}
                label="Adresse"
                value={params.full_address}
                colors={colors}
                isDark={isDark}
              />
            ) : null}

            {params.federation ? (
              <InfoRow
                icon={<Building2 size={18} color={categoryMeta.color} />}
                label="Fédération"
                value={params.federation}
                colors={colors}
                isDark={isDark}
              />
            ) : null}
          </View>

          {/* Actions */}
          <View style={{ gap: 10, marginTop: 24 }}>
            {params.registration_link ? (
              <TouchableOpacity
                onPress={openRegistration}
                activeOpacity={0.85}
                style={[styles.primaryBtn, { backgroundColor: categoryMeta.color }]}
              >
                <ExternalLink size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>S'inscrire en ligne</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={toggleSaved}
              activeOpacity={0.85}
              style={[styles.secondaryBtn, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: isSaved ? categoryMeta.color : 'transparent',
                borderWidth: isSaved ? 1.5 : 0,
              }]}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck size={18} color={categoryMeta.color} />
                  <Text style={[styles.secondaryBtnText, { color: categoryMeta.color }]}>
                    Dans mes RDV
                  </Text>
                </>
              ) : (
                <>
                  <BookmarkPlus size={18} color={colors.text} />
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                    Ajouter à mes RDV
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon, label, value, colors, isDark,
}: { icon: React.ReactNode; label: string; value: string; colors: any; isDark: boolean }) {
  return (
    <View style={[styles.infoRow, {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
    }]}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  hero: {
    height: 180,
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2 },
  heroIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroImage: { width: '70%', height: '70%' },
  countdownBadge: {
    position: 'absolute',
    top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
  },
  countdownText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  categoryText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 30 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  infoIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  infoLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '800' },
});
