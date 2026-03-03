// ============================================
// 🔒 HOOK SAFE BUTTON - YOROI
// ============================================
// Hook ultra simple pour sécuriser n'importe quel bouton
// Empêche le spam et gère l'état loading automatiquement

import { usePreventDoubleClick } from './usePreventDoubleClick';

/**
 * Hook simplifié pour créer des boutons sécurisés
 *
 * @param onPress - Fonction à exécuter (peut être async)
 * @param delay - Délai minimum entre deux clics (défaut: 500ms)
 *
 * @returns {onPress, disabled, isProcessing}
 *
 * @example
 * const handleSave = async () => {
 *   await saveUserData();
 * };
 *
 * const saveBtn = useSafeButton(handleSave);
 *
 * <TouchableOpacity onPress={saveBtn.onPress} disabled={saveBtn.disabled}>
 *   <Text>{saveBtn.isProcessing ? 'Sauvegarde...' : 'Sauvegarder'}</Text>
 * </TouchableOpacity>
 */
export const useSafeButton = (
  onPress: () => Promise<void> | void,
  delay = 500
) => {
  const { isProcessing, executeOnce } = usePreventDoubleClick({ delay });

  return {
    onPress: () => executeOnce(onPress),
    disabled: isProcessing,
    isProcessing,
  };
};

// ============================================
// EXEMPLES D'UTILISATION
// ============================================

/*
EXEMPLE 1 - Bouton de sauvegarde simple
========================================

import { useSafeButton } from '@/hooks/useSafeButton';

const MyScreen = () => {
  const handleSave = async () => {
    await saveData();
    router.push('/success');
  };

  const saveBtn = useSafeButton(handleSave);

  return (
    <TouchableOpacity onPress={saveBtn.onPress} disabled={saveBtn.disabled}>
      <Text>{saveBtn.isProcessing ? 'Sauvegarde...' : 'Sauvegarder'}</Text>
    </TouchableOpacity>
  );
};


EXEMPLE 2 - Bouton avec délai personnalisé
===========================================

const MyScreen = () => {
  const handleSubmit = async () => {
    await submitForm();
  };

  // Délai de 1 seconde au lieu de 500ms par défaut
  const submitBtn = useSafeButton(handleSubmit, 1000);

  return (
    <TouchableOpacity
      onPress={submitBtn.onPress}
      disabled={submitBtn.disabled}
      style={[styles.button, submitBtn.isProcessing && styles.buttonDisabled]}
    >
      {submitBtn.isProcessing ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text>Envoyer</Text>
      )}
    </TouchableOpacity>
  );
};


EXEMPLE 3 - Bouton de navigation
==================================

const MyScreen = () => {
  const handleNavigate = async () => {
    // Sauvegarder avant de naviguer
    await AsyncStorage.setItem('lastVisit', Date.now().toString());
    router.push('/next-screen');
  };

  const navBtn = useSafeButton(handleNavigate);

  return (
    <TouchableOpacity onPress={navBtn.onPress} disabled={navBtn.disabled}>
      <Text>Continuer</Text>
      <ChevronRight />
    </TouchableOpacity>
  );
};


EXEMPLE 4 - Multiple boutons dans le même écran
=================================================

const MyScreen = () => {
  const handleSave = async () => { await saveData(); };
  const handleDelete = async () => { await deleteData(); };
  const handleShare = async () => { await shareData(); };

  const saveBtn = useSafeButton(handleSave);
  const deleteBtn = useSafeButton(handleDelete);
  const shareBtn = useSafeButton(handleShare);

  return (
    <View>
      <TouchableOpacity onPress={saveBtn.onPress} disabled={saveBtn.disabled}>
        <Text>Sauvegarder</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={deleteBtn.onPress} disabled={deleteBtn.disabled}>
        <Text>Supprimer</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={shareBtn.onPress} disabled={shareBtn.disabled}>
        <Text>Partager</Text>
      </TouchableOpacity>
    </View>
  );
};


EXEMPLE 5 - Avec le composant SafeButton existant
===================================================

Si tu préfères utiliser un composant tout prêt au lieu du hook,
utilise directement le composant SafeButton de usePreventDoubleClick.tsx :

import { SafeButton } from '@/hooks/usePreventDoubleClick';

const MyScreen = () => {
  const handleSave = async () => {
    await saveData();
  };

  return (
    <SafeButton
      onPress={handleSave}
      title="Sauvegarder"
      variant="primary"
      delay={800}
    />
  );
};

*/

export default useSafeButton;
