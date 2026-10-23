/**
 * Bandeau de progression pendant l'import des donnees (sauvegarde, Apple Sante).
 * Extrait de l'ancienne barre d'onglets lors de la refonte.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
// 14 octobre 2026 (SANTÉ CONNEXION) : « Import en cours : 120 pesées, 45 séances », même si l'écran s'ouvre en cours d'import
import { lireEtatSante } from '@/lib/v2/sante/importEtat';
import { texteCompte, texteImport } from '@/lib/v2/sante/connexion';
import type { CompteImport } from '@/lib/v2/sante/connexion';
// 16 octobre 2026 : l'import de lancement (filet de securite toutes les 24 h) se fait en discret, sans ce bandeau
import { importDiscretEnCours } from '@/lib/v2/sante/importDiscret';

// ============================================
// IMPORT PROGRESS BANNER
// ============================================
/** 18 octobre 2026 : bandeau coupe a la demande de Houari (mettre true pour le remettre) */
const AFFICHER_BANDEAU = false;

export function ImportProgressBanner() {
  const [visible, setVisible] = useState(false);
  const [stepLabel, setStepLabel] = useState('');
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(7);
  const [compte, setCompte] = useState<CompteImport | null>(null);
  const [fini, setFini] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const { colors } = useTheme();
  const { t } = useI18n();

  const show = useCallback(() => {
    setVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
  }, [slideAnim]);

  const hide = useCallback(() => {
    Animated.timing(slideAnim, { toValue: -60, duration: 300, useNativeDriver: true }).start(() => {
      setVisible(false);
      setCurrent(0);
      setStepLabel('');
    });
  }, [slideAnim]);

  // Import déjà commencé avant l'ouverture de l'écran (fin de l'onboarding)
  useEffect(() => {
    const e = lireEtatSante();
    if (e.import === 'en_cours' && !importDiscretEnCours()) {
      setStepLabel(e.etapeImport || t('import.starting'));
      setCompte(e.compte);
      show();
    }
  }, [show]);

  useEffect(() => {
    const subs = [
      DeviceEventEmitter.addListener('YOROI_IMPORT_START', () => {
        if (importDiscretEnCours()) return;
        setCurrent(0); setStepLabel(t('import.starting')); setTotal(7); setCompte(null); setFini(false);
        show();
      }),
      DeviceEventEmitter.addListener('YOROI_IMPORT_PROGRESS', (data: { step: string; current: number; total: number; compte?: CompteImport }) => {
        if (importDiscretEnCours()) return;
        setStepLabel(data.step); setCurrent(data.current); setTotal(data.total);
        if (data.compte) setCompte(data.compte);
      }),
      DeviceEventEmitter.addListener('YOROI_IMPORT_DONE', (r?: CompteImport) => {
        if (importDiscretEnCours()) return;
        setStepLabel(t('import.importDoneFull')); setCurrent(7); setFini(true);
        if (r && typeof r === 'object') setCompte(r);
        show();
        setTimeout(hide, 3200);
      }),
    ];
    return () => subs.forEach(s => s.remove());
  }, [show, hide]);

  // 18 octobre 2026, Houari : le bandeau d'import en haut de l'ecran au demarrage est supprime.
  // L'import continue en arriere-plan comme avant, seul le bandeau ne s'affiche plus.
  if (!AFFICHER_BANDEAU || !visible) return null;

  const progress = total > 0 ? current / total : 0;

  return (
    <Animated.View style={[bannerStyles.wrap, { transform: [{ translateY: slideAnim }] }]}>
      <View style={[bannerStyles.bar, { backgroundColor: colors.backgroundCard || '#1A1A2E' }]}>
        <View style={bannerStyles.row}>
          <View style={bannerStyles.dot} />
          <Text style={bannerStyles.label} numberOfLines={1}>
            {texteCompte(compte) ? texteImport(!fini, compte) : fini ? stepLabel : t('tabLayout.importLabel').replace('{{step}}', stepLabel)}
          </Text>
          <Text style={bannerStyles.counter}>{current}/{total}</Text>
        </View>
        <View style={bannerStyles.trackBg}>
          <Animated.View style={[bannerStyles.trackFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 999,
    paddingHorizontal: 12,
    paddingTop: 52,
  },
  bar: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginRight: 8,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  counter: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(59,130,246,0.6)',
  },
  trackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(59,130,246,0.15)',
    overflow: 'hidden',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },
});

