# 📸 Configuration des Photos de Progression - Yoroi

Ce document explique comment configurer la fonctionnalité de photos de progression dans l'application Yoroi.

## 📋 Table des matières

1. [Configuration Supabase](#configuration-supabase)
2. [Permissions requises](#permissions-requises)
3. [Structure de la base de données](#structure-de-la-base-de-données)
4. [Utilisation de la fonctionnalité](#utilisation-de-la-fonctionnalité)
5. [Dépannage](#dépannage)

---

## 🛠️ Configuration Supabase

### Étape 1 : Créer la table `progress_photos`

1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Copiez et exécutez le contenu du fichier `supabase_progress_photos_setup.sql`

### Étape 2 : Créer le Storage Bucket

#### Option A : Via l'interface Supabase (Recommandé)

1. Allez dans **Storage** dans le menu de gauche
2. Cliquez sur **Create bucket**
3. Configurez le bucket :
   - **Name** : `progress-photos`
   - **Public bucket** : ✅ OUI (cochez la case)
   - **File size limit** : 5 MB
   - **Allowed MIME types** : `image/jpeg`, `image/png`, `image/webp`
4. Cliquez sur **Create bucket**

#### Option B : Via SQL

Si vous préférez créer le bucket via SQL, le script est inclus dans `supabase_progress_photos_setup.sql`.

### Étape 3 : Configurer les policies de Storage

Les policies de storage sont automatiquement créées par le script SQL. Vérifiez qu'elles sont bien en place :

1. Allez dans **Storage** > **Policies**
2. Sélectionnez le bucket `progress-photos`
3. Vérifiez que ces policies existent :
   - ✅ Users can upload their own photos
   - ✅ Public can view photos
   - ✅ Users can delete their own photos

---

## 🔐 Permissions requises

L'application demande les permissions suivantes :

- **📷 Caméra** : Pour prendre des photos de progression
- **🖼️ Galerie** : Pour sélectionner des photos existantes

Ces permissions sont demandées automatiquement lors de la première utilisation.

### Configuration iOS (ios/Info.plist)

Si vous développez pour iOS, assurez-vous d'avoir ces permissions dans votre `Info.plist` :

```xml
<key>NSCameraUsageDescription</key>
<string>Yoroi a besoin d'accéder à votre caméra pour prendre des photos de progression</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Yoroi a besoin d'accéder à votre galerie pour choisir des photos de progression</string>
```

### Configuration Android (android/app/src/main/AndroidManifest.xml)

Pour Android, ajoutez ces permissions :

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

---

## 📊 Structure de la base de données

### Table `progress_photos`

| Colonne      | Type          | Description                              |
|--------------|---------------|------------------------------------------|
| id           | UUID          | Identifiant unique de la photo           |
| user_id      | UUID          | Référence vers l'utilisateur             |
| photo_url    | TEXT          | URL de la photo dans Supabase Storage    |
| date         | DATE          | Date de la photo                         |
| weight       | DECIMAL(5,2)  | Poids au moment de la photo (optionnel)  |
| notes        | TEXT          | Notes sur la photo (optionnel)           |
| created_at   | TIMESTAMP     | Date de création de l'enregistrement     |

### Storage Bucket `progress-photos`

Structure des fichiers :
```
progress-photos/
  └── {user_id}/
      ├── 1701234567890.jpg
      ├── 1701234987654.jpg
      └── ...
```

---

## 🚀 Utilisation de la fonctionnalité

### 1. Accéder à l'onglet Photos

L'onglet **Photos** (icône caméra 📷) est accessible depuis la barre de navigation en bas de l'écran.

### 2. Ajouter une photo

1. Tapez sur le bouton **"Ajouter une photo"**
2. Choisissez :
   - **📷 Prendre une photo** : Ouvre la caméra
   - **🖼️ Choisir depuis la galerie** : Ouvre la galerie

3. La photo est automatiquement :
   - Uploadée vers Supabase Storage
   - Associée à la date du jour
   - Associée au poids actuel (si disponible)

### 3. Comparer Avant/Après

1. Tapez sur l'icône **GitCompare** en haut à droite
2. Sélectionnez une photo **AVANT**
3. Sélectionnez une photo **APRÈS** (parmi les photos postérieures)
4. Consultez les statistiques :
   - Différence de poids
   - Nombre de jours entre les deux photos

### 4. Affichage des photos

Les photos sont affichées en grille (3 colonnes) avec :
- La date de la photo
- Le poids associé (si disponible)
- Un design cohérent avec le reste de l'application

---

## 🔧 Dépannage

### Problème : "Permission refusée"

**Solution** :
1. Allez dans **Réglages** > **Yoroi**
2. Activez les permissions **Caméra** et **Photos**

### Problème : "Impossible de télécharger la photo"

**Solutions possibles** :
1. Vérifiez que le bucket `progress-photos` existe
2. Vérifiez que le bucket est **public**
3. Vérifiez les policies de storage
4. Vérifiez votre connexion internet

### Problème : "Les photos ne s'affichent pas"

**Solutions possibles** :
1. Rafraîchissez la page (tirez vers le bas)
2. Vérifiez que l'URL de la photo est accessible
3. Vérifiez les policies RLS de la table `progress_photos`

### Problème : "Comparaison impossible"

**Solution** :
- Vous devez avoir au moins **2 photos** pour utiliser la comparaison

---

## 📝 Notes supplémentaires

### Qualité des photos

- Les photos sont compressées à **80% de qualité** pour optimiser le stockage
- Format recommandé : **3:4** (portrait)

### Limites

- Taille maximale : **5 MB** par photo
- Formats supportés : **JPEG, PNG, WebP**

### Sécurité

- Chaque utilisateur ne peut voir que **ses propres photos**
- Les photos sont stockées dans des dossiers séparés par **user_id**
- Les policies RLS empêchent l'accès non autorisé

---

## 🎉 C'est terminé !

Votre fonctionnalité de photos de progression est maintenant configurée et prête à l'emploi !

Si vous rencontrez des problèmes, consultez les logs dans la console ou contactez le support.
