import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// ============================================
// REDIRECTION VERS ECRAN UNIFIE
// ============================================
// Les mensurations sont maintenant integrees dans entry.tsx
// Ce fichier redirige automatiquement vers la page unifiee

export default function AddMeasurementRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers la page de saisie unifiee
    router.replace('/entry');
  }, []);

  return null;
}
