# 🛡️ PROMPTS IA POUR AVATARS CHEVALIER

## 🎨 STYLE GÉNÉRAL (à utiliser pour tous)

**Style de base à ajouter à chaque prompt :**
```
minimalist knight avatar icon, flat design, simple geometric shapes,
modern illustration style, clean lines, centered composition,
transparent background, PNG format, 512x512 pixels,
professional game asset, mobile app icon style
```

---

## 📝 PROMPTS POUR CHAQUE AVATAR

### 1. ÉCUYER (squire.png)
```
Young squire knight avatar, minimalist design, bronze/copper armor,
simple round shield, beginner warrior, friendly appearance,
warm bronze colors (#CD7F32), transparent background,
flat illustration, mobile app icon, 512x512, centered
```

**Couleurs :** Bronze/Cuivre (#CD7F32)
**Mood :** Débutant, jeune, enthousiaste

---

### 2. CHEVALIER (knight.png)
```
Medieval knight avatar, minimalist armor, full helmet with visor,
steel/grey armor, sword and shield, professional warrior,
silver-grey tones (#808080), flat design, transparent background,
clean modern illustration, mobile app icon, 512x512, centered
```

**Couleurs :** Gris acier (#808080)
**Mood :** Professionnel, discipliné

---

### 3. CHEVALIER D'ARGENT (knight_silver.png)
```
Silver knight avatar, elegant shining armor, polished silver metal,
noble warrior, detailed helmet, silver tones (#C0C0C0),
minimalist flat design, transparent background,
premium quality illustration, mobile game icon, 512x512, centered
```

**Couleurs :** Argent brillant (#C0C0C0)
**Mood :** Élégant, noble

---

### 4. CHEVALIER D'OR (knight_gold.png)
```
Golden knight avatar, shining gold armor, elite warrior,
bright gold metal (#FFD700), ornate helmet, prestigious,
minimalist flat design, transparent background,
luxury game icon, mobile app style, 512x512, centered
```

**Couleurs :** Or brillant (#FFD700)
**Mood :** Élite, prestigieux

---

### 5. PALADIN (paladin.png)
```
Holy paladin knight avatar, white and gold armor,
sacred warrior with divine aura, golden accents on white,
holy light glow, cross symbol, blessed champion,
minimalist flat design, transparent background,
epic game icon, 512x512, centered
```

**Couleurs :** Blanc (#FFFFFF) + Or (#FFD700)
**Mood :** Sacré, noble, puissant

---

### 6. CROISÉ (crusader.png)
```
Crusader knight avatar, red cross on white shield,
silver armor with red cape, holy warrior,
red (#DC143C) and silver colors, medieval crusader,
minimalist flat design, transparent background,
heroic game icon, 512x512, centered
```

**Couleurs :** Rouge (#DC143C) + Argent (#C0C0C0)
**Mood :** Déterminé, héroïque

---

### 7. TEMPLIER (templar.png)
```
Knight templar avatar, white armor with red cross,
sacred temple knight, iconic red cross symbol,
white (#FFFFFF) and red (#DC143C) colors,
minimalist flat design, transparent background,
legendary game icon, 512x512, centered
```

**Couleurs :** Blanc (#FFFFFF) + Rouge (#DC143C)
**Mood :** Sacré, légendaire

---

### 8. ROI (king.png)
```
King knight avatar, royal crown, purple cape,
golden armor, majestic warrior king,
gold (#FFD700) and royal purple (#800080),
regal and powerful, minimalist flat design,
transparent background, premium game icon, 512x512, centered
```

**Couleurs :** Or (#FFD700) + Pourpre (#800080)
**Mood :** Royal, majestueux, légendaire

---

## ⚙️ PARAMÈTRES TECHNIQUES GEMINI

**Pour chaque génération, utilise :**

```yaml
Format: PNG
Résolution: 512x512 pixels
Aspect Ratio: 1:1 (carré)
Background: Transparent
Style: Flat design, minimalist
Quality: High
Orientation: Centered
```

**Paramètres optionnels Gemini :**
- Temperature: 0.7 (pour créativité modérée)
- Top-p: 0.9
- Safety: Medium

---

## 🎯 CONSEILS POUR DE MEILLEURS RÉSULTATS

### ✅ À FAIRE
- Utiliser "transparent background" dans chaque prompt
- Spécifier "512x512" et "centered"
- Mentionner "flat design" et "minimalist"
- Inclure les codes couleur hexadécimaux
- Dire "mobile app icon" ou "game icon"

### ❌ À ÉVITER
- Prompts trop complexes avec trop de détails
- Demander du réalisme 3D (rester flat/2D)
- Oublier "transparent background"
- Négliger la résolution 512x512

---

## 🔄 WORKFLOW RECOMMANDÉ

1. **Copier le prompt** de l'avatar voulu
2. **Coller dans Gemini** (ou ton IA)
3. **Générer** l'image
4. **Télécharger** en PNG
5. **Renommer** selon le nom exact :
   - `squire.png`
   - `knight.png`
   - `knight_silver.png`
   - `knight_gold.png`
   - `paladin.png`
   - `crusader.png`
   - `templar.png`
   - `king.png`

6. **Placer** dans `/assets/avatars/knight/`

---

## 🎨 ALTERNATIVE : PROMPT UNIQUE POUR BATCH

Si ton IA supporte la génération en batch :

```
Create 8 minimalist knight avatar icons in flat design style,
transparent background, 512x512 pixels each:

1. Bronze squire with round shield
2. Grey steel knight with sword
3. Shining silver knight, elegant
4. Golden knight, elite warrior
5. White paladin with gold accents and divine glow
6. Crusader with red cross and silver armor
7. White templar with red cross
8. Royal king with crown and purple cape

All in modern flat illustration style, centered composition,
mobile game icons, clean simple shapes
```

---

## 📋 CHECKLIST FINALE

Après génération, vérifier :
- [ ] Format PNG avec transparence
- [ ] Taille 512x512 pixels
- [ ] Nom de fichier correct
- [ ] Centré dans le canvas
- [ ] Couleurs cohérentes avec le thème
- [ ] Style minimaliste et flat
- [ ] Visible et lisible même en petit (64x64)

---

## 💡 TIPS BONUS

**Si le résultat n'est pas transparent :**
- Utiliser un outil en ligne comme remove.bg
- Ou Photopea (gratuit) pour enlever le fond

**Si les couleurs ne correspondent pas :**
- Modifier avec Photopea
- Ajuster la teinte/saturation

**Si la taille n'est pas 512x512 :**
- Redimensionner avec Squoosh.app
- Ou ImageOptim

---

Bon courage pour la création ! 🛡️✨
