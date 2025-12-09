-- ============================================
-- CONFIGURATION SUPABASE POUR LE SYSTÈME DE BADGES
-- ============================================

-- 1. CRÉER LA TABLE user_badges
-- ============================================
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, badge_id) -- Un utilisateur ne peut débloquer qu'une fois chaque badge
);

-- 2. CRÉER LES INDEX POUR OPTIMISER LES REQUÊTES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id
    ON user_badges(user_id);

CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id
    ON user_badges(badge_id);

CREATE INDEX IF NOT EXISTS idx_user_badges_unlocked_at
    ON user_badges(unlocked_at DESC);

-- 3. ACTIVER ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- 4. CRÉER LES POLICIES DE SÉCURITÉ
-- ============================================

-- Policy pour permettre aux utilisateurs de voir leurs propres badges
CREATE POLICY "Users can view their own badges"
    ON user_badges
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs d'insérer leurs propres badges
CREATE POLICY "Users can insert their own badges"
    ON user_badges
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy pour empêcher les utilisateurs de supprimer ou modifier leurs badges
-- (Les badges une fois débloqués ne peuvent pas être supprimés)
-- Si vous voulez permettre la suppression, décommentez les lignes ci-dessous :
/*
CREATE POLICY "Users can delete their own badges"
    ON user_badges
    FOR DELETE
    USING (auth.uid() = user_id);
*/

-- ============================================
-- LISTE DES BADGES DISPONIBLES
-- ============================================

-- DÉBUTANT :
-- - first_weight : "Première pesée" 🎯 - Enregistrer sa première mesure
-- - first_workout : "Premier entraînement" 💪 - Enregistrer son premier entraînement
-- - complete_profile : "Profil complet" 👤 - Remplir toutes les infos du profil

-- RÉGULARITÉ :
-- - streak_7 : "7 jours consécutifs" 🔥 - Se peser 7 jours de suite
-- - streak_30 : "30 jours consécutifs" ⭐ - Se peser 30 jours de suite
-- - workout_month : "Sportif du mois" 🏅 - 20 entraînements dans le mois

-- PROGRESSION :
-- - lost_1kg : "Premier kilo perdu" 📉 - Perdre 1 kg
-- - lost_5kg : "5 kilos perdus" 🎉 - Perdre 5 kg
-- - goal_reached : "Objectif atteint" 🏆 - Atteindre son poids cible

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que la table a été créée
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'user_badges';

-- Vérifier les policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_badges';

-- Vérifier les index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_badges'
AND schemaname = 'public';

-- ============================================
-- EXEMPLES D'UTILISATION
-- ============================================

-- Débloquer un badge pour un utilisateur
-- INSERT INTO user_badges (user_id, badge_id)
-- VALUES (auth.uid(), 'first_weight')
-- ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Récupérer tous les badges d'un utilisateur
-- SELECT * FROM user_badges
-- WHERE user_id = auth.uid()
-- ORDER BY unlocked_at DESC;

-- Récupérer les badges débloqués récemment (dernières 24h)
-- SELECT * FROM user_badges
-- WHERE user_id = auth.uid()
-- AND unlocked_at > NOW() - INTERVAL '24 hours'
-- ORDER BY unlocked_at DESC;

-- Compter le nombre de badges débloqués par catégorie
-- SELECT
--     CASE
--         WHEN badge_id IN ('first_weight', 'first_workout', 'complete_profile') THEN 'beginner'
--         WHEN badge_id IN ('streak_7', 'streak_30', 'workout_month') THEN 'consistency'
--         WHEN badge_id IN ('lost_1kg', 'lost_5kg', 'goal_reached') THEN 'progress'
--     END as category,
--     COUNT(*) as count
-- FROM user_badges
-- WHERE user_id = auth.uid()
-- GROUP BY category;

-- ============================================
-- FONCTION UTILITAIRE (OPTIONNEL)
-- ============================================

-- Créer une fonction pour débloquer un badge automatiquement
CREATE OR REPLACE FUNCTION unlock_badge(
    p_user_id UUID,
    p_badge_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (p_user_id, p_badge_id)
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exemple d'utilisation de la fonction
-- SELECT unlock_badge(auth.uid(), 'first_weight');
