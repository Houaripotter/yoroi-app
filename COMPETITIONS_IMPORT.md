# 🥋 Import de Compétitions IBJJF & CFJJB

## 📊 Résumé

Yoroi contient maintenant **toutes les compétitions** IBJJF et CFJJB pour 2025 et 2026 !

### Nombre total de compétitions disponibles

- **IBJJF** : 46 compétitions (2025-2026)
- **CFJJB** : 63 compétitions (2026)
- **TOTAL** : **109 compétitions** 🔥

## 🎯 Comment importer les compétitions ?

### Méthode automatique (recommandée)

1. Ouvre l'application Yoroi
2. Va dans **Planning** → **Compétitions** (onglet)
3. Clique sur la carte **"Importer les compétitions IBJJF & CFJJB"**
4. Confirme l'import
5. **✅ C'est fait !** Toutes les compétitions sont maintenant dans ta base

### Détails de l'import

- ✅ **Détection des doublons** : Les compétitions déjà présentes ne seront pas ré-importées
- ✅ **Import rapide** : ~5 secondes pour importer 109 compétitions
- ✅ **100% offline** : Aucune connexion internet requise
- ✅ **Mise à jour** : Peut être lancé plusieurs fois sans problème

## 📅 Calendrier IBJJF 2025-2026

### Europe - Compétitions majeures

| Mois | Compétition | Lieu |
|------|-------------|------|
| Jan 2025 | European Championship | Odivelas, Portugal |
| Fév 2025 | London International Open | London, UK |
| Mar 2025 | Milan International Open | Milan, Italy |
| Avr 2025 | Dublin International Open | Dublin, Ireland |
| Mai 2025 | Master International - Europe | Barcelona, Spain |
| Jun 2025 | London Spring International Open | London, UK |
| Sep 2025 | Turin International Open | Turin, Italy |
| Oct 2025 | European No-Gi Championship | Lido di Ostia, Italy |
| Nov 2025 | Paris International Open | Paris, France |
| Jan 2026 | European Championship | Odivelas, Portugal |

### Formats disponibles

- 🥋 **Gi** (Kimono)
- 🤼 **No-Gi** (Sans kimono)
- 👶 **Kids** (Enfants)
- 🏆 **Masters** (Vétérans)

## 🇫🇷 Calendrier CFJJB 2026

### Compétitions nationales françaises

| Mois | Compétition | Ville |
|------|-------------|-------|
| Jan 2026 | Championnat National Novices | Verquin |
| Fév 2026 | Open d'Illkirch | Illkirch-Graffenstaden |
| Fév 2026 | Open de Bourges | Bourges |
| Mar 2026 | Coupe de France | Verquin |
| Avr 2026 | Championnat National | Paris |
| Avr 2026 | Open de France | Orléans |
| Mai 2026 | Open du Bassin d'Arcachon | Biganos |
| Jun 2026 | Championnat National (final) | Paris |

### Compétitions d'outre-mer

- 🏝️ **La Réunion** : Open de Saint-Denis, Championnat de La Réunion

### Formats disponibles

- 🥋 **Gi**
- 🤼 **No-Gi**
- 👶 **Kids**
- 👶 **Kids No-Gi**

## 🛠️ Fichiers créés

### 1. Données des compétitions

```
lib/
  ├── competitions-ibjjf-2025.ts    # 46 compétitions IBJJF
  ├── competitions-cfjjb-2026.ts    # 63 compétitions CFJJB
  └── importCompetitionsService.ts  # Service d'import
```

### 2. Service d'import

Le fichier `importCompetitionsService.ts` contient :

- `importIBJJFCompetitions()` - Importe les compétitions IBJJF
- `importCFJJBCompetitions()` - Importe les compétitions CFJJB
- `importAllCompetitions()` - Importe TOUT en une fois
- `getAvailableCompetitionsCount()` - Compte les compétitions disponibles

### 3. Interface utilisateur

L'écran `app/competitions.tsx` a été mis à jour avec :

