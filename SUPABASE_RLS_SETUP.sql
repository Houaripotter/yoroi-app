-- ============================================
-- YOROI APP - CONFIGURATION ROW-LEVEL SECURITY
-- ============================================
--
-- Instructions:
-- 1. Connectez-vous à votre dashboard Supabase
-- 2. Allez dans SQL Editor
-- 3. Copiez et exécutez ces commandes SQL
-- 4. Vérifiez que chaque commande s'exécute sans erreur
--
-- ⚠️ CRITIQUE: Sans RLS, vos données sont accessibles par TOUS les utilisateurs !

-- ============================================
-- TABLE: weight_entries
-- ============================================

-- Activer RLS
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : Voir uniquement ses propres données
CREATE POLICY "Users can view their own weight entries"
  ON weight_entries FOR SELECT
  USING (auth.uid() = user_id);

-- Politique INSERT : Créer uniquement ses propres données
CREATE POLICY "Users can insert their own weight entries"
  ON weight_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique UPDATE : Modifier uniquement ses propres données
CREATE POLICY "Users can update their own weight entries"
  ON weight_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique DELETE : Supprimer uniquement ses propres données
CREATE POLICY "Users can delete their own weight entries"
  ON weight_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER: updated_at automatique
-- ============================================

-- Fonction de mise à jour automatique (non manipulable par le client)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger sur weight_entries
DROP TRIGGER IF EXISTS update_weight_entries_updated_at ON weight_entries;
CREATE TRIGGER update_weight_entries_updated_at
  BEFORE UPDATE ON weight_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUTRES TABLES (si elles existent sur Supabase)
-- ============================================

-- Note: Les tables suivantes sont gérées en local SQLite dans votre app.
-- Si vous décidez de les migrer vers Supabase, appliquez les mêmes politiques RLS.

-- Exemple pour une table "trainings" (si migrée vers Supabase) :
/*
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trainings"
  ON trainings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trainings"
  ON trainings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trainings"
  ON trainings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trainings"
  ON trainings FOR DELETE
  USING (auth.uid() = user_id);
*/

-- ============================================
-- VÉRIFICATION DE LA CONFIGURATION
-- ============================================

-- Vérifier que RLS est activé
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('weight_entries')
  AND schemaname = 'public';

-- Résultat attendu : rowsecurity = true

-- Lister toutes les politiques RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('weight_entries')
  AND schemaname = 'public';

-- Résultat attendu : 4 politiques (SELECT, INSERT, UPDATE, DELETE)

-- ============================================
-- TEST DE SÉCURITÉ
-- ============================================

-- Pour tester que RLS fonctionne correctement :
-- 1. Créez deux comptes utilisateur dans Supabase Auth
-- 2. Authentifiez-vous en tant que User A
-- 3. Créez une entrée de poids
-- 4. Authentifiez-vous en tant que User B
-- 5. Essayez de lire les données de User A
-- 6. Résultat attendu : Aucune donnée visible

-- ============================================
-- DÉPANNAGE
-- ============================================

-- Si vous voyez des données d'autres utilisateurs :
-- 1. Vérifiez que RLS est activé (rowsecurity = true)
-- 2. Vérifiez que les politiques existent (4 politiques)
-- 3. Vérifiez que auth.uid() retourne bien l'ID de l'utilisateur connecté
-- 4. Vérifiez que votre table a bien une colonne user_id de type UUID

-- Pour supprimer toutes les politiques et recommencer :
/*
DROP POLICY IF EXISTS "Users can view their own weight entries" ON weight_entries;
DROP POLICY IF EXISTS "Users can insert their own weight entries" ON weight_entries;
DROP POLICY IF EXISTS "Users can update their own weight entries" ON weight_entries;
DROP POLICY IF EXISTS "Users can delete their own weight entries" ON weight_entries;
*/

-- ============================================
-- NOTES IMPORTANTES
-- ============================================

-- 1. Les politiques RLS s'appliquent UNIQUEMENT côté serveur (Supabase)
-- 2. Le code client (supabase-helpers.ts) a également des checks de sécurité
-- 3. Les deux couches de sécurité (client + serveur) sont nécessaires
-- 4. RLS est la dernière ligne de défense contre les accès non autorisés
-- 5. TOUJOURS tester vos politiques RLS avec plusieurs comptes utilisateur

-- ============================================
-- FIN DE LA CONFIGURATION
-- ============================================

-- Si toutes les commandes se sont exécutées sans erreur,
-- vos données sont maintenant sécurisées avec Row-Level Security !
