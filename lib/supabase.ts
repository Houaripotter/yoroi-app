import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

// ============================================
// 🔒 VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// ✅ Vérification que les variables d'environnement existent
if (!supabaseUrl) {
  throw new Error(
    '❌ EXPO_PUBLIC_SUPABASE_URL is not defined. Please check your .env file.\n' +
    'Create a .env file in the root directory with:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    '❌ EXPO_PUBLIC_SUPABASE_ANON_KEY is not defined. Please check your .env file.\n' +
    'Create a .env file in the root directory with:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
  );
}

// ✅ Validation du format de l'URL
try {
  const url = new URL(supabaseUrl);
  if (!url.hostname.includes('supabase.co') && !url.hostname.includes('localhost')) {
    logger.warn('Supabase URL does not appear to be a valid Supabase domain', { url: supabaseUrl });
  }
} catch (error) {
  throw new Error(`❌ Invalid EXPO_PUBLIC_SUPABASE_URL format: ${supabaseUrl}`);
}

// ✅ Validation du format de la clé (JWT)
if (supabaseAnonKey.split('.').length !== 3) {
  throw new Error(
    '❌ EXPO_PUBLIC_SUPABASE_ANON_KEY does not appear to be a valid JWT token.\n' +
    'Expected format: header.payload.signature'
  );
}

// ============================================
// 🔒 CRÉATION DU CLIENT SUPABASE SÉCURISÉ
// ============================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================
// 🔒 SÉCURITÉ: ROW-LEVEL SECURITY (RLS)
// ============================================

/*
 * IMPORTANT: Pour sécuriser vos données, vous DEVEZ configurer Row-Level Security (RLS)
 * sur toutes vos tables Supabase.
 *
 * Exécutez ces commandes SQL dans votre dashboard Supabase:
 *
 * -- Activer RLS sur la table weight_entries
 * ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
 *
 * -- Politique: Les utilisateurs ne peuvent voir que leurs propres données
 * CREATE POLICY "Users can view their own weight entries"
 *   ON weight_entries FOR SELECT
 *   USING (auth.uid() = user_id);
 *
 * -- Politique: Les utilisateurs ne peuvent insérer que leurs propres données
 * CREATE POLICY "Users can insert their own weight entries"
 *   ON weight_entries FOR INSERT
 *   WITH CHECK (auth.uid() = user_id);
 *
 * -- Politique: Les utilisateurs ne peuvent modifier que leurs propres données
 * CREATE POLICY "Users can update their own weight entries"
 *   ON weight_entries FOR UPDATE
 *   USING (auth.uid() = user_id)
 *   WITH CHECK (auth.uid() = user_id);
 *
 * -- Politique: Les utilisateurs ne peuvent supprimer que leurs propres données
 * CREATE POLICY "Users can delete their own weight entries"
 *   ON weight_entries FOR DELETE
 *   USING (auth.uid() = user_id);
 *
 * -- Ajouter un trigger pour updated_at automatique (non manipulable par le client)
 * CREATE OR REPLACE FUNCTION update_updated_at_column()
 * RETURNS TRIGGER AS $$
 * BEGIN
 *   NEW.updated_at = NOW();
 *   RETURN NEW;
 * END;
 * $$ language 'plpgsql';
 *
 * CREATE TRIGGER update_weight_entries_updated_at
 *   BEFORE UPDATE ON weight_entries
 *   FOR EACH ROW
 *   EXECUTE FUNCTION update_updated_at_column();
 *
 * ⚠️ RÉPÉTEZ ces politiques pour TOUTES vos tables contenant des données utilisateur.
 */

logger.info('Supabase client initialized successfully');
