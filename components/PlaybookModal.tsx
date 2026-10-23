// ============================================
// YOROI : Modal bibliothèque de game plans
// Propose des templates pré-faits + templates perso
// sauvegardés dans AsyncStorage
// ============================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, Search, Check, Plus, Star, Trash2, Save } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import {
  PlaybookEntry,
  PlaybookCategory,
  PLAYBOOK_BY_FIELD,
  FIELD_LABELS,
  filterBySport,
  CUSTOM_STORAGE_KEY,
  CustomTemplate,
} from '@/lib/combatPlaybook';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';

interface PlaybookModalProps {
  visible: boolean;
  onClose: () => void;
  fieldKey: string;
  sportId: string;
  currentValue: string;
  onSelect: (text: string, appendMode: 'replace' | 'append') => void;
}

export default function PlaybookModal({
  visible,
  onClose,
  fieldKey,
  sportId,
  currentValue,
  onSelect,
}: PlaybookModalProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [newTemplateText, setNewTemplateText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const fieldMeta = FIELD_LABELS[fieldKey] ?? { title: 'Bibliothèque', emoji: '', color: '#8B5CF6' };
  const rawCategories = PLAYBOOK_BY_FIELD[fieldKey] ?? [];

  // Charger les templates perso
  useEffect(() => {
    if (!visible || !fieldKey) return;
    AsyncStorage.getItem(CUSTOM_STORAGE_KEY(fieldKey)).then(raw => {
      if (raw) {
        try {
          setCustomTemplates(JSON.parse(raw));
        } catch {
          setCustomTemplates([]);
        }
      } else {
        setCustomTemplates([]);
      }
    });
    // Reset UI state à chaque ouverture
    setSearch('');
    setShowAddForm(false);
    setNewTemplateText('');
    // Par défaut : "Tout" sélectionné (selectedCategory = null)
    // L'utilisateur voit toutes les catégories filtrées par sport
    setSelectedCategory(null);
  }, [visible, fieldKey, sportId]);

  const saveCustomTemplates = async (templates: CustomTemplate[]) => {
    setCustomTemplates(templates);
    try {
      await AsyncStorage.setItem(CUSTOM_STORAGE_KEY(fieldKey), JSON.stringify(templates));
    } catch { /* silent */ }
  };

  // Filtre par sport
  const filteredCategories: PlaybookCategory[] = useMemo(() => {
    return filterBySport(rawCategories, sportId);
  }, [rawCategories, sportId]);

  // Filtre par recherche
  const displayCategories = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) {
      if (selectedCategory === '_custom') return [];
      return selectedCategory
        ? filteredCategories.filter(c => c.id === selectedCategory)
        : filteredCategories;
    }
    return filteredCategories
      .map(cat => ({
        ...cat,
        entries: cat.entries.filter(e => e.text.toLowerCase().includes(s) || e.description?.toLowerCase().includes(s)),
      }))
      .filter(cat => cat.entries.length > 0);
  }, [filteredCategories, search, selectedCategory]);

  const filteredCustom = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return customTemplates;
    return customTemplates.filter(t => t.text.toLowerCase().includes(s));
  }, [customTemplates, search]);

  const totalEntries = filteredCategories.reduce((sum, cat) => sum + cat.entries.length, 0);
  const hasCurrent = currentValue.trim().length > 0;

  const handleSelect = (text: string) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    onSelect(text, hasCurrent ? 'append' : 'replace');
    onClose();
  };

  const addCustomTemplate = () => {
    const text = newTemplateText.trim();
    if (!text) return;
    const newT: CustomTemplate = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text,
      createdAt: new Date().toISOString(),
    };
    saveCustomTemplates([newT, ...customTemplates]);
    setNewTemplateText('');
    setShowAddForm(false);
    impactAsync(ImpactFeedbackStyle.Medium);
  };

  const deleteCustomTemplate = (id: string) => {
    appAlert('Supprimer ce modèle ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          impactAsync(ImpactFeedbackStyle.Heavy);
          saveCustomTemplates(customTemplates.filter(t => t.id !== id));
        },
      },
    ]);
  };

  // Afficher les customs si onglet "_custom" sélectionné OU si onglet "Tout"
  const showCustom = !search
    ? selectedCategory === null || selectedCategory === '_custom'
    : filteredCustom.length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: isDark ? '#0a0a0a' : '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '92%',
              minHeight: '65%',
              paddingBottom: insets.bottom + 16,
              overflow: 'hidden',
            }}
          >
            {/* ── Header gradient ── */}
            <LinearGradient
              colors={[fieldMeta.color, `${fieldMeta.color}CC`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingHorizontal: 16, paddingVertical: 16 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{fieldMeta.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 }}>
                    BIBLIOTHÈQUE : {sportId.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 0.3 }}>
                    {fieldMeta.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <X size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                  }}
                >
                  <Search size={14} color="rgba(255,255,255,0.8)" />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={`Rechercher dans ${totalEntries} templates...`}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    style={{ flex: 1, color: '#fff', fontSize: 13, padding: 0 }}
                    autoCorrect={false}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <X size={14} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </LinearGradient>

            {/* ── Catégories (tabs) ── */}
            {!search && (
              <View
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 14, gap: 7 }}
                >
                  {/* "Tout voir" */}
                  <TouchableOpacity
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setSelectedCategory(null);
                    }}
                    style={{
                      backgroundColor: !selectedCategory ? fieldMeta.color : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      borderRadius: 18,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}></Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: !selectedCategory ? '#fff' : colors.textMuted ?? '#888' }}>
                      Tout ({totalEntries})
                    </Text>
                  </TouchableOpacity>

                  {/* Mes templates */}
                  <TouchableOpacity
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setSelectedCategory('_custom');
                    }}
                    style={{
                      backgroundColor: selectedCategory === '_custom' ? '#F59E0B' : isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)',
                      borderRadius: 18,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      borderWidth: selectedCategory === '_custom' ? 0 : 1,
                      borderColor: 'rgba(245,158,11,0.3)',
                    }}
                  >
                    <Star size={11} color={selectedCategory === '_custom' ? '#fff' : '#F59E0B'} fill={selectedCategory === '_custom' ? '#fff' : '#F59E0B'} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: selectedCategory === '_custom' ? '#fff' : '#F59E0B' }}>
                      Mes templates ({customTemplates.length})
                    </Text>
                  </TouchableOpacity>

                  {/* Catégories */}
                  {filteredCategories.map(cat => {
                    const active = selectedCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          impactAsync(ImpactFeedbackStyle.Light);
                          setSelectedCategory(cat.id);
                        }}
                        style={{
                          backgroundColor: active ? fieldMeta.color : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          borderRadius: 18,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Text style={{ fontSize: 12 }}>{cat.emoji}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#fff' : colors.text }}>
                          {cat.label}
                        </Text>
                        <Text style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.7)' : colors.textMuted ?? '#888' }}>
                          ({cat.entries.length})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ── Contenu ── */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
              {/* ⭐ Section MES TEMPLATES PERSO */}
              {showCustom && (
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#F59E0B', letterSpacing: 0.5, flex: 1 }}>
                      MES TEMPLATES PERSO
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        impactAsync(ImpactFeedbackStyle.Light);
                        setShowAddForm(v => !v);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: '#F59E0B',
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}
                    >
                      <Plus size={11} color="#fff" strokeWidth={3} />
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>Créer</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Formulaire d'ajout */}
                  {showAddForm && (
                    <View
                      style={{
                        backgroundColor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(245,158,11,0.3)',
                      }}
                    >
                      <TextInput
                        value={newTemplateText}
                        onChangeText={setNewTemplateText}
                        placeholder={`Ton ${fieldMeta.title.toLowerCase()} perso...`}
                        placeholderTextColor={colors.textMuted ?? '#888'}
                        style={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          fontSize: 13,
                          color: colors.text,
                          minHeight: 50,
                          textAlignVertical: 'top',
                          borderWidth: 1,
                          borderColor: 'rgba(245,158,11,0.3)',
                        }}
                        multiline
                        autoFocus
                      />
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity
                          onPress={() => { setShowAddForm(false); setNewTemplateText(''); }}
                          style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted ?? '#888' }}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={addCustomTemplate}
                          disabled={!newTemplateText.trim()}
                          style={{ flex: 2, backgroundColor: newTemplateText.trim() ? '#F59E0B' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'), borderRadius: 10, paddingVertical: 9, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 }}
                        >
                          <Save size={12} color="#fff" />
                          <Text style={{ fontSize: 12, fontWeight: '900', color: '#fff' }}>Sauvegarder</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Liste des templates perso */}
                  {filteredCustom.length === 0 && !showAddForm && (
                    <View
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        borderRadius: 12,
                        padding: 18,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderStyle: 'dashed',
                        borderColor: 'rgba(245,158,11,0.3)',
                      }}
                    >
                      <Star size={24} color="#F59E0B" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 8, textAlign: 'center' }}>
                        Aucun template perso
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888', marginTop: 4, textAlign: 'center', lineHeight: 15 }}>
                        Crée tes propres templates pour les retrouver plus vite la prochaine fois.
                      </Text>
                    </View>
                  )}

                  {filteredCustom.map(tpl => (
                    <View
                      key={tpl.id}
                      style={{
                        backgroundColor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(245,158,11,0.3)',
                        borderLeftWidth: 3,
                        borderLeftColor: '#F59E0B',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Star size={12} color="#F59E0B" fill="#F59E0B" style={{ marginTop: 2 }} />
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 18 }}>
                          {tpl.text}
                        </Text>
                        <TouchableOpacity
                          onPress={() => deleteCustomTemplate(tpl.id)}
                          style={{ padding: 2 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={13} color={colors.textMuted ?? '#888'} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleSelect(tpl.text)}
                        style={{
                          marginTop: 8,
                          backgroundColor: '#F59E0B',
                          borderRadius: 10,
                          paddingVertical: 7,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <Plus size={11} color="#fff" strokeWidth={3} />
                        <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>
                          {hasCurrent ? 'AJOUTER AU CHAMP' : 'UTILISER'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Bibliothèque (si pas _custom sélectionné) */}
              {(selectedCategory !== '_custom' || search) && displayCategories.map(cat => (
                <View key={cat.id} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: colors.text, letterSpacing: 0.5, flex: 1 }}>
                      {cat.label.toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', fontWeight: '700' }}>
                      {cat.entries.length}
                    </Text>
                  </View>

                  {cat.entries.map(entry => {
                    const alreadyInValue = currentValue.toLowerCase().includes(entry.text.toLowerCase());
                    return (
                      <TouchableOpacity
                        key={entry.id}
                        onPress={() => handleSelect(entry.text)}
                        activeOpacity={0.8}
                        style={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          borderRadius: 12,
                          padding: 12,
                          marginBottom: 6,
                          borderWidth: 1,
                          borderColor: alreadyInValue ? `${fieldMeta.color}50` : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                          borderLeftWidth: 3,
                          borderLeftColor: fieldMeta.color,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 18 }}>
                            {entry.text}
                          </Text>
                          {entry.description && (
                            <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888', marginTop: 3, fontStyle: 'italic', lineHeight: 15 }}>
                              {entry.description}
                            </Text>
                          )}
                        </View>
                        {alreadyInValue ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Check size={12} color={fieldMeta.color} strokeWidth={3} />
                          </View>
                        ) : (
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: fieldMeta.color, justifyContent: 'center', alignItems: 'center' }}>
                            <Plus size={14} color="#fff" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {/* État vide */}
              {displayCategories.length === 0 && filteredCustom.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
                  <Search size={30} color={colors.textMuted ?? '#888'} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                    Aucun résultat
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