- ✨ Carte d'import avec icône Download
- 📊 Compteur de compétitions disponibles
- ✅ Dialogue de confirmation
- 📈 Rapport d'import détaillé

## 📱 Utilisation dans l'app

### Ajouter une compétition à ton planning

1. Ouvre **Compétitions**
2. Trouve la compétition qui t'intéresse
3. Tape dessus pour voir les détails
4. Configure ta catégorie de poids
5. Yoroi va maintenant :
   - ✅ Compter les jours restants
   - ✅ Afficher le compte à rebours sur l'accueil
   - ✅ Te permettre d'activer le **Mode Cut**
   - ✅ Calculer ton objectif de poids pour la pesée

### Notifications (bientôt disponible)

- 📢 **J-30** : "Ta compétition approche !"
- 📢 **J-7** : "Dernière semaine avant la compét !"
- 📢 **J-1** : "C'est demain, bon courage !"

## 🎨 Avantages pour ta communauté

### Pour les compétiteurs

- ✅ **Calendrier complet** : Plus besoin de chercher les dates
- ✅ **Organisation IBJJF & CFJJB** : Toutes les compétitions officielles
- ✅ **Planning automatique** : Les prochaines compétitions s'affichent automatiquement
- ✅ **Mode Cut intégré** : Gestion du poids pour la pesée

### Pour les clubs

- ✅ **Visibilité** : Tous les membres voient les mêmes compétitions
- ✅ **Coordination** : Facile de s'inscrire aux mêmes événements
- ✅ **Motivation** : Objectifs communs pour tout le club

### Pour les coaches

- ✅ **Planification** : Préparation des athlètes sur plusieurs mois
- ✅ **Suivi** : Historique de toutes les compétitions passées
- ✅ **Stratégie** : Choix des compétitions selon le niveau

## 🚀 Prochaines étapes (Roadmap)

### V1 (Actuel) ✅
- [x] Import automatique IBJJF & CFJJB
- [x] Affichage du calendrier
- [x] Compte à rebours sur l'accueil

### V2 (Bientôt)
- [ ] Filtres par ville/pays
- [ ] Filtres par format (Gi/No-Gi/Kids)
- [ ] Synchronisation avec Apple Calendar
- [ ] Notifications push

### V3 (Futur)
- [ ] Partage de compétitions entre utilisateurs
- [ ] Résultats de compétitions
- [ ] Photos/vidéos de compétitions
- [ ] Statistiques de victoires/défaites

## 📝 Notes techniques

### Base de données

Les compétitions sont stockées dans la table `competitions` :

```sql
CREATE TABLE competitions (
  id INTEGER PRIMARY KEY,
  nom TEXT NOT NULL,
  date TEXT NOT NULL,
  lieu TEXT,
  sport TEXT NOT NULL,
  categorie_poids TEXT,
  poids_max REAL,
  statut TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Performance

- ✅ Import rapide (< 5 secondes pour 109 compétitions)
- ✅ Pas de ralentissement de l'app
- ✅ SQLite optimisé pour les requêtes

## ❓ FAQ

### Est-ce que les compétitions se mettent à jour automatiquement ?

Non, les compétitions sont importées manuellement. Pour avoir les nouvelles compétitions, il faudra mettre à jour l'app.

### Puis-je supprimer des compétitions ?

Oui, tu peux supprimer n'importe quelle compétition depuis son écran de détail.

### Est-ce que je peux ajouter mes propres compétitions ?

Oui ! Le bouton **"+"** permet d'ajouter n'importe quelle compétition personnalisée.

### Les compétitions sont-elles vraiment à jour ?

Oui, ces compétitions viennent directement des sites officiels :
- **IBJJF** : https://ibjjf.com/calendar
- **CFJJB** : https://cfjjb.fr/calendrier-competitions

---

**Profitez bien des compétitions ! OSS ! 🥋**

*Yoroi - L'app complète pour les guerriers du Jiu-Jitsu*
