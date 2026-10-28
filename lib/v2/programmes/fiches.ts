/**
 * Fiches technique (24 octobre 2026) : pour chaque exercice des programmes et de leurs remplaçants
 * (lib/v2/programmes/materiel.ts), 3 consignes, 2 erreurs fréquentes et, quand il y a un risque précis,
 * un point de sécurité. Repères pratiques de technique tels qu’enseignés par les références reconnues
 * (NSCA, ACSM), pas un avis médical. Clés : nom exact de constants/exerciseLibrary.ts
 * (vérifié par __tests__/unit/fiches.test.ts). Données pures, aucun import React Native.
 */

export type FicheExo = { consignes: string[]; erreurs: string[]; securite?: string };

export const FICHES_EXO: Record<string, FicheExo> = {
  // PECTORAUX
  'Développé Couché (Barre)': {
    consignes: [
      'Pieds à plat au sol, fesses et omoplates collées au banc.',
      'Mains un peu plus larges que les épaules, poignets droits au dessus des coudes.',
      'Descends la barre sur le bas des pectoraux, puis pousse vers le haut en expirant.',
    ],
    erreurs: [
      'Faire rebondir la barre sur la poitrine pour remonter.',
      'Décoller les fesses du banc pendant la poussée.',
    ],
    securite: 'Travaille avec un pareur ou des barres de sécurité réglées juste sous la poitrine.',
  },
  'Développé Couché (Haltères)': {
    consignes: [
      'Allongé, pieds au sol, omoplates serrées et collées au banc.',
      'Coudes à environ 45 degrés du buste, avant bras verticaux.',
      'Descends sous contrôle jusqu’à l’étirement, puis pousse les haltères vers le haut.',
    ],
    erreurs: [
      'Écarter les coudes à 90 degrés, à hauteur des épaules.',
      'Laisser tomber les haltères en bas sans contrôle.',
    ],
    securite: 'À la fin de la série, pose les haltères sur les cuisses avant de te relever.',
  },
  'Développé Incliné (Haltères)': {
    consignes: [
      'Banc à environ 30 degrés, pieds au sol, omoplates serrées.',
      'Descends les haltères jusqu’au niveau du haut de la poitrine.',
      'Pousse vers le haut et légèrement vers l’intérieur, sans choquer les haltères.',
    ],
    erreurs: [
      'Incliner le banc trop haut : ce sont alors surtout les épaules qui poussent.',
      'Cambrer fort le dos pour finir la répétition.',
    ],
  },
  'Développé Incliné (Barre)': {
    consignes: [
      'Banc à environ 30 degrés, pieds au sol, omoplates serrées et collées.',
      'Descends la barre sur le haut de la poitrine, avant bras verticaux.',
      'Pousse la barre à la verticale des épaules en expirant.',
    ],
    erreurs: [
      'Faire rebondir la barre sur la poitrine.',
      'Décoller les fesses du banc pour pousser plus lourd.',
    ],
    securite: 'Travaille avec un pareur ou des barres de sécurité réglées juste sous la poitrine.',
  },
  'Chest Press (Machine)': {
    consignes: [
      'Règle le siège pour que les poignées arrivent à hauteur du milieu de la poitrine.',
      'Dos et omoplates collés au dossier, pieds à plat.',
      'Pousse jusqu’aux bras presque tendus, puis reviens lentement.',
    ],
    erreurs: [
      'Décoller le dos du dossier en poussant.',
      'Laisser les charges claquer en revenant.',
    ],
  },
  'Chest Press Incliné (Machine)': {
    consignes: [
      'Règle le siège pour que les poignées arrivent à hauteur du haut de la poitrine.',
      'Dos et omoplates collés au dossier, pieds à plat.',
      'Pousse vers le haut et l’avant, puis reviens lentement.',
    ],
    erreurs: [
      'Hausser les épaules vers les oreilles en poussant.',
      'Raccourcir le mouvement en revenant à peine.',
    ],
  },
  'Floor Press (Haltères)': {
    consignes: [
      'Allongé au sol, genoux fléchis, pieds à plat. Pas sur un banc : c’est le sol qui protège l’épaule.',
      'Descends jusqu’à ce que le haut des bras touche le sol, coudes à environ 45 degrés.',
      'Marque un temps au sol, puis pousse les haltères vers le haut.',
    ],
    erreurs: [
      'Le faire sur un banc : les coudes descendent trop bas et l’épaule force.',
      'Écarter les coudes à hauteur des épaules.',
    ],
  },
  'Dips (Focus Pectoraux)': {
    consignes: [
      'Mains sur les barres, bras tendus, épaules basses.',
      'Buste penché en avant, descends jusqu’à avoir les épaules au niveau des coudes.',
      'Pousse pour remonter, sans verrouiller brutalement les coudes.',
    ],
    erreurs: [
      'Descendre trop bas au point de forcer sur l’avant de l’épaule.',
      'Laisser les épaules remonter vers les oreilles.',
    ],
  },
  'Pec Deck (Butterfly)': {
    consignes: [
      'Règle le siège pour que les poignées soient à hauteur de poitrine.',
      'Coudes légèrement fléchis et fixes pendant tout le mouvement.',
      'Ouvre jusqu’à l’étirement des pectoraux, puis ferme en serrant.',
    ],
    erreurs: [
      'Ouvrir au delà de l’étirement confortable de l’épaule.',
      'Laisser les poignées claquer en fermant.',
    ],
  },
  'Écartés à la Poulie Haute': {
    consignes: [
      'Un pas en avant, buste un peu penché, une poignée dans chaque main.',
      'Coudes légèrement fléchis et fixes.',
      'Ramène les mains l’une vers l’autre devant le bas de la poitrine, puis remonte lentement.',
    ],
    erreurs: [
      'Plier les coudes pour transformer le geste en développé.',
      'Se laisser tirer en arrière par les câbles au retour.',
    ],
  },
  'Écartés Couché (Haltères)': {
    consignes: [
      'Allongé sur le banc, haltères au dessus de la poitrine, paumes face à face.',
      'Coudes légèrement fléchis, ouvre les bras en arc de cercle.',
      'Descends jusqu’à l’étirement des pectoraux, puis remonte par le même arc.',
    ],
    erreurs: [
      'Descendre les haltères trop bas, sous le niveau des épaules.',
      'Tendre complètement les bras avec une charge lourde.',
    ],
  },
  'Pompes (Poids du corps)': {
    consignes: [
      'Mains un peu plus larges que les épaules, corps aligné des talons à la tête.',
      'Serre les fessiers et les abdos pour garder le bassin dans l’alignement.',
      'Descends la poitrine près du sol, coudes à environ 45 degrés, puis pousse.',
    ],
    erreurs: [
      'Laisser les hanches s’affaisser vers le sol.',
      'Faire des demi répétitions sans descendre.',
    ],
  },
  'Pompes Déclinées': {
    consignes: [
      'Pieds sur un banc ou une chaise stable, mains au sol sous les épaules.',
      'Corps gainé et aligné des talons à la tête.',
      'Descends la poitrine vers le sol, puis pousse.',
    ],
    erreurs: [
      'Plier les hanches et lever les fesses.',
      'Laisser tomber la tête vers le sol.',
    ],
  },
  'Pompes Diamant': {
    consignes: [
      'Mains rapprochées sous la poitrine, pouces et index qui forment un losange.',
      'Corps gainé et aligné des talons à la tête.',
      'Descends en gardant les coudes près du corps, puis pousse.',
    ],
    erreurs: [
      'Écarter les coudes sur les côtés.',
      'Laisser le bassin s’affaisser.',
    ],
  },
  'Pike Push-ups': {
    consignes: [
      'Mains au sol largeur d’épaules, hanches hautes, corps en V inversé.',
      'Descends la tête vers le sol, un peu devant les mains.',
      'Pousse pour remonter en gardant les hanches hautes.',
    ],
    erreurs: [
      'Baisser les hanches : le geste devient une pompe classique.',
      'Écarter les coudes à 90 degrés.',
    ],
  },
  'Pull Over (Haltère)': {
    consignes: [
      'Allongé sur le banc, haltère tenu à deux mains au dessus de la poitrine.',
      'Coudes légèrement fléchis, descends l’haltère derrière la tête en arc de cercle.',
      'Va jusqu’à l’étirement confortable, puis ramène l’haltère au dessus de la poitrine.',
    ],
    erreurs: [
      'Plier et déplier les coudes pendant le mouvement.',
      'Cambrer fort le dos pour descendre plus loin.',
    ],
  },
  // DOS
  'Deadlift (Soulevé de terre)': {
    consignes: [
      'Pieds largeur de hanches, barre au dessus du milieu du pied, près des tibias.',
      'Dos plat, poitrine sortie, inspire et gaine avant de décoller la barre.',
      'Pousse le sol avec les jambes, la barre glisse le long des jambes jusqu’en haut.',
    ],
    erreurs: [
      'Arrondir le bas du dos au décollage.',
      'Laisser la barre s’éloigner des jambes.',
    ],
    securite: 'Garde le dos neutre à chaque répétition : s’il s’arrondit, allège la charge.',
  },
  'Trap Bar Deadlift': {
    consignes: [
      'Debout au centre de la barre, pieds largeur de hanches.',
      'Descends en pliant hanches et genoux, dos plat, attrape les poignées.',
      'Gaine, pousse le sol et monte en tendant hanches et genoux ensemble.',
    ],
    erreurs: [
      'Arrondir le dos en bas du mouvement.',
      'Monter les hanches avant les épaules.',
    ],
    securite: 'Garde le dos neutre à chaque répétition : s’il s’arrondit, allège la charge.',
  },
  'Deadlift Roumain': {
    consignes: [
      'Debout, barre en main, genoux légèrement fléchis et fixes.',
      'Pousse les hanches en arrière, la barre glisse contre les cuisses, dos plat.',
      'Descends jusqu’à l’étirement des ischios, puis reviens en poussant les hanches.',
    ],
    erreurs: [
      'Arrondir le dos pour descendre plus bas.',
      'Plier les genoux comme pour un squat.',
    ],
    securite: 'Garde le dos neutre : l’amplitude s’arrête là où le dos commence à s’arrondir.',
  },
  'Face Pull': {
    consignes: [
      'Poulie à hauteur du visage, corde en main, pouces vers toi.',
      'Tire la corde vers ton front en écartant les mains, coudes hauts.',
      'Serre les omoplates une seconde, puis reviens lentement.',
    ],
    erreurs: [
      'Tirer vers le cou avec les coudes bas.',
      'Pencher le buste en arrière pour tirer plus lourd.',
    ],
  },
  'Hyperextensions': {
    consignes: [
      'Règle le coussin juste sous les hanches, talons calés.',
      'Descends le buste en pliant les hanches, dos plat.',
      'Remonte jusqu’à aligner le buste et les jambes, sans aller plus loin.',
    ],
    erreurs: [
      'Cambrer fort en haut du mouvement.',
      'Descendre et remonter avec de l’élan.',
    ],
  },
  'Inverted Row': {
    consignes: [
      'Sous une barre ou une table solide, mains largeur d’épaules, corps tendu.',
      'Talons au sol, fessiers et abdos serrés.',
      'Tire ta poitrine vers la barre en serrant les omoplates, puis redescends.',
    ],
    erreurs: [
      'Laisser les hanches tomber pendant la traction.',
      'Tirer avec le menton au lieu de la poitrine.',
    ],
    securite: 'Vérifie que la table ou le support ne peut ni basculer ni glisser.',
  },
  'Pull Over Poulie Haute': {
    consignes: [
      'Face à la poulie, buste penché depuis les hanches, dos plat, bras presque tendus.',
      'Abaisse les mains vers les cuisses en arc de cercle, coudes fixes.',
      'Remonte lentement jusqu’à l’étirement du dos, sans hausser les épaules.',
    ],
    erreurs: [
      'Plier les coudes pour pousser vers le bas.',
      'Bouger le buste pour donner de l’élan.',
    ],
  },
  'Rowing Barre (Bent Over)': {
    consignes: [
      'Genoux fléchis, buste penché vers l’avant, dos plat.',
      'Tire la barre vers le bas du ventre, coudes le long du corps.',
      'Serre les omoplates en haut, puis redescends sous contrôle.',
    ],
    erreurs: [
      'Redresser le buste à chaque répétition pour tricher.',
      'Arrondir le dos pendant la série.',
    ],
    securite: 'Garde le dos neutre pendant toute la série : s’il s’arrondit, allège.',
  },
  'Rowing Haltère (One Arm)': {
    consignes: [
      'Une main et un genou sur le banc, dos plat, l’autre pied au sol.',
      'Tire l’haltère vers la hanche, coude près du corps.',
      'Redescends bras tendu jusqu’à l’étirement du dos.',
    ],
    erreurs: [
      'Tourner le buste pour monter l’haltère.',
      'Tirer vers l’épaule au lieu de la hanche.',
    ],
  },
  'Tirage Horizontal (Seated Row)': {
    consignes: [
      'Assis, pieds calés, genoux légèrement fléchis, dos droit.',
      'Tire la poignée vers le bas du ventre, coudes près du corps.',
      'Serre les omoplates, puis laisse revenir les bras sous contrôle.',
    ],
    erreurs: [
      'Basculer le buste d’avant en arrière à chaque répétition.',
      'Hausser les épaules en tirant.',
    ],
  },
  'Tirage Poitrine (Lat Pulldown)': {
    consignes: [
      'Cuisses calées sous les boudins, mains un peu plus larges que les épaules.',
      'Tire la barre vers le haut de la poitrine, coudes vers le bas.',
      'Remonte lentement jusqu’aux bras tendus.',
    ],
    erreurs: [
      'Tirer la barre derrière la nuque.',
      'Se pencher loin en arrière pour descendre la barre.',
    ],
  },
  'Tirage Serré (V-Bar)': {
    consignes: [
      'Poignée en V, paumes face à face, cuisses calées.',
      'Tire la poignée vers le haut de la poitrine, coudes près du corps.',
      'Remonte lentement jusqu’aux bras tendus.',
    ],
    erreurs: [
      'Se balancer en arrière pour tirer plus lourd.',
      'Arrêter la remontée avant les bras tendus.',
    ],
  },
  'Tractions (Pronation)': {
    consignes: [
      'Mains un peu plus larges que les épaules, paumes vers l’avant, bras tendus.',
      'Abaisse les épaules, puis tire la poitrine vers la barre.',
      'Monte jusqu’au menton au dessus de la barre, redescends bras tendus.',
    ],
    erreurs: [
      'Se balancer avec les jambes pour monter.',
      'Faire des demi répétitions sans tendre les bras en bas.',
    ],
  },
  'Tractions Neutres': {
    consignes: [
      'Paumes face à face sur les poignées parallèles, bras tendus.',
      'Abaisse les épaules, puis tire la poitrine vers les mains.',
      'Monte jusqu’au menton au dessus des poignées, redescends sous contrôle.',
    ],
    erreurs: [
      'Se balancer pour prendre de l’élan.',
      'Laisser les épaules remonter vers les oreilles en bas.',
    ],
  },
  'Tractions (Supination)': {
    consignes: [
      'Mains largeur d’épaules, paumes vers toi, bras tendus.',
      'Abaisse les épaules, puis tire la poitrine vers la barre.',
      'Monte jusqu’au menton au dessus de la barre, redescends bras tendus.',
    ],
    erreurs: [
      'Lancer les jambes pour finir la répétition.',
      'Lâcher la descente d’un coup.',
    ],
  },
  // ÉPAULES
  'Développé Haltères Assis': {
    consignes: [
      'Assis, dos droit contre le dossier, haltères à hauteur des épaules.',
      'Pousse les haltères au dessus de la tête, sans les choquer.',
      'Redescends jusqu’à hauteur des oreilles, sous contrôle.',
    ],
    erreurs: [
      'Cambrer fort le bas du dos pour pousser.',
      'Descendre à peine et raccourcir le mouvement.',
    ],
  },
  'Développé Militaire (Barre)': {
    consignes: [
      'Debout, pieds largeur de hanches, barre sur le haut de la poitrine.',
      'Serre fessiers et abdos, recule un peu la tête et pousse la barre à la verticale.',
      'Dès que la barre passe le front, avance la tête sous la barre, bras tendus.',
    ],
    erreurs: [
      'Cambrer le bas du dos pour pousser plus lourd.',
      'Pousser la barre devant soi au lieu de la verticale.',
    ],
  },
  'Développé Militaire Assis': {
    consignes: [
      'Assis, dos droit contre le dossier, barre sur le haut de la poitrine.',
      'Recule un peu la tête et pousse la barre à la verticale, au dessus de la tête.',
      'Redescends sous contrôle jusqu’au haut de la poitrine.',
    ],
    erreurs: [
      'Décoller le dos du dossier en cambrant.',
      'Descendre la barre derrière la nuque.',
    ],
  },
  'Push Press': {
    consignes: [
      'Debout, barre sur le haut de la poitrine, pieds largeur de hanches.',
      'Petite flexion des genoux, buste droit, talons au sol, puis tends les jambes d’un coup.',
      'Profite de l’élan pour pousser la barre à la verticale, tête passée sous la barre.',
    ],
    erreurs: [
      'Plier trop les genoux, comme un squat.',
      'Pencher le buste en avant pendant la flexion.',
    ],
  },
  'Oiseau Haltères (Rear Delts)': {
    consignes: [
      'Buste penché vers l’avant, dos plat, nuque dans l’alignement, haltères sous les épaules.',
      'Coudes légèrement fléchis, ouvre les bras sur les côtés.',
      'Monte les bras jusqu’au niveau du dos, sans hausser les épaules, puis redescends.',
    ],
    erreurs: [
      'Redresser le buste pour lancer les haltères.',
      'Plier fort les coudes : le geste devient un rowing.',
    ],
  },
  'Oiseau Machine (Reverse Pec Deck)': {
    consignes: [
      'Assis face au dossier, poitrine contre le coussin, poignées à hauteur d’épaules.',
      'Coudes légèrement fléchis, ouvre les bras vers l’arrière.',
      'Reviens lentement sans laisser les charges se toucher.',
    ],
    erreurs: [
      'Décoller la poitrine du coussin pour tirer.',
      'Hausser les épaules vers les oreilles.',
    ],
  },
  'Shrugs Haltères (Trapèzes)': {
    consignes: [
      'Debout, haltères le long du corps, bras tendus.',
      'Monte les épaules droit vers les oreilles.',
      'Tiens une seconde en haut, puis redescends lentement.',
    ],
    erreurs: [
      'Faire rouler les épaules en cercle.',
      'Plier les coudes pour aider.',
    ],
  },
  'Shrugs Barre (Trapèzes)': {
    consignes: [
      'Debout, barre devant les cuisses, mains largeur d’épaules.',
      'Monte les épaules droit vers les oreilles, bras tendus.',
      'Tiens une seconde en haut, puis redescends lentement.',
    ],
    erreurs: [
      'Avancer la tête pendant la montée.',
      'Utiliser les jambes pour donner de l’élan.',
    ],
  },
  'Élévations Latérales (Haltères)': {
    consignes: [
      'Debout, haltères le long du corps, coudes légèrement fléchis.',
      'Monte les bras sur les côtés jusqu’à hauteur des épaules.',
      'Redescends lentement, sans laisser tomber les haltères.',
    ],
    erreurs: [
      'Balancer le buste pour lancer les haltères.',
      'Monter les épaules vers les oreilles.',
    ],
  },
  'Élévations Latérales (Poulie)': {
    consignes: [
      'De profil à la poulie basse, poignée dans la main la plus éloignée.',
      'Coude légèrement fléchi, monte le bras sur le côté jusqu’à hauteur d’épaule.',
      'Redescends lentement, le câble reste tendu.',
    ],
    erreurs: [
      'Pencher le buste pour aider le bras.',
      'Monter au dessus de la hauteur d’épaule en haussant l’épaule.',
    ],
  },
  // BICEPS
  'Curl Barre EZ': {
    consignes: [
      'Debout, barre EZ en main paumes vers l’avant, coudes le long du corps.',
      'Plie les coudes pour monter la barre, les coudes restent fixes.',
      'Redescends lentement jusqu’aux bras tendus.',
    ],
    erreurs: [
      'Balancer le buste pour monter la barre.',
      'Avancer les coudes en haut du mouvement.',
    ],
  },
  'Curl Haltères Alterné': {
    consignes: [
      'Debout, haltères le long du corps, coudes collés aux côtes.',
      'Monte un haltère en tournant la paume vers le haut.',
      'Redescends lentement, puis change de bras.',
    ],
    erreurs: [
      'Se pencher en arrière pour monter l’haltère.',
      'Lâcher la descente d’un coup.',
    ],
  },
  'Curl Larry Scott (Pupitre)': {
    consignes: [
      'Assis, l’arrière des bras posé à plat sur le pupitre, paumes vers le haut.',
      'Monte la charge en pliant les coudes, les bras restent collés au pupitre.',
      'Redescends lentement jusqu’aux bras presque tendus : c’est la partie la plus utile.',
    ],
    erreurs: [
      'Décoller les coudes du pupitre pour monter.',
      'S’arrêter à mi course en bas du mouvement.',
    ],
    securite: 'Ne laisse jamais la charge tomber bras tendus : le coude est en position fragile en bas.',
  },
  'Curl Incliné (Haltères)': {
    consignes: [
      'Allongé sur un banc incliné, bras tendus vers le sol, paumes vers l’avant.',
      'Plie les coudes pour monter les haltères, les coudes restent fixes.',
      'Redescends jusqu’aux bras tendus, sous contrôle.',
    ],
    erreurs: [
      'Avancer les coudes pendant la montée.',
      'Décoller la tête et les épaules du dossier.',
    ],
  },
  'Curl Marteau (Hammer)': {
    consignes: [
      'Debout, haltères le long du corps, paumes face à face.',
      'Monte les haltères en gardant les paumes face à face, coudes fixes.',
      'Redescends lentement jusqu’aux bras tendus.',
    ],
    erreurs: [
      'Balancer le buste pour monter.',
      'Décoller les coudes du corps.',
    ],
  },
  'Curl Poulie Basse': {
    consignes: [
      'Face à la poulie basse, barre ou poignée en main, coudes le long du corps.',
      'Plie les coudes pour monter les mains vers les épaules.',
      'Redescends lentement, le câble reste tendu.',
    ],
    erreurs: [
      'Reculer le buste pour tirer plus lourd.',
      'Avancer les coudes en haut.',
    ],
  },
  // TRICEPS
  'Barre au front (Skullcrusher)': {
    consignes: [
      'Allongé sur le banc, barre au dessus des épaules, bras tendus.',
      'Plie seulement les coudes pour descendre la barre vers le front.',
      'Tends les bras pour remonter, les coudes restent fixes.',
    ],
    erreurs: [
      'Écarter les coudes vers l’extérieur.',
      'Bouger les épaules pour transformer le geste en développé.',
    ],
    securite: 'Descends lentement et choisis une charge que tu contrôles jusqu’en bas.',
  },
  'Dips Banc': {
    consignes: [
      'Mains sur le bord d’un banc ou d’une chaise stable, doigts vers l’avant.',
      'Fesses près du banc, descends en pliant les coudes vers l’arrière.',
      'Pousse pour remonter jusqu’aux bras tendus.',
    ],
    erreurs: [
      'Descendre trop bas au point de forcer sur l’avant de l’épaule.',
      'Éloigner les fesses du banc.',
    ],
    securite: 'Vérifie que le banc ou la chaise ne peut ni glisser ni basculer.',
  },
  'Extension Haltère Nuque (2 mains)': {
    consignes: [
      'Assis ou debout, haltère tenu à deux mains au dessus de la tête.',
      'Plie les coudes pour descendre l’haltère derrière la nuque, coudes vers le haut.',
      'Tends les bras pour remonter, sans bouger les épaules.',
    ],
    erreurs: [
      'Écarter les coudes sur les côtés.',
      'Cambrer le bas du dos pendant l’effort.',
    ],
  },
  'Extension Triceps Poulie (Corde)': {
    consignes: [
      'Face à la poulie haute, corde en main, coudes collés au corps.',
      'Tends les bras vers le bas et écarte la corde en fin de mouvement.',
      'Remonte lentement, les coudes restent fixes.',
    ],
    erreurs: [
      'Pencher le buste pour appuyer avec le poids du corps.',
      'Laisser les coudes avancer et reculer.',
    ],
  },
  'Overhead Extension Poulie': {
    consignes: [
      'Dos à la poulie, corde derrière la tête, un pied devant l’autre, abdos gainés.',
      'Coudes près de la tête, pointés vers l’avant, tends les bras vers l’avant et le haut.',
      'Reviens lentement jusqu’à l’étirement du triceps.',
    ],
    erreurs: [
      'Écarter les coudes pendant l’effort.',
      'Cambrer le dos au lieu de gainer.',
    ],
  },
  // JAMBES
  'Squat Barre Libre': {
    consignes: [
      'Barre sur le haut du dos, pieds largeur d’épaules, pointes un peu ouvertes.',
      'Inspire, gaine, puis descends hanches en arrière, genoux dans l’axe des pieds.',
      'Descends aussi bas que ton dos reste plat, puis pousse le sol pour remonter.',
    ],
    erreurs: [
      'Laisser les genoux rentrer vers l’intérieur.',
      'Décoller les talons du sol.',
    ],
    securite: 'Squatte dans un rack avec les barres de sécurité réglées juste sous ta position basse.',
  },
  'Front Squat': {
    consignes: [
      'Barre posée sur l’avant des épaules, coudes hauts.',
      'Pieds largeur d’épaules, buste droit, descends entre les talons.',
      'Garde les coudes hauts et pousse le sol pour remonter.',
    ],
    erreurs: [
      'Laisser tomber les coudes : la barre roule vers l’avant.',
      'Pencher le buste en avant à la remontée.',
    ],
    securite: 'Squatte dans un rack avec les barres de sécurité réglées juste sous ta position basse.',
  },
  'Goblet Squat': {
    consignes: [
      'Haltère ou kettlebell tenu contre la poitrine, coudes vers le bas.',
      'Pieds largeur d’épaules, descends entre les talons, genoux dans l’axe des pieds.',
      'Descends le plus bas possible en gardant le dos droit, puis remonte.',
    ],
    erreurs: [
      'Éloigner la charge de la poitrine.',
      'Arrondir le dos en bas du mouvement.',
    ],
  },
  'Presse à Cuisses': {
    consignes: [
      'Dos et bassin collés au dossier, pieds largeur de hanches au milieu de la plateforme.',
      'Descends tant que le bassin reste collé, genoux dans l’axe des pieds.',
      'Pousse avec tout le pied, sans verrouiller les genoux en haut.',
    ],
    erreurs: [
      'Laisser le bassin décoller du siège en bas.',
      'Pousser sur la pointe des pieds.',
    ],
    securite: 'Garde les sécurités de la machine engagées et ne verrouille pas les genoux en haut.',
  },
  'Presse à Cuisses (Pieds Hauts)': {
    consignes: [
      'Pieds hauts sur la plateforme, largeur de hanches, dos collé au dossier.',
      'Descends tant que le bassin reste collé, genoux dans l’axe des pieds.',
      'Pousse avec les talons, sans verrouiller les genoux en haut.',
    ],
    erreurs: [
      'Laisser le bassin décoller du siège en bas.',
      'Décoller les talons de la plateforme.',
    ],
    securite: 'Garde les sécurités de la machine engagées et ne verrouille pas les genoux en haut.',
  },
  'Leg Extension': {
    consignes: [
      'Règle le dossier pour que tes genoux soient alignés avec l’axe de la machine.',
      'Boudin sur le bas des tibias, tiens les poignées.',
      'Tends les jambes, tiens une seconde, puis redescends lentement.',
    ],
    erreurs: [
      'Lancer la charge avec de l’élan.',
      'Décoller les fesses du siège.',
    ],
  },
  'Fentes Avant (Haltères)': {
    consignes: [
      'Debout, haltères le long du corps, fais un grand pas en avant.',
      'Descends jusqu’à ce que le genou arrière frôle le sol, buste droit.',
      'Pousse sur le pied avant pour revenir, puis change de jambe.',
    ],
    erreurs: [
      'Faire un pas trop court : le talon avant décolle.',
      'Laisser le genou avant rentrer vers l’intérieur.',
    ],
  },
  'Step Up (Haltères)': {
    consignes: [
      'Pose tout le pied sur une marche ou une chaise solide.',
      'Pousse sur la jambe du dessus pour monter, sans t’aider du pied resté au sol.',
      'Redescends lentement sur la même jambe.',
    ],
    erreurs: [
      'Rebondir sur le pied du bas pour monter.',
      'Laisser le genou rentrer vers l’intérieur.',
    ],
    securite: 'Vérifie que la marche ou la chaise est stable et ne glisse pas.',
  },
  'Fentes Arrière': {
    consignes: [
      'Debout, pieds largeur de hanches, fais un grand pas en arrière.',
      'Descends jusqu’à ce que le genou arrière frôle le sol, buste droit.',
      'Pousse sur le pied avant pour revenir debout.',
    ],
    erreurs: [
      'Poser le pied arrière sur la même ligne que l’avant : tu perds l’équilibre.',
      'Laisser le genou avant rentrer vers l’intérieur.',
    ],
  },
  'Fentes Bulgares': {
    consignes: [
      'Pied arrière posé sur un banc, pied avant un grand pas devant.',
      'Buste un peu penché en avant, descends sur la jambe avant.',
      'Pousse sur tout le pied avant pour remonter.',
    ],
    erreurs: [
      'Pousser avec la jambe arrière.',
      'Laisser le genou avant rentrer vers l’intérieur.',
    ],
  },
  'Fentes Marchées': {
    consignes: [
      'Fais un grand pas en avant et descends, genou arrière près du sol.',
      'Pousse sur le pied avant et enchaîne le pas suivant avec l’autre jambe.',
      'Garde le buste droit et le regard devant.',
    ],
    erreurs: [
      'Faire des pas trop courts.',
      'Laisser le genou avant rentrer vers l’intérieur.',
    ],
  },
  'Split Squat': {
    consignes: [
      'Un pied devant, un pied derrière, écartés d’un grand pas, les deux au sol.',
      'Descends à la verticale jusqu’à ce que le genou arrière frôle le sol.',
      'Pousse sur le pied avant pour remonter, les pieds ne bougent pas.',
    ],
    erreurs: [
      'Mettre les pieds sur la même ligne, comme sur un fil.',
      'Pencher le buste loin en avant.',
    ],
  },
  'Squat Bulgare': {
    consignes: [
      'Pied arrière sur un banc ou une chaise, pied avant un grand pas devant.',
      'Descends sur la jambe avant, buste un peu penché en avant.',
      'Pousse sur tout le pied avant pour remonter.',
    ],
    erreurs: [
      'Se placer trop près du banc : le talon avant décolle.',
      'Laisser le genou avant rentrer vers l’intérieur.',
    ],
  },
  // ISCHIOS
  'Leg Curl Assis': {
    consignes: [
      'Règle la machine pour que tes genoux soient alignés avec son axe.',
      'Boudin du haut sur les cuisses, boudin du bas au dessus des talons.',
      'Plie les genoux à fond, puis remonte lentement.',
    ],
    erreurs: [
      'Décoller les fesses du siège.',
      'Laisser la charge remonter d’un coup.',
    ],
  },
  'Romanian Deadlift (Haltères)': {
    consignes: [
      'Debout, haltères devant les cuisses, genoux légèrement fléchis et fixes.',
      'Pousse les hanches en arrière, haltères le long des cuisses, dos plat.',
      'Descends jusqu’à l’étirement des ischios, puis reviens en poussant les hanches.',
    ],
    erreurs: [
      'Arrondir le dos pour descendre plus bas.',
      'Éloigner les haltères des jambes.',
    ],
    securite: 'Garde le dos neutre : l’amplitude s’arrête là où le dos commence à s’arrondir.',
  },
  'Nordic Curl': {
    consignes: [
      'À genoux sur un tapis, talons calés sous un support solide ou tenus par un partenaire.',
      'Corps droit des genoux à la tête, hanches tendues.',
      'Descends le plus lentement possible, amortis avec les mains, puis repousse pour remonter.',
    ],
    erreurs: [
      'Plier les hanches pendant la descente.',
      'Se laisser tomber sans freiner.',
    ],
    securite: 'Mets un tapis sous les genoux et garde les mains prêtes à te réceptionner.',
  },
  // FESSIERS
  'Abducteurs Machine': {
    consignes: [
      'Assis, dos contre le dossier, coussins contre l’extérieur des genoux.',
      'Écarte les jambes en poussant avec l’extérieur des cuisses.',
      'Reviens lentement sans laisser les charges se toucher.',
    ],
    erreurs: [
      'Lancer les jambes avec de l’élan.',
      'Décoller le dos du dossier en fin de série.',
    ],
  },
  'Banded Walks': {
    consignes: [
      'Élastique autour des jambes, au dessus des genoux ou aux chevilles.',
      'Genoux légèrement fléchis, pieds largeur de hanches, buste droit.',
      'Fais des petits pas sur le côté en gardant l’élastique tendu.',
    ],
    erreurs: [
      'Laisser les genoux rentrer vers l’intérieur.',
      'Rapprocher les pieds au point de détendre l’élastique.',
    ],
  },
  'Cable Kickback': {
    consignes: [
      'Sangle à la cheville, face à la poulie basse, mains sur le support.',
      'Buste légèrement penché, pousse la jambe tendue vers l’arrière.',
      'Serre le fessier en haut, puis reviens lentement.',
    ],
    erreurs: [
      'Cambrer le bas du dos pour monter la jambe plus haut.',
      'Tourner le bassin vers l’extérieur.',
    ],
  },
  'Hip Thrust Barre': {
    consignes: [
      'Haut du dos contre le banc, barre sur les hanches avec une protection.',
      'Pieds à plat largeur de hanches, placés pour avoir les tibias verticaux en haut.',
      'Monte les hanches jusqu’à aligner épaules, hanches et genoux, serre les fessiers.',
    ],
    erreurs: [
      'Cambrer le bas du dos en haut au lieu de serrer les fessiers.',
      'Placer les pieds trop loin : les ischios travaillent plus que les fessiers.',
    ],
  },
  'Hip Thrust Machine': {
    consignes: [
      'Haut du dos contre le dossier, ceinture ou coussin sur les hanches.',
      'Pieds à plat largeur de hanches, menton rentré.',
      'Monte les hanches jusqu’à aligner épaules, hanches et genoux, serre les fessiers.',
    ],
    erreurs: [
      'Cambrer le bas du dos en haut.',
      'Redescendre d’un coup sans contrôle.',
    ],
  },
  'Hip Thrust (Poids Corps)': {
    consignes: [
      'Haut du dos contre un banc ou un canapé stable, pieds à plat au sol.',
      'Monte les hanches en poussant dans les talons, tibias verticaux en haut.',
      'Serre les fessiers en haut une seconde, puis redescends.',
    ],
    erreurs: [
      'Cambrer le bas du dos en haut.',
      'Pousser sur la pointe des pieds.',
    ],
  },
  'Single Leg Hip Thrust': {
    consignes: [
      'Haut du dos contre un banc, un pied au sol, l’autre jambe en l’air.',
      'Pousse dans le talon au sol pour monter les hanches.',
      'Garde le bassin horizontal et serre le fessier en haut.',
    ],
    erreurs: [
      'Laisser le bassin pencher du côté de la jambe levée.',
      'Cambrer le bas du dos en haut.',
    ],
  },
  'Glute Bridge': {
    consignes: [
      'Allongé sur le dos, genoux fléchis, pieds à plat près des fesses.',
      'Pousse dans les talons pour monter les hanches.',
      'Serre les fessiers en haut une seconde, puis redescends lentement.',
    ],
    erreurs: [
      'Cambrer le bas du dos au lieu de serrer les fessiers.',
      'Laisser les genoux rentrer vers l’intérieur.',
    ],
  },
  // MOLLETS
  'Mollets Debout (Machine)': {
    consignes: [
      'Épaules sous les coussins, avant des pieds sur la marche, talons dans le vide.',
      'Descends les talons jusqu’à l’étirement des mollets.',
      'Monte sur la pointe des pieds, tiens une seconde, redescends lentement.',
    ],
    erreurs: [
      'Rebondir en bas du mouvement.',
      'Plier les genoux pour aider.',
    ],
  },
  'Mollets Assis (Machine)': {
    consignes: [
      'Assis, coussin sur le bas des cuisses, avant des pieds sur la marche.',
      'Descends les talons jusqu’à l’étirement des mollets.',
      'Monte sur la pointe des pieds, tiens une seconde, redescends lentement.',
    ],
    erreurs: [
      'Rebondir en bas du mouvement.',
      'Faire de petites répétitions rapides sans amplitude.',
    ],
  },
  'Mollets Haltères (Debout)': {
    consignes: [
      'Haltères en main, avant des pieds sur une marche, talons dans le vide.',
      'Descends les talons jusqu’à l’étirement des mollets.',
      'Monte sur la pointe des pieds, tiens une seconde, redescends lentement.',
    ],
    erreurs: [
      'Rebondir en bas du mouvement.',
      'Plier les genoux pour aider.',
    ],
  },
  'Mollets Unilatéral': {
    consignes: [
      'Sur une jambe, avant du pied sur une marche, une main sur un mur.',
      'Descends le talon jusqu’à l’étirement du mollet.',
      'Monte sur la pointe du pied, tiens une seconde, redescends lentement.',
    ],
    erreurs: [
      'Tirer avec la main sur le mur pour monter.',
      'Rebondir en bas du mouvement.',
    ],
  },
  // ABDOS
  'Crunch Poulie Haute': {
    consignes: [
      'À genoux face à la poulie haute, corde tenue près de la tête.',
      'Enroule le buste vers le bas, coudes vers les cuisses.',
      'Les hanches restent fixes, remonte lentement.',
    ],
    erreurs: [
      'Tirer avec les bras au lieu d’enrouler le buste.',
      'Reculer les hanches pour s’asseoir sur les talons.',
    ],
  },
  'Crunch Abdominal': {
    consignes: [
      'Allongé sur le dos, genoux fléchis, pieds au sol.',
      'Enroule le haut du dos pour décoller les épaules du sol.',
      'Redescends lentement, le bas du dos reste au sol.',
    ],
    erreurs: [
      'Tirer sur la nuque avec les mains.',
      'Monter avec de l’élan.',
    ],
  },
  'Dead Bug': {
    consignes: [
      'Allongé sur le dos, bras tendus vers le plafond, genoux pliés à 90 degrés.',
      'Tends un bras et la jambe opposée vers le sol, lentement.',
      'Reviens et change de côté, bas du dos collé au sol.',
    ],
    erreurs: [
      'Laisser le bas du dos se creuser.',
      'Aller trop vite et bloquer la respiration.',
    ],
  },
  'Landmine Rotation': {
    consignes: [
      'Pieds largeur d’épaules, bout de la barre à deux mains devant toi, bras tendus.',
      'Abdos gainés, descends la barre vers une hanche en pivotant les pieds et les hanches.',
      'Ramène la barre au centre, puis de l’autre côté, sous contrôle.',
    ],
    erreurs: [
      'Tourner seulement avec les bras.',
      'Tordre le bas du dos au lieu de pivoter avec les pieds et les hanches.',
    ],
  },
  'Russian Twist': {
    consignes: [
      'Assis, genoux fléchis, buste penché en arrière, dos droit.',
      'Mains jointes devant toi, tourne lentement le buste d’un côté puis de l’autre.',
      'Commence pieds au sol, puis lève les pieds quand c’est facile.',
    ],
    erreurs: [
      'Arrondir le bas du dos pendant la rotation.',
      'Tourner vite avec de l’élan au lieu de contrôler.',
    ],
  },
  'Pallof Press': {
    consignes: [
      'De profil à la poulie ou à l’élastique, poignée contre la poitrine.',
      'Pousse les mains droit devant toi jusqu’aux bras tendus.',
      'Résiste à la rotation : le buste reste face à l’avant, puis reviens.',
    ],
    erreurs: [
      'Laisser le buste tourner vers la poulie.',
      'Se placer trop près : il n’y a plus de tension.',
    ],
  },
  'Relevé de jambes (Sol)': {
    consignes: [
      'Allongé sur le dos, mains sous les fesses ou le long du corps.',
      'Monte les jambes tendues ou fléchies jusqu’à la verticale.',
      'Redescends lentement, le bas du dos reste collé au sol.',
    ],
    erreurs: [
      'Laisser le bas du dos se creuser en descendant.',
      'Laisser tomber les jambes d’un coup.',
    ],
  },
  'Relevé de jambes Suspendu': {
    consignes: [
      'Suspendu à la barre, bras tendus, épaules engagées.',
      'Monte les genoux ou les jambes en enroulant le bassin.',
      'Redescends lentement sans te balancer.',
    ],
    erreurs: [
      'Se balancer pour prendre de l’élan.',
      'Monter les jambes sans enrouler le bassin.',
    ],
  },
  'Roulette Abdos (Abs Wheel)': {
    consignes: [
      'À genoux, mains sur la roulette sous les épaules.',
      'Gaine fort, roule vers l’avant aussi loin que tu gardes le dos plat.',
      'Reviens en tirant avec les abdos, sans plier les hanches d’abord.',
    ],
    erreurs: [
      'Creuser le bas du dos en avançant.',
      'Aller trop loin dès le début.',
    ],
  },
  'Gainage Planche': {
    consignes: [
      'Avant bras au sol, coudes sous les épaules.',
      'Corps aligné des talons à la tête, fessiers et abdos serrés.',
      'Respire normalement pendant toute la tenue.',
    ],
    erreurs: [
      'Laisser les hanches s’affaisser.',
      'Monter les fesses trop haut.',
    ],
  },
  // AVANT-BRAS
  'Dead Hang': {
    consignes: [
      'Suspendu à la barre, prise largeur d’épaules, bras tendus.',
      'Épaules engagées, loin des oreilles.',
      'Serre la barre et respire calmement pendant toute la tenue.',
    ],
    erreurs: [
      'Laisser les épaules remonter vers les oreilles.',
      'Se balancer pendant la tenue.',
    ],
  },
  'Farmer Walk': {
    consignes: [
      'Une charge lourde dans chaque main, bras tendus le long du corps.',
      'Épaules basses, buste droit, abdos serrés.',
      'Marche à pas courts et réguliers en regardant devant toi.',
    ],
    erreurs: [
      'Pencher le buste d’un côté.',
      'Hausser les épaules vers les oreilles.',
    ],
    securite: 'Pose les charges en pliant les jambes, dos plat, pas en te penchant.',
  },
  'Extension Poignets': {
    consignes: [
      'Assis, avant bras posés sur les cuisses, paumes vers le sol.',
      'Monte le dos de la main vers le haut en pliant seulement le poignet.',
      'Redescends lentement, l’avant bras reste fixe.',
    ],
    erreurs: [
      'Soulever l’avant bras pour aider.',
      'Prendre trop lourd et faire de petits mouvements.',
    ],
  },
  'Gripper / Hand Grip': {
    consignes: [
      'Place la pince au creux de la main, poignée fixe contre la paume.',
      'Ferme complètement la pince, tiens une seconde.',
      'Relâche lentement, sans laisser la pince s’ouvrir d’un coup.',
    ],
    erreurs: [
      'Fermer à moitié sans aller au bout.',
      'Plier le poignet pendant l’effort.',
    ],
  },
  'Wrist Roller': {
    consignes: [
      'Debout, bras tendus devant toi, mains sur le rouleau.',
      'Enroule la corde en tournant les poignets l’un après l’autre.',
      'Déroule lentement jusqu’en bas, sans laisser filer.',
    ],
    erreurs: [
      'Baisser les bras pendant l’effort.',
      'Laisser la charge redescendre d’un coup.',
    ],
  },
  // CHAÎNE POSTÉRIEURE
  'Kettlebell Swings': {
    consignes: [
      'Pieds un peu plus larges que les hanches, kettlebell au sol devant toi.',
      'Fais passer la kettlebell entre les cuisses en poussant les hanches en arrière, dos plat.',
      'Tends les hanches d’un coup : la kettlebell monte à hauteur de poitrine.',
    ],
    erreurs: [
      'Plier les genoux comme pour un squat au lieu de pousser les hanches.',
      'Monter la kettlebell avec les bras.',
    ],
    securite: 'Garde le dos plat à chaque passage entre les jambes et dégage l’espace autour.',
  },
  // SPORTS (football, padel, cou)
  'Copenhagen Plank': {
    consignes: [
      'Sur le côté, avant bras au sol, jambe du dessus posée sur un banc.',
      'Monte les hanches jusqu’à aligner épaules, hanches et pieds.',
      'Tiens le temps prévu en respirant, puis change de côté.',
    ],
    erreurs: [
      'Laisser tomber les hanches vers le sol.',
      'Commencer en levier long quand le genou sur le banc est déjà dur.',
    ],
  },
  'Box Jumps': {
    consignes: [
      'Face à une caisse stable, pieds à largeur de hanches.',
      'Plie les jambes, lance les bras et saute sur la caisse.',
      'Reçois toi pieds à plat, genoux souples, puis redescends en marchant.',
    ],
    erreurs: [
      'Choisir une caisse trop haute et finir accroupi tout en bas.',
      'Laisser les genoux rentrer vers l’intérieur à la réception.',
    ],
    securite: 'Utilise une caisse qui ne glisse pas et redescends toujours en marchant.',
  },
  'Single Leg Deadlift': {
    consignes: [
      'Debout sur une jambe, genou d’appui légèrement fléchi.',
      'Penche le buste en poussant la hanche en arrière, l’autre jambe monte derrière.',
      'Garde le dos droit et remonte en serrant le fessier.',
    ],
    erreurs: [
      'Arrondir le dos pour descendre plus bas.',
      'Ouvrir la hanche de la jambe arrière vers le côté.',
    ],
  },
  'Gainage Latéral': {
    consignes: [
      'Sur le côté, coude sous l’épaule, jambes tendues l’une sur l’autre.',
      'Monte les hanches pour aligner la tête, les hanches et les pieds.',
      'Tiens en respirant normalement, puis change de côté.',
    ],
    erreurs: [
      'Laisser les hanches descendre ou partir en arrière.',
      'Hausser l’épaule d’appui vers l’oreille.',
    ],
  },
  'Bird Dog': {
    consignes: [
      'À quatre pattes, mains sous les épaules, genoux sous les hanches.',
      'Tends lentement un bras et la jambe opposée, à l’horizontale.',
      'Tiens une seconde, reviens sans bouger le dos, puis change de côté.',
    ],
    erreurs: [
      'Creuser le bas du dos en montant la jambe trop haut.',
      'Tourner le bassin pendant le mouvement.',
    ],
  },
  'Cou Isométrique (4 directions)': {
    consignes: [
      'Assis ou debout, dos droit, regard droit devant.',
      'Pose la main sur le front et pousse la tête contre elle, la tête ne bouge pas.',
      'Refais derrière la tête, puis sur chaque côté, à effort moyen.',
    ],
    erreurs: [
      'Pousser d’un coup au lieu de monter l’effort progressivement.',
      'Bloquer la respiration pendant le maintien.',
    ],
    securite: 'Douleur qui descend dans le bras, fourmillements ou vertige : arrête et consulte.',
  },
  'Cou Élastique (4 directions)': {
    consignes: [
      'Élastique léger autour de la tête, l’autre bout fixé à hauteur du visage.',
      'Fais un petit mouvement lent vers l’avant, l’arrière puis chaque côté.',
      'Reviens lentement au centre à chaque répétition.',
    ],
    erreurs: [
      'Aller en bout d’amplitude, tête très penchée.',
      'Prendre un élastique trop dur et faire des à coups.',
    ],
    securite: 'Douleur qui descend dans le bras, fourmillements ou vertige : arrête et consulte.',
  },
  'Rotation Externe (Élastique)': {
    consignes: [
      'Élastique fixé à hauteur du coude, coude collé au corps et plié à 90 degrés.',
      'Tourne l’avant bras vers l’extérieur sans décoller le coude.',
      'Reviens lentement, en contrôlant l’élastique.',
    ],
    erreurs: [
      'Décoller le coude du corps pour aller plus loin.',
      'Prendre un élastique trop dur et tourner le buste.',
    ],
  },
  // 25 octobre 2026, nuit : les nouveaux exercices animés de « Quoi faire ? »
  'Shoulder Press Machine': {
    consignes: [
      'Règle le siège pour que les poignées soient à hauteur des épaules.',
      'Dos collé au dossier, pieds à plat, pousse les poignées vers le haut.',
      'Redescends lentement jusqu’à hauteur des épaules.',
    ],
    erreurs: [
      'Cambrer le bas du dos en poussant.',
      'Verrouiller les coudes d’un coup en haut.',
    ],
  },
  'Leg Curl Couché': {
    consignes: [
      'Allongé sur le ventre, genoux juste après le bord du banc, boudin au dessus des talons.',
      'Tiens les poignées et garde les hanches collées au banc.',
      'Ramène les talons vers les fesses, puis redescends lentement.',
    ],
    erreurs: [
      'Décoller les hanches pour aider le mouvement.',
      'Laisser la charge retomber d’un coup.',
    ],
  },
  'Extension Triceps Poulie (Barre)': {
    consignes: [
      'Face à la poulie haute, barre en main, coudes collés au corps.',
      'Pousse la barre vers le bas jusqu’aux bras tendus.',
      'Remonte lentement, les coudes restent fixes.',
    ],
    erreurs: [
      'Écarter les coudes ou les avancer en remontant.',
      'Pencher le buste pour pousser avec le poids du corps.',
    ],
  },
  'Curl Concentré': {
    consignes: [
      'Assis au bout d’un banc, jambes écartées, l’arrière du bras calé contre l’intérieur de la cuisse.',
      'Monte l’haltère vers l’épaule sans bouger le coude.',
      'Redescends lentement jusqu’au bras presque tendu.',
    ],
    erreurs: [
      'Décoller le coude de la cuisse pour lancer la charge.',
      'Remonter le buste en même temps que l’haltère.',
    ],
  },
  'Hack Squat': {
    consignes: [
      'Dos collé au dossier, épaules sous les boudins, pieds à largeur d’épaules sur le plateau.',
      'Descends en pliant les genoux dans l’axe des pieds, jusqu’aux cuisses parallèles au plateau.',
      'Pousse avec tout le pied pour remonter, sans verrouiller les genoux.',
    ],
    erreurs: [
      'Laisser les genoux rentrer vers l’intérieur.',
      'Décoller les talons ou le bas du dos du dossier.',
    ],
    securite: 'Après ta dernière répétition, remets les sécurités avant de lâcher les poignées.',
  },
  'Élévations Frontales (Haltères)': {
    consignes: [
      'Debout, un haltère dans chaque main devant les cuisses, coudes très légèrement fléchis.',
      'Monte les bras devant toi jusqu’à hauteur des épaules.',
      'Redescends lentement, sans balancer le buste.',
    ],
    erreurs: [
      'Se pencher en arrière pour monter la charge.',
      'Monter les haltères au dessus de la tête.',
    ],
  },
  'Curl Machine': {
    consignes: [
      'Règle le siège pour que tes coudes soient alignés avec l’axe de la machine.',
      'L’arrière des bras à plat sur le pupitre, monte les poignées vers les épaules.',
      'Redescends lentement jusqu’aux bras presque tendus.',
    ],
    erreurs: [
      'Décoller les bras du pupitre.',
      'Laisser la charge redescendre d’un coup.',
    ],
  },
  'Arnold Press': {
    consignes: [
      'Assis, dos collé au dossier, haltères devant le visage, paumes tournées vers toi.',
      'Pousse vers le haut en tournant les paumes vers l’avant pendant la montée.',
      'Redescends lentement en refaisant la rotation inverse jusqu’à la position de départ.',
    ],
    erreurs: [
      'Cambrer le bas du dos pour finir la poussée.',
      'Descendre trop vite en perdant la rotation.',
    ],
  },
  'Écartés Incliné (Haltères)': {
    consignes: [
      'Banc à environ 30 degrés, haltères au dessus de la poitrine, coudes légèrement fléchis.',
      'Ouvre les bras en arc de cercle jusqu’à sentir l’étirement des pectoraux.',
      'Referme en gardant le même angle de coude, comme pour serrer un gros arbre.',
    ],
    erreurs: [
      'Plier les coudes en descendant, le mouvement devient un développé.',
      'Descendre les haltères plus bas que les épaules.',
    ],
    securite: 'Prends des haltères légers : en bras ouverts, l’épaule supporte beaucoup de charge.',
  },
  'Good Morning': {
    consignes: [
      'Barre légère posée sur le haut du dos, pieds à largeur de hanches, genoux souples.',
      'Pousse les hanches vers l’arrière et penche le buste, dos bien droit.',
      'Remonte en poussant les hanches vers l’avant, sans arrondir le dos.',
    ],
    erreurs: [
      'Arrondir le dos en bas du mouvement.',
      'Plier fortement les genoux comme pour un squat.',
    ],
    securite: 'Commence avec une barre à vide et descends seulement tant que ton dos reste plat.',
  },
  'Reverse Lunges': {
    consignes: [
      'Debout, pieds serrés, mains sur les hanches.',
      'Recule une jambe d’un grand pas et descends le genou arrière près du sol.',
      'Pousse sur le talon de la jambe avant pour revenir pieds serrés.',
    ],
    erreurs: [
      'Laisser le genou avant dépasser loin devant les orteils.',
      'Pencher le buste en avant pendant la descente.',
    ],
  },
  'Kick-back Poulie': {
    consignes: [
      'Sangle à la cheville, face à la poulie basse, mains sur le montant.',
      'Pousse la jambe vers l’arrière en serrant le fessier, jambe presque tendue.',
      'Reviens lentement sans laisser la charge tirer la jambe.',
    ],
    erreurs: [
      'Cambrer le bas du dos pour monter la jambe plus haut.',
      'Tourner le bassin sur le côté.',
    ],
  },
  'Curl Barre Droite': {
    consignes: [
      'Debout, barre en prise supination à largeur d’épaules, coudes collés au corps.',
      'Monte la barre vers les épaules en pliant seulement les coudes.',
      'Redescends lentement jusqu’aux bras tendus.',
    ],
    erreurs: [
      'Balancer le buste pour lancer la barre.',
      'Avancer les coudes en haut du mouvement.',
    ],
  },
  'Skullcrusher Haltères': {
    consignes: [
      'Allongé sur un banc plat, haltères au dessus de la poitrine, paumes face à face.',
      'Plie seulement les coudes pour descendre les haltères de chaque côté de la tête.',
      'Tends les bras pour remonter, sans écarter les coudes.',
    ],
    erreurs: [
      'Écarter les coudes vers l’extérieur.',
      'Bouger les épaules au lieu des coudes.',
    ],
    securite: 'Commence léger : les haltères passent près de la tête.',
  },
  'Hanging Knee Raise': {
    consignes: [
      'Suspendu à la barre, bras tendus, corps immobile.',
      'Monte les genoux jusqu’à hauteur des hanches ou plus haut.',
      'Redescends lentement les jambes sans te balancer.',
    ],
    erreurs: [
      'Se balancer pour lancer les jambes.',
      'Laisser retomber les jambes d’un coup.',
    ],
  },
  'Développé Haltères Debout': {
    consignes: [
      'Debout, pieds à largeur de hanches, haltères à hauteur des épaules.',
      'Serre les abdos et les fessiers, puis pousse les haltères au dessus de la tête.',
      'Redescends lentement jusqu’à hauteur des épaules.',
    ],
    erreurs: [
      'Se pencher en arrière en cambrant le dos.',
      'Plier les genoux pour aider la poussée.',
    ],
  },
  'Rowing T-Bar': {
    consignes: [
      'Debout au dessus de la barre, genoux fléchis, buste penché à 45 degrés, dos plat.',
      'Tire la poignée vers le bas de la poitrine en ramenant les coudes en arrière.',
      'Redescends lentement jusqu’aux bras tendus.',
    ],
    erreurs: [
      'Arrondir le dos pendant la traction.',
      'Se redresser pour tirer la charge.',
    ],
    securite: 'Garde le dos plat du début à la fin : si tu ne peux pas, allège la charge.',
  },
  'Cable Crunch': {
    consignes: [
      'À genoux face à la poulie haute, corde tenue de chaque côté de la tête.',
      'Enroule le buste vers le bas en rapprochant les coudes des cuisses.',
      'Remonte lentement, hanches toujours au dessus des genoux.',
    ],
    erreurs: [
      'Tirer avec les bras au lieu d’enrouler le dos.',
      'Pousser les hanches vers l’arrière pour descendre.',
    ],
  },
  'Close Grip Bench Press': {
    consignes: [
      'Allongé sur le banc, mains sur la barre à largeur d’épaules, pieds au sol.',
      'Descends la barre sur le bas de la poitrine, coudes près du corps.',
      'Pousse pour tendre les bras, sans écarter les coudes.',
    ],
    erreurs: [
      'Serrer les mains trop près, ce qui fait mal aux poignets.',
      'Écarter les coudes en descendant.',
    ],
    securite: 'Travaille avec un pareur ou des barres de sécurité réglées juste sous la poitrine.',
  },
  'Sumo Deadlift': {
    consignes: [
      'Pieds très écartés, pointes vers l’extérieur, mains sur la barre entre les genoux.',
      'Pousse les genoux vers l’extérieur, poitrine haute, dos plat.',
      'Pousse dans le sol pour te redresser, barre collée au corps.',
    ],
    erreurs: [
      'Arrondir le dos au départ.',
      'Laisser les genoux rentrer vers l’intérieur.',
    ],
    securite: 'Apprends le mouvement avec une barre légère avant de charger.',
  },
  'Tirage Menton (Upright Row)': {
    consignes: [
      'Debout, barre en prise pronation, mains un peu plus serrées que les épaules.',
      'Monte la barre près du corps en levant les coudes sur les côtés.',
      'Arrête quand les coudes arrivent à hauteur des épaules, puis redescends lentement.',
    ],
    erreurs: [
      'Monter les coudes plus haut que les épaules.',
      'Balancer le buste pour monter la barre.',
    ],
    securite: 'Arrête l’exercice s’il te pince dans l’épaule.',
  },
  'Straight Arm Pulldown': {
    consignes: [
      'Face à la poulie haute, barre en main, bras tendus, buste légèrement penché.',
      'Ramène la barre vers les cuisses en arc de cercle, bras toujours tendus.',
      'Remonte lentement jusqu’à hauteur de la tête.',
    ],
    erreurs: [
      'Plier les coudes, le mouvement devient un tirage.',
      'Se pencher en avant pour descendre la barre.',
    ],
  },
  'Chest Supported Row': {
    consignes: [
      'Allongé sur le ventre sur un banc incliné, poitrine sur le dossier, haltères en main.',
      'Tire les haltères le long des côtes en ramenant les coudes en arrière.',
      'Redescends lentement jusqu’aux bras tendus.',
    ],
    erreurs: [
      'Décoller la poitrine du banc pour tirer.',
      'Hausser les épaules vers les oreilles.',
    ],
  },
  'Mountain Climbers': {
    consignes: [
      'En planche haute, mains sous les épaules, dos plat.',
      'Ramène un genou sous la poitrine, puis repousse la jambe en arrière.',
      'Alterne les jambes à un rythme que tu peux tenir, hanches à hauteur des épaules.',
    ],
    erreurs: [
      'Monter les fesses vers le plafond.',
      'Laisser les épaules dépasser loin devant les mains.',
    ],
  },
  'Donkey Kicks': {
    consignes: [
      'À quatre pattes, mains sous les épaules, genoux sous les hanches.',
      'Monte une jambe vers l’arrière, genou plié à 90 degrés, plante du pied vers le plafond.',
      'Serre le fessier en haut, puis redescends sans poser le genou.',
    ],
    erreurs: [
      'Cambrer le bas du dos pour monter la jambe plus haut.',
      'Ouvrir la hanche sur le côté.',
    ],
  },
  'Sit-ups': {
    consignes: [
      'Allongé sur le dos, genoux pliés, pieds à plat au sol, bras croisés sur la poitrine.',
      'Enroule le buste jusqu’en position assise, pieds toujours au sol.',
      'Redescends lentement, vertèbre après vertèbre.',
    ],
    erreurs: [
      'Tirer sur la nuque avec les mains.',
      'Se laisser retomber d’un coup.',
    ],
  },
  'Kickback Triceps (Haltère)': {
    consignes: [
      'Un genou et une main sur le banc, dos plat parallèle au sol, haltère dans l’autre main.',
      'Bras collé le long du corps, tends l’avant bras vers l’arrière jusqu’au bras tendu.',
      'Reviens lentement à 90 degrés sans bouger le haut du bras.',
    ],
    erreurs: [
      'Laisser le coude descendre pendant le mouvement.',
      'Balancer l’haltère pour finir le geste.',
    ],
  },
  'Box Squat': {
    consignes: [
      'Barre sur le haut du dos, une box basse derrière toi, pieds un peu plus larges que les épaules.',
      'Pousse les hanches en arrière et descends jusqu’à t’asseoir légèrement sur la box.',
      'Garde le dos plat et pousse dans le sol pour te relever.',
    ],
    erreurs: [
      'Se laisser tomber lourdement sur la box.',
      'Relâcher le dos une fois assis.',
    ],
    securite: 'Règle les barres de sécurité du rack juste sous la hauteur de la box.',
  },
  'Adducteurs Machine': {
    consignes: [
      'Assis, dos contre le dossier, coussins contre l’intérieur des genoux.',
      'Serre les jambes l’une contre l’autre en contrôlant le mouvement.',
      'Rouvre lentement sans laisser les plaques retomber.',
    ],
    erreurs: [
      'Ouvrir trop grand au départ, au point de tirer dans l’aine.',
      'Décoller le bassin du siège.',
    ],
  },
  'Élévations Latérales (Machine)': {
    consignes: [
      'Règle le siège pour que tes épaules soient alignées avec l’axe de la machine.',
      'L’extérieur des bras contre les coussins, monte les bras sur les côtés jusqu’à hauteur des épaules.',
      'Redescends lentement sans laisser les plaques retomber.',
    ],
    erreurs: [
      'Hausser les épaules vers les oreilles.',
      'Monter les bras plus haut que les épaules.',
    ],
  },
  'Smith Machine Squat': {
    consignes: [
      'Barre sur le haut du dos, pieds un peu devant la barre, à largeur d’épaules.',
      'Débloque la barre, puis descends jusqu’aux cuisses parallèles au sol, dos droit.',
      'Pousse avec tout le pied pour remonter, sans verrouiller les genoux.',
    ],
    erreurs: [
      'Laisser les genoux rentrer vers l’intérieur.',
      'Décoller les talons en bas.',
    ],
    securite: 'Règle les butées de sécurité juste sous ta position la plus basse.',
  },
  'Leg Curl Debout': {
    consignes: [
      'Debout face à la machine, cuisses contre le coussin, boudin derrière la cheville.',
      'Plie le genou pour ramener le talon vers la fesse, cuisse immobile.',
      'Redescends lentement jusqu’à la jambe presque tendue.',
    ],
    erreurs: [
      'Cambrer le dos pour monter le talon.',
      'Laisser la charge retomber d’un coup.',
    ],
  },
  'Low Row Machine': {
    consignes: [
      'Assis, poitrine contre le coussin, pieds sur les appuis, poignées basses en main.',
      'Tire les poignées vers le bas des côtes en ramenant les coudes en arrière.',
      'Reviens lentement jusqu’aux bras tendus, poitrine toujours sur le coussin.',
    ],
    erreurs: [
      'Décoller la poitrine du coussin pour tirer.',
      'Hausser les épaules vers les oreilles.',
    ],
  },
  'Curl Haltères Simultané': {
    consignes: [
      'Debout, un haltère dans chaque main, paumes vers l’avant, coudes collés au corps.',
      'Monte les deux haltères ensemble vers les épaules en pliant seulement les coudes.',
      'Redescends lentement jusqu’aux bras tendus.',
    ],
    erreurs: [
      'Balancer le buste pour lancer les haltères.',
      'Avancer les coudes en haut du mouvement.',
    ],
  },
  'Tirage Horizontal Unilatéral': {
    consignes: [
      'Assis face à la poulie basse, pieds sur l’appui, buste droit, une poignée dans une main.',
      'Tire la poignée vers la hanche en ramenant le coude en arrière.',
      'Reviens lentement jusqu’au bras tendu, sans tourner le buste.',
    ],
    erreurs: [
      'Tourner le buste pour tirer plus loin.',
      'Arrondir le dos en allant chercher la poignée.',
    ],
  },
  'Clamshells': {
    consignes: [
      'Allongé sur le côté, genoux pliés, pieds l’un sur l’autre, tête posée sur le bras.',
      'Ouvre le genou du dessus en gardant les pieds collés.',
      'Referme lentement sans laisser le bassin basculer en arrière.',
    ],
    erreurs: [
      'Rouler le bassin en arrière pour ouvrir plus.',
      'Décoller les pieds l’un de l’autre.',
    ],
  },
  'Crunch Inversé': {
    consignes: [
      'Allongé sur le dos, bras le long du corps, hanches et genoux pliés à 90 degrés.',
      'Ramène les genoux vers la poitrine en enroulant le bassin, qui se décolle du sol.',
      'Redescends lentement le bassin, sans poser les pieds.',
    ],
    erreurs: [
      'Lancer les jambes avec de l’élan.',
      'Pousser fort avec les mains au sol.',
    ],
  },
  'Y Raises': {
    consignes: [
      'Allongé sur le ventre sur un banc incliné, poitrine sur le dossier, haltères légers en main.',
      'Monte les bras tendus devant toi en Y, pouces vers le haut, jusqu’à l’alignement avec le buste.',
      'Redescends lentement jusqu’aux bras pendants.',
    ],
    erreurs: [
      'Hausser les épaules vers les oreilles.',
      'Décoller la poitrine du banc pour monter plus haut.',
    ],
    securite: 'Prends des haltères très légers : ce sont de petits muscles de l’épaule.',
  },
  'Plate Pinch': {
    consignes: [
      'Deux disques lisses face contre face, tenus par la tranche entre le pouce et les doigts.',
      'Bras tendus le long du corps, serre fort avec les doigts et tiens le temps prévu.',
      'Repose les disques avant que la prise ne lâche.',
    ],
    erreurs: [
      'Serrer avec la paume au lieu des doigts.',
      'Prendre des disques trop lourds dès le début.',
    ],
    securite: 'Tiens les disques à côté de tes pieds, jamais à leur aplomb.',
  },
  'Traversée de Disques (Pince)': {
    consignes: [
      'Un disque dans chaque main, tenu par le bord du bout des doigts, bras tendus.',
      'Garde le dos droit, serre les abdos et marche lentement sur un parcours court.',
      'Pose les disques en pliant les jambes avant que les doigts ne lâchent.',
    ],
    erreurs: [
      'Serrer avec la paume au lieu du bout des doigts.',
      'Marcher vite et laisser les disques se balancer.',
    ],
    securite: 'Commence léger et augmente le poids petit à petit, comme le conseillent les entraîneurs.',
  },
  'Pince Haltère (par la tête)': {
    consignes: [
      'Debout, un haltère dans chaque main, tenu par la tête du bout des doigts.',
      'Bras tendus le long du corps, garde tout dans les doigts, pas dans la paume.',
      'Marche lentement sur un parcours court, puis repose les haltères en pliant les jambes.',
    ],
    erreurs: [
      'Laisser l’haltère glisser dans le creux de la main.',
      'Hausser les épaules pendant la tenue.',
    ],
    securite: 'Tiens les haltères à côté de tes pieds, jamais à leur aplomb.',
  },
  'Suspension Serviette': {
    consignes: [
      'Passe une serviette ou une veste de kimono sur la barre de traction.',
      'Saisis les deux pans à pleines mains et reste suspendu, bras tendus.',
      'Tiens le temps prévu en respirant calmement, puis redescends en douceur.',
    ],
    erreurs: [
      'Lâcher d’un coup au lieu de reposer les pieds.',
      'Prendre une serviette trop fine ou qui glisse.',
    ],
    securite: 'Vérifie que la serviette est solide et bien posée sur la barre avant de te suspendre.',
  },
  'Tractions Serviette': {
    consignes: [
      'Serviette ou veste de kimono passée sur la barre, un pan dans chaque main.',
      'Tire pour monter la poitrine vers la barre, coudes vers le bas.',
      'Redescends lentement jusqu’aux bras tendus.',
    ],
    erreurs: [
      'Balancer les jambes pour monter.',
      'Descendre d’un coup en bas.',
    ],
    securite: 'Si tu ne fais pas encore de tractions, commence par la suspension à la serviette.',
  },
  'Curl Disque': {
    consignes: [
      'Debout, un disque tenu par les côtés avec les deux mains, bras le long du corps.',
      'Plie les coudes pour monter le disque vers les épaules, en le serrant fort.',
      'Redescends lentement sans laisser le disque glisser.',
    ],
    erreurs: [
      'Balancer le buste pour monter le disque.',
      'Prendre un disque trop lourd pour la prise.',
    ],
  },
  'Tenue Trap Bar': {
    consignes: [
      'Debout au centre de la barre hexagonale, mains au milieu des poignées.',
      'Soulève la barre dos plat, puis reste debout bras tendus.',
      'Tiens le temps prévu, puis repose la barre en pliant les jambes.',
    ],
    erreurs: [
      'Arrondir le dos en soulevant ou en posant la barre.',
      'Hausser les épaules pendant la tenue.',
    ],
    securite: 'Soulève et repose la barre dos plat, comme pour un soulevé de terre.',
  },
  'Tirage Manches (Kumi Kata)': {
    consignes: [
      'Saisis les manches ou les bandes accrochées à l’espalier comme tu saisirais le kimono.',
      'Tire vers toi en serrant fort, en faisant le geste de ta prise de garde avec beaucoup d’amplitude.',
      'Reviens lentement en gardant la saisie fermée.',
    ],
    erreurs: [
      'Lâcher la prise entre deux tirages.',
      'Faire des petits gestes sans amplitude.',
    ],
  },
};

/** La fiche technique d’un exercice, par son nom exact */
export function ficheDe(nom: string): FicheExo | undefined {
  return FICHES_EXO[nom];
}
