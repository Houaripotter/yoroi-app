import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Platform, Alert, Keyboard } from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { SPORTS, getSportIcon } from '@/lib/sports';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { selectionAsync, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { addClub } from '@/lib/database';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import { ChevronLeft, Plus, Check, Camera, ChevronDown, ChevronRight, X } from 'lucide-react-native';
import { logger } from '@/lib/security/logger';

export default function AddClubScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [selectedColor, setSelectedColor] = useState('#D4AF37');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [nameError, setNameError] = useState('');
  const [sportError, setSportError] = useState('');

  const CLUB_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#22C55E',
    '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6',
    '#A855F7', '#EC4899', '#6B7280', '#D4AF37',
  ];

  const handlePickImage = async () => {
    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setLogo(result.assets?.[0]?.uri || null);
    }
  };

  const toggleCategory = (category: string) => {
    selectionAsync();
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = async () => {
    Keyboard.dismiss();

    // Réinitialiser les erreurs
    setNameError('');
    setSportError('');

    // Validation
    let hasError = false;
    if (!name.trim()) {
      setNameError('Le nom du club est obligatoire');
      hasError = true;
    }
    if (!selectedSport) {
      setSportError('Veuillez choisir un sport');
      hasError = true;
    }

    if (hasError) {
      notificationAsync(NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      await addClub({
        name: name.trim(),
        sport: selectedSport,
        logo_uri: logo || undefined,
        color: selectedColor,
        sessions_per_week: sessionsPerWeek,
      });
      notificationAsync(NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      logger.error('Erreur création club:', error);
      Alert.alert('Erreur', "Impossible de créer le club. Réessaye dans quelques instants.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    cardio: 'Cardio',
    fitness: 'Musculation & Fitness',
    combat_grappling: 'Combat (Grappling)',
    combat_striking: 'Combat (Pieds-Poings)',
    danse: 'Danse',
    collectif: 'Sports Collectifs',
    raquettes: 'Raquettes',
    glisse: 'Sports de Glisse',
    nature: 'Sports Nature',
    autre: 'Autres',
  };

  const categoryIcons: Record<string, string> = {
    cardio: 'run-fast',
    fitness: 'dumbbell',
    combat_grappling: 'kabaddi',
    combat_striking: 'boxing-glove',
    danse: 'dance-ballroom',
    collectif: 'soccer',
    raquettes: 'tennis',
    glisse: 'snowboard',
    nature: 'hiking',
    autre: 'dots-horizontal',
  };

  const categoryColors: Record<string, string> = {
    cardio: '#10B981',
    fitness: '#8B5CF6',
    combat_grappling: '#3B82F6',
    combat_striking: '#EF4444',
    danse: '#EC4899',
    collectif: '#F59E0B',
    raquettes: '#06B6D4',
    glisse: '#0EA5E9',
    nature: '#22C55E',
    autre: '#6B7280',
  };

  // NOUVEL ORDRE : Cardio > Musculation > Combat > Danse > reste
  const categoriesList = ['cardio', 'fitness', 'combat_grappling', 'combat_striking', 'danse', 'collectif', 'raquettes', 'glisse', 'nature', 'autre'];

  return (
    <ScreenWrapper>
      {/* En-tête avec retour */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 20 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.backgroundElevated,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            borderWidth: 1,
            borderColor: colors.border
          }}
        >
          <ChevronLeft size={24} color={colors.accent} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 }}>Nouveau Club</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>Crée ton club en quelques étapes</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}>
        
        {/* 1. NOM */}
        <Text style={[styles.sectionTitle, { color: isDark ? colors.accent : colors.textPrimary, fontWeight: '800', fontSize: 14, letterSpacing: 1, marginBottom: 12 }]}>1. NOM DU CLUB</Text>
        <View style={{
          backgroundColor: colors.backgroundCard,
          padding: 18,
          borderRadius: 20,
          borderWidth: nameError ? 2 : 1,
          borderColor: nameError ? '#EF4444' : colors.border,
          marginBottom: nameError ? 8 : 24,
          shadowColor: colors.accent,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4
        }}>
          <TextInput
            style={{ fontSize: 18, fontWeight: '600', color: colors.textPrimary }}
            placeholder="Ex: Gracie Barra, Basic-Fit..."
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError('');
            }}
            maxLength={100}
          />
        </View>
        {nameError && (
          <View style={{ backgroundColor: '#EF444420', borderLeftWidth: 3, borderLeftColor: '#EF4444', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <X size={14} color="#EF4444" strokeWidth={2.5} />
              <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>{nameError}</Text>
            </View>
          </View>
        )}

        {/* 2. LOGO */}
        <Text style={[styles.sectionTitle, { color: isDark ? colors.accent : colors.textPrimary, fontWeight: '800', fontSize: 14, letterSpacing: 1, marginBottom: 12 }]}>2. LOGO (OPTIONNEL)</Text>
        <View style={{
          backgroundColor: colors.backgroundCard,
          padding: 18,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 24,
          shadowColor: colors.accent,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={handlePickImage}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: selectedColor, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                {logo ? (
                  <Image source={{ uri: logo }} style={{ width: 80, height: 80 }} resizeMode="contain" />
                ) : (
                  selectedSport ? (
                    <View style={{ width: 80, height: 80, backgroundColor: selectedColor, justifyContent: 'center', alignItems: 'center' }}>
                        <MaterialCommunityIcons name={getSportIcon(selectedSport) as any} size={40} color="#FFF" />
                    </View>
                  ) : (
                    <Camera size={24} color="#FFF" />
                  )
                )}
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 8 }}>
                Touche le cercle pour choisir une photo ou une couleur de fond.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CLUB_COLORS.slice(0, 6).map(c => (
                  <TouchableOpacity 
                    key={c} 
                    onPress={() => setSelectedColor(c)}
                    style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c, borderWidth: selectedColor === c ? 2 : 0, borderColor: colors.textPrimary }} 
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 3. SPORT */}
        <Text style={[styles.sectionTitle, { color: isDark ? colors.accent : colors.textPrimary, fontWeight: '800', fontSize: 14, letterSpacing: 1, marginBottom: 12 }]}>3. SPORT PRINCIPAL</Text>

        <View style={{ marginBottom: 16 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.backgroundCard,
            borderWidth: 1,
            borderColor: colors.border,
            height: 54,
            borderRadius: 18,
            paddingHorizontal: 16,
            gap: 12,
            shadowColor: colors.accent,
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2
          }}>
            <MaterialCommunityIcons name="magnify" size={24} color={colors.accent} />
            <TextInput
              style={{ flex: 1, color: colors.textPrimary, fontSize: 16 }}
              placeholder="Rechercher un sport..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              maxLength={50}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, overflow: 'hidden', marginBottom: 20 }}>
          {(() => {
            const filteredCategories = categoriesList.filter(category => {
              let sports = SPORTS.filter(s => s.category === category);
              if (searchQuery.length > 0) {
                sports = sports.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
              }
              return sports.length > 0;
            });

            if (filteredCategories.length === 0 && searchQuery.length > 0) {
              return (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Aucun sport trouvé pour "{searchQuery}"</Text>
                </View>
              );
            }

            return filteredCategories.map((category) => {
                let sportsInCategory = SPORTS.filter(s => s.category === category);
                if (searchQuery.length > 0) {
                  sportsInCategory = sportsInCategory.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
                }
                if (sportsInCategory.length === 0) return null;

                const isExpanded = expandedCategories.includes(category) || searchQuery.length > 0;
                const hasSelectedSport = sportsInCategory.some(s => s.id === selectedSport);
                const catColor = categoryColors[category] || '#6B7280';

                return (
                  <View key={category} style={styles.categorySection}>
                    <TouchableOpacity
                      style={[
                        styles.categoryHeader,
                        { backgroundColor: isExpanded ? catColor + '10' : colors.backgroundElevated, borderColor: hasSelectedSport ? catColor : colors.border },
                        hasSelectedSport && { borderColor: catColor }
                      ]}
                      onPress={() => toggleCategory(category)}
                    >
                      <View style={styles.categoryHeaderLeft}>
                        <View style={[styles.categoryIconBadge, { backgroundColor: catColor + '20' }]}>
                          <MaterialCommunityIcons name={categoryIcons[category] as any} size={20} color={catColor} />
                        </View>
                        <Text style={[styles.categoryLabel, { color: hasSelectedSport ? catColor : colors.textPrimary }]}>
                          {categoryLabels[category]}
                        </Text>
                      </View>
                      <View style={styles.categoryHeaderRight}>
                        <Text style={[styles.categorySportCount, { color: colors.textMuted }]}>{sportsInCategory.length}</Text>
                        {isExpanded ? <ChevronDown size={20} color={colors.textMuted} /> : <ChevronRight size={20} color={colors.textMuted} />}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.sportsGrid}>
                        {sportsInCategory.map((sport) => {
                          const isSelected = selectedSport === sport.id;
                          return (
                            <TouchableOpacity
                              key={sport.id}
                              style={[
                                styles.sportGridItem,
                                { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
                                isSelected && { borderColor: colors.gold, backgroundColor: colors.gold + '15' },
                              ]}
                              onPress={() => setSelectedSport(sport.id)}
                            >
                              <View style={[styles.sportGridIcon, { backgroundColor: sport.color + '20' }]}>
                                <MaterialCommunityIcons name={sport.icon as any} size={28} color={isSelected ? colors.gold : sport.color} />
                              </View>
                              <Text style={[styles.sportGridName, { color: colors.textPrimary }, isSelected && { color: colors.gold, fontWeight: '700' }]} numberOfLines={1}>
                                {sport.name}
                              </Text>
                              {isSelected && (
                                <View style={[styles.sportGridCheck, { backgroundColor: colors.gold }]}>
                                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
            });
          })()}
        </View>

        {/* 4. OBJECTIF HEBDOMADAIRE */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>4. Objectif Hebdomadaire</Text>
        <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>Combien de fois par semaine souhaites-tu t'entraîner ?</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <TouchableOpacity 
              onPress={() => setSessionsPerWeek(Math.max(1, sessionsPerWeek - 1))}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.backgroundElevated, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 24 }}>-</Text>
            </TouchableOpacity>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.gold, fontSize: 32, fontWeight: '900' }}>{sessionsPerWeek}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}>SÉANCES / SEM.</Text>
            </View>

            <TouchableOpacity 
              onPress={() => setSessionsPerWeek(Math.min(7, sessionsPerWeek + 1))}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.backgroundElevated, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 24 }}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Estimation annuelle : <Text style={{ color: colors.gold, fontWeight: '800' }}>{sessionsPerWeek * 52} JOURS</Text></Text>
          </View>
        </View>

        <TouchableOpacity
          style={{ backgroundColor: colors.accent, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20, opacity: (!name.trim() || !selectedSport) ? 0.5 : 1 }}
          disabled={!name.trim() || !selectedSport || isSubmitting}
          onPress={handleSave}
        >
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Créer le club</Text>
        </TouchableOpacity>

      </ScrollView>
    </ScreenWrapper>
  );
}

// Import centralisés depuis constants/design
import { RADIUS, SPACING } from '@/constants/design';

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 10 },
  categorySection: { marginBottom: SPACING.md },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1 },
  categoryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  categoryIconBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  categorySportCount: { fontSize: 12, fontWeight: '600' },
  sportsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 4, marginTop: 8 },
  sportGridItem: { width: '23.5%', aspectRatio: 0.85, borderRadius: 14, borderWidth: 1, padding: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4, position: 'relative' },
  sportGridIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  sportGridName: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  sportGridCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
