-- ============================================
-- CONFIGURATION SUPABASE POUR LE SYSTÈME DE RAPPELS
-- ============================================

-- 1. CRÉER LA TABLE user_preferences
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_time TEXT DEFAULT '07:00',
    reminder_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 0=Dim, 1=Lun, ..., 6=Sam
    reminder_type TEXT DEFAULT 'weight', -- 'weight', 'workout', 'both'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id) -- Un seul enregistrement par utilisateur
);

-- 2. CRÉER LES INDEX POUR OPTIMISER LES REQUÊTES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
    ON user_preferences(user_id);

-- 3. ACTIVER ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 4. CRÉER LES POLICIES DE SÉCURITÉ
-- ============================================

-- Policy pour permettre aux utilisateurs de voir leurs propres préférences
CREATE POLICY "Users can view their own preferences"
    ON user_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs d'insérer leurs propres préférences
CREATE POLICY "Users can insert their own preferences"
    ON user_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs de mettre à jour leurs propres préférences
CREATE POLICY "Users can update their own preferences"
    ON user_preferences
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs de supprimer leurs propres préférences
CREATE POLICY "Users can delete their own preferences"
    ON user_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. CRÉER UNE FONCTION POUR METTRE À JOUR LE TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. CRÉER UN TRIGGER POUR AUTO-UPDATE updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que la table a été créée
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'user_preferences';

-- Vérifier les policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_preferences';

-- Vérifier les triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'user_preferences'
AND trigger_schema = 'public';

-- ============================================
-- EXEMPLES D'UTILISATION
-- ============================================

-- Créer ou mettre à jour les préférences d'un utilisateur
-- INSERT INTO user_preferences (user_id, reminder_enabled, reminder_time, reminder_days, reminder_type)
-- VALUES (
--     auth.uid(),
--     true,
--     '07:00',
--     ARRAY[1,2,3,4,5],
--     'weight'
-- )
-- ON CONFLICT (user_id)
-- DO UPDATE SET
--     reminder_enabled = EXCLUDED.reminder_enabled,
--     reminder_time = EXCLUDED.reminder_time,
--     reminder_days = EXCLUDED.reminder_days,
--     reminder_type = EXCLUDED.reminder_type;

-- Récupérer les préférences d'un utilisateur
-- SELECT * FROM user_preferences
-- WHERE user_id = auth.uid();

-- Désactiver les rappels
-- UPDATE user_preferences
-- SET reminder_enabled = false
-- WHERE user_id = auth.uid();

-- Modifier l'heure du rappel
-- UPDATE user_preferences
-- SET reminder_time = '08:00'
-- WHERE user_id = auth.uid();

-- Modifier les jours du rappel (Lundi à Vendredi)
-- UPDATE user_preferences
-- SET reminder_days = ARRAY[1,2,3,4,5]
-- WHERE user_id = auth.uid();

-- Modifier le type de rappel
-- UPDATE user_preferences
-- SET reminder_type = 'both'
-- WHERE user_id = auth.uid();

-- Supprimer les préférences d'un utilisateur
-- DELETE FROM user_preferences
-- WHERE user_id = auth.uid();

-- ============================================
-- FONCTION UTILITAIRE (OPTIONNEL)
-- ============================================

-- Créer une fonction pour sauvegarder les préférences facilement
CREATE OR REPLACE FUNCTION save_user_preferences(
    p_user_id UUID,
    p_reminder_enabled BOOLEAN,
    p_reminder_time TEXT,
    p_reminder_days INTEGER[],
    p_reminder_type TEXT
) RETURNS user_preferences AS $$
DECLARE
    result user_preferences;
BEGIN
    INSERT INTO user_preferences (
        user_id,
        reminder_enabled,
        reminder_time,
        reminder_days,
        reminder_type
    )
    VALUES (
        p_user_id,
        p_reminder_enabled,
        p_reminder_time,
        p_reminder_days,
        p_reminder_type
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        reminder_enabled = EXCLUDED.reminder_enabled,
        reminder_time = EXCLUDED.reminder_time,
        reminder_days = EXCLUDED.reminder_days,
        reminder_type = EXCLUDED.reminder_type
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exemple d'utilisation de la fonction
-- SELECT * FROM save_user_preferences(
--     auth.uid(),
--     true,
--     '07:00',
--     ARRAY[1,2,3,4,5],
--     'weight'
-- );

-- ============================================
-- DONNÉES INITIALES (OPTIONNEL)
-- ============================================

-- Créer une entrée par défaut pour tous les utilisateurs existants
-- INSERT INTO user_preferences (user_id, reminder_enabled, reminder_time, reminder_days, reminder_type)
-- SELECT
--     id,
--     false,
--     '07:00',
--     ARRAY[1,2,3,4,5],
--     'weight'
-- FROM auth.users
-- ON CONFLICT (user_id) DO NOTHING;
