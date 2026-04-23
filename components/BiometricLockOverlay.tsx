// ============================================
// BIOMETRIC LOCK OVERLAY · Affiche pendant l'auth
// ============================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AppState, TouchableOpacity } from 'react-native';
import { Fingerprint, Lock } from 'lucide-react-native';
import { authenticateIfNeeded, isBiometricLockEnabled } from '@/lib/biometricLockService';

export const BiometricLockOverlay: React.FC = () => {
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const enabled = await isBiometricLockEnabled();
      if (!enabled) {
        setLocked(false);
        setChecking(false);
        return;
      }
      setLocked(true);
      const ok = await authenticateIfNeeded();
      if (ok) {
        setLocked(false);
      }
      setChecking(false);
    };
    check();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        check();
      }
    });
    return () => sub.remove();
  }, []);

  const retry = async () => {
    const ok = await authenticateIfNeeded();
    if (ok) setLocked(false);
  };

  if (!locked || checking) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.iconCircle}>
        <Lock size={56} color="#D4AF37" strokeWidth={2} />
      </View>
      <Text style={styles.title}>Yoroi est verrouille</Text>
      <Text style={styles.sub}>Authentifie-toi avec FaceID ou TouchID</Text>
      <TouchableOpacity style={styles.btn} onPress={retry} activeOpacity={0.85}>
        <Fingerprint size={22} color="#1a1a2e" />
        <Text style={styles.btnText}>Deverrouiller</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  iconCircle: {
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212,175,55,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8, marginBottom: 32 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },
  btnText: { color: '#1a1a2e', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});

export default BiometricLockOverlay;
