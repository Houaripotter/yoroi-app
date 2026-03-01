// ============================================
// AIDE & TUTORIELS - Redirect vers /guide
// ============================================

import { useEffect } from 'react';
import { router } from 'expo-router';

export default function HelpTutorialsScreen() {
  useEffect(() => {
    router.replace('/guide');
  }, []);

  return null;
}
