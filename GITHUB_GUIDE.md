# 🚀 Guide pour sauvegarder sur GitHub

## Étape 1 : Vérifier l'état actuel

Tu es sur la branche `v2-offline` avec 14 commits en avance.

## Étape 2 : Ajouter tous les fichiers modifiés

```bash
git add .
```

## Étape 3 : Créer un commit avec un message descriptif

```bash
git commit -m "✨ Ajout fonctionnalités complètes : Notifications, Calendrier Streak, Mode Cut, Avatars BJJ, Health Connect"
```

## Étape 4 : Vérifier le remote GitHub

```bash
git remote -v
```

Si tu n'as pas encore de remote GitHub, ajoute-le :

```bash
git remote add origin https://github.com/TON_USERNAME/yoroi_app.git
```

(Remplace `TON_USERNAME` par ton nom d'utilisateur GitHub)

## Étape 5 : Pousser sur GitHub

```bash
git push origin v2-offline
```

Ou si c'est la première fois :

```bash
git push -u origin v2-offline
```

## 📝 Commandes complètes (copie-colle)

```bash
# 1. Ajouter tous les fichiers
git add .

# 2. Créer un commit
git commit -m "✨ Ajout fonctionnalités complètes : Notifications, Calendrier Streak, Mode Cut, Avatars BJJ, Health Connect"

# 3. Pousser sur GitHub
git push origin v2-offline
```

## 🔐 Si GitHub demande une authentification

GitHub n'accepte plus les mots de passe. Tu dois utiliser un **Personal Access Token** :

1. Va sur GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Clique "Generate new token"
3. Donne-lui un nom (ex: "Yoroi App")
4. Sélectionne les permissions : `repo` (toutes)
5. Copie le token généré
6. Quand Git te demande le mot de passe, colle le token à la place

## ⚠️ Note importante

Assure-toi d'avoir un fichier `.gitignore` qui exclut :
- `node_modules/`
- `.expo/`
- Les fichiers sensibles (clés API, etc.)

---

**Bonne nuit ! 😴**

