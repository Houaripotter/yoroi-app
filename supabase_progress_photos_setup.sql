-- ============================================
-- CONFIGURATION SUPABASE POUR LES PHOTOS DE PROGRESSION
-- ============================================

-- 1. CRÉER LA TABLE progress_photos
-- ============================================
CREATE TABLE IF NOT EXISTS progress_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    date DATE NOT NULL,
    weight DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. CRÉER LES INDEX POUR OPTIMISER LES REQUÊTES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id
    ON progress_photos(user_id);

CREATE INDEX IF NOT EXISTS idx_progress_photos_date
    ON progress_photos(date DESC);

CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date
    ON progress_photos(user_id, date DESC);

-- 3. ACTIVER ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- 4. CRÉER LES POLICIES DE SÉCURITÉ
-- ============================================

-- Policy pour permettre aux utilisateurs de voir leurs propres photos
CREATE POLICY "Users can view their own progress photos"
    ON progress_photos
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs d'insérer leurs propres photos
CREATE POLICY "Users can insert their own progress photos"
    ON progress_photos
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs de mettre à jour leurs propres photos
CREATE POLICY "Users can update their own progress photos"
    ON progress_photos
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs de supprimer leurs propres photos
CREATE POLICY "Users can delete their own progress photos"
    ON progress_photos
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- INSTRUCTIONS POUR CRÉER LE STORAGE BUCKET
-- ============================================
-- Aller dans Supabase Dashboard > Storage > Create bucket
-- 1. Nom du bucket : "progress-photos"
-- 2. Public bucket : OUI (pour pouvoir afficher les images)
-- 3. File size limit : 5 MB (ou selon vos besoins)
-- 4. Allowed MIME types : image/jpeg, image/png, image/webp

-- ALTERNATIVE: Créer le bucket via SQL (si vous avez les permissions)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. CRÉER LES POLICIES DE STORAGE
-- ============================================

-- Policy pour permettre aux utilisateurs de télécharger leurs propres photos
CREATE POLICY "Users can upload their own photos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'progress-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy pour permettre à tous de voir les photos (bucket public)
CREATE POLICY "Public can view photos"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'progress-photos');

-- Policy pour permettre aux utilisateurs de supprimer leurs propres photos
CREATE POLICY "Users can delete their own photos"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'progress-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que la table a été créée
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'progress_photos';

-- Vérifier les policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'progress_photos';

-- Vérifier le bucket
SELECT * FROM storage.buckets WHERE id = 'progress-photos';

-- ============================================
-- EXEMPLE D'UTILISATION
-- ============================================

-- Insérer une photo de test
-- INSERT INTO progress_photos (user_id, photo_url, date, weight, notes)
-- VALUES (
--     auth.uid(),
--     'https://yourdomain.supabase.co/storage/v1/object/public/progress-photos/user-id/photo.jpg',
--     '2024-12-08',
--     89.5,
--     'Photo de progression après 2 semaines'
-- );

-- Récupérer toutes les photos d'un utilisateur
-- SELECT * FROM progress_photos
-- WHERE user_id = auth.uid()
-- ORDER BY date DESC;

-- Récupérer les photos pour la comparaison
-- SELECT * FROM progress_photos
-- WHERE user_id = auth.uid()
-- ORDER BY date ASC
-- LIMIT 2;
