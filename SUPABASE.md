# Configuration Supabase

Ce document explique comment Supabase est configuré et utilisé dans ce projet.

## 📋 Configuration

### Variables d'environnement

Le fichier `.env` à la racine du projet contient les informations de connexion Supabase :

```env
EXPO_PUBLIC_SUPABASE_URL=https://yqzzttmpnnzzngxgzvqf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Client Supabase

Le client Supabase est configuré dans `lib/supabase.ts` avec :
- **AsyncStorage** : Pour la persistance des sessions sur React Native
- **Auto-refresh des tokens** : Pour maintenir la session active
- **Persistance de session** : Les utilisateurs restent connectés même après fermeture de l'app

## 🗄️ Structure de la base de données

### Table `weight_entries`

Table principale pour stocker les mesures de poids et métriques corporelles.

#### Colonnes principales :
- `id` (uuid) : Identifiant unique
- `user_id` (uuid) : Référence à l'utilisateur (auth.users)
- `date` (date) : Date de la mesure
- `weight` (decimal) : Poids en kg
- `created_at` (timestamptz) : Date de création
- `updated_at` (timestamptz) : Date de dernière modification

#### Métriques de composition corporelle (optionnelles) :
- `body_fat` (decimal) : Pourcentage de graisse corporelle
- `muscle_mass` (decimal) : Masse musculaire en kg
- `water` (decimal) : Pourcentage d'eau corporelle
- `visceral_fat` (integer) : Niveau de graisse viscérale (1-59)
- `metabolic_age` (integer) : Âge métabolique

#### Mensurations (JSONB, optionnel) :
- `measurements` : Objet JSON contenant :
  - `arms` : Tour de bras (cm)
  - `chest` : Tour de poitrine (cm)
  - `navel` : Tour de taille au nombril (cm)
  - `hips` : Tour de hanches (cm)
  - `thighs` : Tour de cuisse (cm)

## 🔐 Sécurité (RLS - Row Level Security)

Les politiques de sécurité sont activées pour garantir que :
- Chaque utilisateur ne peut voir que ses propres données
- Seul le propriétaire peut insérer, modifier ou supprimer ses entrées

## 📚 Utilisation des helpers

Le fichier `lib/supabase-helpers.ts` fournit des fonctions utilitaires :

### Récupérer les données

```typescript
import { getWeightEntries, getRecentWeightEntries } from '@/lib/supabase-helpers';

// Toutes les entrées de l'utilisateur
const { data, error } = await getWeightEntries();

// Les 30 dernières entrées
const { data, error } = await getRecentWeightEntries(30);

// Entrées pour une période
const { data, error } = await getWeightEntriesByDateRange('2024-01-01', '2024-12-31');

// Dernière entrée
const { data, error } = await getLatestWeightEntry();
```

### Ajouter une entrée

```typescript
import { addWeightEntry } from '@/lib/supabase-helpers';

const { data, error } = await addWeightEntry({
  weight: 75.5,
  date: '2024-12-06',
  body_fat: 18.5,
  muscle_mass: 62.3,
  water: 60.2,
  visceral_fat: 7,
  metabolic_age: 28,
  measurements: {
    arms: 35,
    chest: 98,
    navel: 82,
    hips: 95,
    thighs: 58,
  },
});
```

### Mettre à jour une entrée

```typescript
import { updateWeightEntry } from '@/lib/supabase-helpers';

const { data, error } = await updateWeightEntry('entry-id', {
  weight: 74.8,
  body_fat: 18.2,
});
```

### Supprimer une entrée

```typescript
import { deleteWeightEntry } from '@/lib/supabase-helpers';

const { error } = await deleteWeightEntry('entry-id');
```

### Authentification

```typescript
import { isAuthenticated, getCurrentUser } from '@/lib/supabase-helpers';

// Vérifier si l'utilisateur est connecté
const authenticated = await isAuthenticated();

// Récupérer l'utilisateur actuel
const { user, error } = await getCurrentUser();
```

## 🔄 Migration SQL

Le fichier `supabase/migrations/20251201170725_add_advanced_health_metrics.sql` contient :
- Création de la table `weight_entries`
- Ajout des colonnes pour métriques avancées
- Contraintes de validation
- Politiques RLS
- Index pour optimisation des performances

Pour exécuter la migration sur votre instance Supabase :

1. Ouvrez le SQL Editor dans votre dashboard Supabase
2. Copiez-collez le contenu du fichier de migration
3. Exécutez le script

## 📱 Stockage persistant

Le projet utilise `@react-native-async-storage/async-storage` pour :
- Stocker les tokens d'authentification
- Maintenir la session utilisateur
- Fonctionner sur iOS, Android et Web

## ⚙️ Types TypeScript

Les interfaces TypeScript sont définies dans `lib/supabase-helpers.ts` :
- `WeightEntry` : Structure complète d'une entrée
- `WeightEntryInsert` : Structure pour insérer une entrée
- `WeightEntryUpdate` : Structure pour mettre à jour une entrée

Ces types assurent la sécurité du code et l'autocomplétion dans votre IDE.

## 🚀 Démarrage rapide

1. Assurez-vous que le fichier `.env` est configuré
2. Installez les dépendances : `npm install`
3. Importez le client : `import { supabase } from '@/lib/supabase'`
4. Utilisez les helpers ou le client directement

## 🔗 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
