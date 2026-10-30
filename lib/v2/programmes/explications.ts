/**
 * Explications courtes des exercices (30 octobre 2026). Houari : sous chaque exercice, trois petits blocs,
 * « Position », « Mouvement » et « À éviter ». Une ligne chacun, pas un mur de texte.
 * Des repères de technique courants (NSCA, ACSM), comme les fiches techniques (fiches.ts), sans chiffre ni promesse.
 * Clés : nom exact des exercices des programmes du catalogue (catalogue.ts), vérifié par
 * __tests__/unit/explications.test.ts. Un exercice sans explication n'affiche rien.
 * Les textes sont en français ; traduire() les rend dans la langue du téléphone (lib/i18n/dict).
 * Données pures, aucun import React Native.
 */

export type ExplicationExo = { position: string; mouvement: string; eviter: string };

// des phrases partagées par plusieurs exercices, écrites une seule fois
const POS_BANC = 'Allongé, pieds au sol, omoplates serrées contre le banc.';
const MVT_DIPS = 'Descends en pliant les coudes, puis pousse pour remonter.';
const EVIT_DIPS = 'Descendre trop bas en forçant sur les épaules.';
const EVIT_BASSIN_TOMBE = 'Laisser le bassin s’affaisser.';
const EVIT_TIRER_BRAS = 'Plier les coudes et tirer avec les bras.';
const MVT_TRACTIONS = 'Tire la poitrine vers la barre, redescends jusqu’aux bras tendus.';
const EVIT_BALANCER_JAMBES = 'Balancer les jambes pour monter.';
const POS_TIRAGE_HORIZ = 'Assis, pieds calés, buste droit, bras tendus.';
const EVIT_BASCULER_BUSTE = 'Basculer le buste d’avant en arrière.';
const EVIT_DOS_ROND = 'Arrondir le dos.';
const EVIT_CAMBRER = 'Cambrer le bas du dos.';
const MVT_ELEV = 'Monte les bras sur les côtés jusqu’aux épaules, redescends lentement.';
const EVIT_ELAN_BUSTE = 'Donner de l’élan avec le buste.';
const EVIT_HAUSSER = 'Hausser les épaules vers les oreilles.';
const MVT_DEV_BARRE = 'Pousse la barre au dessus de la tête, en passant près du visage.';
const EVIT_COUDES_AVANCENT = 'Laisser les coudes avancer.';
const EVIT_ECARTER_COUDES = 'Écarter les coudes.';
const MVT_CURL = 'Monte en pliant les coudes, puis redescends lentement.';
const EVIT_BALANCER_BUSTE = 'Balancer le buste pour monter.';
const EVIT_BALANCER_CORPS = 'Balancer le corps.';
const EVIT_GENOUX_RENTRENT = 'Laisser les genoux rentrer vers l’intérieur.';
const MVT_PRESSE = 'Plie les genoux vers la poitrine, puis pousse sans verrouiller.';
const EVIT_DECOLLER_BAS_DOS = 'Décoller le bas du dos du dossier.';
const EVIT_RETOUR_RAPIDE = 'Laisser la charge revenir d’un coup.';
const MVT_RDL = 'Pousse les hanches en arrière, charge près des jambes, puis remonte.';
const MVT_HIP_THRUST = 'Monte les hanches en serrant les fessiers, puis redescends.';
const EVIT_CAMBRER_HAUT2 = 'Cambrer le bas du dos en haut du mouvement.';
const POS_BULGARE = 'Pied arrière posé sur un banc, pied avant bien devant.';
const MVT_FENTE = 'Descends le genou arrière vers le sol, puis pousse sur le pied avant.';
const EVIT_GENOU_AVANT = 'Laisser le genou avant rentrer vers l’intérieur.';
const POS_DEBOUT_DROIT = 'Debout, pieds largeur de hanches, buste droit.';
const MVT_MOLLETS = 'Monte sur la pointe des pieds, puis descends talons bas.';
const EVIT_REBONDIR = 'Rebondir en bas du mouvement.';
const MVT_PLANCHE_COTE = 'Monte les hanches et tiens, corps en ligne droite.';
const EVIT_HANCHES_TOMBENT = 'Laisser les hanches tomber.';
const EVIT_DECOLLER_DOS = 'Décoller le bas du dos du sol.';

export const EXPLICATIONS_EXO: Record<string, ExplicationExo> = {
  'Développé Couché (Barre)': { position: POS_BANC, mouvement: 'Descends la barre sur le bas des pectoraux, puis pousse vers le haut.', eviter: 'Faire rebondir la barre sur la poitrine.' },
  'Développé Couché (Haltères)': { position: POS_BANC, mouvement: 'Descends les haltères sous contrôle, coudes un peu rentrés, puis pousse.', eviter: 'Écarter les coudes à hauteur des épaules.' },
  'Développé Incliné (Haltères)': { position: 'Banc légèrement incliné, pieds au sol, omoplates serrées.', mouvement: 'Descends au niveau du haut de la poitrine, puis pousse vers le haut.', eviter: 'Incliner trop le banc : les épaules prennent le relais.' },
  'Chest Press (Machine)': { position: 'Assis dos calé, poignées à hauteur du milieu de la poitrine.', mouvement: 'Pousse devant toi sans verrouiller les coudes, puis reviens lentement.', eviter: 'Décoller le dos du dossier.' },
  'Pec Deck (Butterfly)': { position: 'Assis dos calé, coudes légèrement fléchis, à hauteur de poitrine.', mouvement: 'Rapproche les bras devant toi, puis ouvre lentement.', eviter: 'Ouvrir les bras trop loin derrière les épaules.' },
  'Écartés à la Poulie Haute': { position: 'Debout entre les poulies, un pied devant, buste un peu penché.', mouvement: 'Ramène les mains devant le bas de la poitrine, bras légèrement fléchis.', eviter: 'Plier les coudes et transformer l’écarté en poussée.' },
  'Écartés Couché (Haltères)': { position: 'Allongé, haltères au dessus de la poitrine, coudes légèrement fléchis.', mouvement: 'Ouvre les bras en arc jusqu’à l’étirement, puis referme.', eviter: 'Descendre trop bas, sous le niveau des épaules.' },
  'Dips (Focus Pectoraux)': { position: 'Bras tendus sur les barres, buste penché vers l’avant.', mouvement: MVT_DIPS, eviter: EVIT_DIPS },
  'Pompes (Poids du corps)': { position: 'Mains sous les épaules, corps gainé en ligne droite.', mouvement: 'Descends la poitrine près du sol, puis pousse.', eviter: EVIT_BASSIN_TOMBE },
  'Floor Press (Haltères)': { position: 'Allongé au sol, genoux pliés, haltères au dessus de la poitrine.', mouvement: 'Descends jusqu’à poser les bras au sol, puis pousse.', eviter: 'Laisser tomber les coudes au sol sans contrôle.' },
  'Pull Over Poulie Haute': { position: 'Face à la poulie haute, buste penché, bras presque tendus.', mouvement: 'Ramène la barre vers les cuisses en arc, puis remonte lentement.', eviter: EVIT_TIRER_BRAS },
  'Tirage Poitrine (Lat Pulldown)': { position: 'Assis, cuisses calées, mains un peu plus larges que les épaules.', mouvement: 'Tire la barre vers le haut de la poitrine, coudes vers le bas.', eviter: 'Te pencher en arrière pour tirer plus lourd.' },
  'Tractions (Pronation)': { position: 'Suspendu, paumes vers l’avant, mains plus larges que les épaules.', mouvement: MVT_TRACTIONS, eviter: EVIT_BALANCER_JAMBES },
  'Tractions Neutres': { position: 'Suspendu, paumes face à face, épaules basses.', mouvement: MVT_TRACTIONS, eviter: EVIT_BALANCER_JAMBES },
  'Rowing Haltère (One Arm)': { position: 'Une main et un genou sur le banc, dos plat.', mouvement: 'Tire l’haltère vers la hanche, coude près du corps.', eviter: 'Tourner le buste pour lever la charge.' },
  'Tirage Horizontal (Seated Row)': { position: POS_TIRAGE_HORIZ, mouvement: 'Tire vers le bas du ventre en serrant les omoplates.', eviter: EVIT_BASCULER_BUSTE },
  'Tirage Serré (V-Bar)': { position: POS_TIRAGE_HORIZ, mouvement: 'Tire la poignée vers le ventre, coudes près du corps.', eviter: EVIT_BASCULER_BUSTE },
  'Rowing Barre (Bent Over)': { position: 'Penché en avant, genoux fléchis, dos plat.', mouvement: 'Tire la barre vers le bas du ventre, puis redescends sous contrôle.', eviter: EVIT_DOS_ROND },
  'Face Pull': { position: 'Face à la poulie réglée à hauteur du visage, corde en main.', mouvement: 'Tire la corde vers le visage en écartant les mains.', eviter: EVIT_CAMBRER },
  'Inverted Row': { position: 'Sous une barre, corps gainé en ligne droite, bras tendus.', mouvement: 'Tire la poitrine vers la barre, puis redescends lentement.', eviter: EVIT_BASSIN_TOMBE },
  'Hyperextensions': { position: 'Hanches calées sur le support, pieds bloqués, dos neutre.', mouvement: 'Descends le buste, puis remonte jusqu’à l’alignement avec les jambes.', eviter: 'Cambrer fort en haut du mouvement.' },
  'Shrugs Haltères (Trapèzes)': { position: 'Debout, bras le long du corps, haltères en main.', mouvement: 'Monte les épaules vers les oreilles, puis redescends lentement.', eviter: 'Faire rouler les épaules.' },
  'Deadlift (Soulevé de terre)': { position: 'Pieds sous la barre, mains juste à l’extérieur des jambes, dos plat.', mouvement: 'Pousse le sol avec les jambes, barre collée aux jambes.', eviter: EVIT_DOS_ROND },
  'Trap Bar Deadlift': { position: 'Au centre de la barre, mains sur les poignées, dos plat.', mouvement: 'Pousse le sol, monte hanches et épaules ensemble.', eviter: EVIT_DOS_ROND },
  'Élévations Latérales (Haltères)': { position: 'Debout, haltères le long du corps, coudes légèrement fléchis.', mouvement: MVT_ELEV, eviter: EVIT_ELAN_BUSTE },
  'Élévations Latérales (Poulie)': { position: 'De profil à la poulie basse, poignée dans la main la plus éloignée.', mouvement: MVT_ELEV, eviter: EVIT_ELAN_BUSTE },
  'Élévations Latérales (Machine)': { position: 'Assis, bras contre les appuis, épaules basses.', mouvement: 'Monte les coudes sur les côtés jusqu’aux épaules, redescends lentement.', eviter: EVIT_HAUSSER },
  'Développé Haltères Assis': { position: 'Assis dos calé, haltères à hauteur des épaules.', mouvement: 'Pousse au dessus de la tête, puis redescends aux épaules.', eviter: EVIT_CAMBRER },
  'Développé Militaire Assis': { position: 'Assis dos calé, barre à hauteur du haut de la poitrine.', mouvement: MVT_DEV_BARRE, eviter: EVIT_CAMBRER },
  'Développé Militaire (Barre)': { position: 'Debout, pieds largeur de hanches, fessiers et abdos serrés.', mouvement: MVT_DEV_BARRE, eviter: EVIT_CAMBRER },
  'Push Press': { position: 'Debout, barre sur le haut de la poitrine, abdos serrés.', mouvement: 'Petite flexion des jambes, puis pousse la barre avec l’élan des jambes.', eviter: 'Plier trop les jambes, comme un squat.' },
  'Pike Push-ups': { position: 'Mains au sol, hanches hautes, corps en V inversé.', mouvement: 'Descends la tête vers le sol entre les mains, puis pousse.', eviter: 'Laisser les hanches redescendre.' },
  'Oiseau Machine (Reverse Pec Deck)': { position: 'Assis face au dossier, bras tendus devant toi.', mouvement: 'Ouvre les bras vers l’arrière, puis reviens lentement.', eviter: EVIT_HAUSSER },
  'Oiseau Haltères (Rear Delts)': { position: 'Penché en avant, dos plat, haltères sous les épaules.', mouvement: 'Écarte les bras sur les côtés, coudes légèrement fléchis.', eviter: 'Redresser le buste pour lever la charge.' },
  'Rotation Externe (Élastique)': { position: 'Debout, coude collé au flanc, plié à angle droit.', mouvement: 'Tourne l’avant bras vers l’extérieur, puis reviens lentement.', eviter: 'Décoller le coude du corps.' },
  'Extension Triceps Poulie (Corde)': { position: 'Face à la poulie haute, coudes collés au corps.', mouvement: 'Tends les bras vers le bas en écartant la corde.', eviter: EVIT_COUDES_AVANCENT },
  'Overhead Extension Poulie': { position: 'Dos à la poulie, corde derrière la tête, coudes vers le haut.', mouvement: 'Tends les bras au dessus de la tête, puis plie lentement.', eviter: EVIT_ECARTER_COUDES },
  'Barre au front (Skullcrusher)': { position: 'Allongé, barre au dessus du visage, bras tendus.', mouvement: 'Plie les coudes pour descendre vers le front, puis tends.', eviter: EVIT_ECARTER_COUDES },
  'Extension Haltère Nuque (2 mains)': { position: 'Haltère tenu à deux mains au dessus de la tête, buste droit.', mouvement: 'Descends l’haltère derrière la nuque, puis tends les bras.', eviter: EVIT_CAMBRER },
  'Dips Banc': { position: 'Mains sur le bord du banc, fesses juste devant.', mouvement: MVT_DIPS, eviter: EVIT_DIPS },
  'Curl Marteau (Hammer)': { position: 'Debout, haltères le long du corps, paumes face à face.', mouvement: MVT_CURL, eviter: EVIT_BALANCER_BUSTE },
  'Curl Barre EZ': { position: 'Debout, barre en main, coudes collés au corps.', mouvement: MVT_CURL, eviter: EVIT_BALANCER_BUSTE },
  'Curl Incliné (Haltères)': { position: 'Assis sur un banc incliné, bras tendus vers le sol.', mouvement: 'Monte les haltères sans avancer les coudes, puis redescends lentement.', eviter: EVIT_COUDES_AVANCENT },
  'Curl Poulie Basse': { position: 'Face à la poulie basse, coudes collés au corps.', mouvement: MVT_CURL, eviter: EVIT_BALANCER_BUSTE },
  'Curl Haltères Alterné': { position: 'Debout, haltères le long du corps, coudes près du corps.', mouvement: 'Monte un haltère puis l’autre, paume tournée vers toi.', eviter: EVIT_BALANCER_BUSTE },
  'Extension Poignets': { position: 'Avant bras posés sur les cuisses, paumes vers le sol.', mouvement: 'Monte le dos de la main, puis redescends lentement.', eviter: 'Décoller les avant bras des cuisses.' },
  'Wrist Roller': { position: 'Debout, bras tendus devant toi, mains sur le rouleau.', mouvement: 'Enroule la corde en tournant les poignets, puis déroule lentement.', eviter: 'Laisser les bras descendre.' },
  'Gripper / Hand Grip': { position: 'Pince en main, le manche calé dans la paume.', mouvement: 'Serre jusqu’à fermer la pince, puis relâche lentement.', eviter: 'Relâcher d’un coup.' },
  'Farmer Walk': { position: 'Debout, une charge lourde dans chaque main, épaules basses.', mouvement: 'Marche à petits pas, buste droit, abdos serrés.', eviter: 'Pencher le buste sur le côté.' },
  'Dead Hang': { position: 'Suspendu à la barre, bras tendus, mains largeur d’épaules.', mouvement: 'Tiens la position, épaules légèrement engagées, respire calmement.', eviter: EVIT_BALANCER_CORPS },
  'Squat Barre Libre': { position: 'Barre sur le haut du dos, pieds largeur d’épaules.', mouvement: 'Descends hanches en arrière, genoux dans l’axe des pieds, puis pousse.', eviter: 'Arrondir le dos en bas du mouvement.' },
  'Front Squat': { position: 'Barre posée sur l’avant des épaules, coudes hauts.', mouvement: 'Descends buste droit, genoux dans l’axe des pieds, puis pousse.', eviter: 'Laisser tomber les coudes.' },
  'Goblet Squat': { position: 'Haltère tenu contre la poitrine, pieds largeur d’épaules.', mouvement: 'Descends buste droit entre les genoux, puis remonte.', eviter: EVIT_GENOUX_RENTRENT },
  'Presse à Cuisses': { position: 'Dos et bassin calés, pieds largeur de hanches sur la plateforme.', mouvement: MVT_PRESSE, eviter: EVIT_DECOLLER_BAS_DOS },
  'Presse à Cuisses (Pieds Hauts)': { position: 'Dos et bassin calés, pieds hauts sur la plateforme.', mouvement: MVT_PRESSE, eviter: EVIT_DECOLLER_BAS_DOS },
  'Leg Extension': { position: 'Assis dos calé, rouleau sur le bas des tibias.', mouvement: 'Tends les jambes, puis redescends lentement.', eviter: 'Donner de l’élan pour monter.' },
  'Leg Curl Assis': { position: 'Assis dos calé, cuisses bloquées, rouleau au dessus des talons.', mouvement: 'Plie les genoux vers le bas, puis reviens lentement.', eviter: EVIT_RETOUR_RAPIDE },
  'Leg Curl Couché': { position: 'Allongé sur le ventre, rouleau au dessus des talons.', mouvement: 'Ramène les talons vers les fesses, puis redescends lentement.', eviter: 'Décoller les hanches du banc.' },
  'Deadlift Roumain': { position: 'Debout, barre en main, genoux légèrement fléchis.', mouvement: MVT_RDL, eviter: EVIT_DOS_ROND },
  'Romanian Deadlift (Haltères)': { position: 'Debout, haltères devant les cuisses, genoux légèrement fléchis.', mouvement: MVT_RDL, eviter: EVIT_DOS_ROND },
  'Single Leg Deadlift': { position: 'Debout sur une jambe, genou légèrement fléchi.', mouvement: 'Penche le buste en tendant l’autre jambe derrière, puis remonte.', eviter: 'Ouvrir la hanche sur le côté.' },
  'Hip Thrust Barre': { position: 'Haut du dos sur le banc, barre sur les hanches, pieds au sol.', mouvement: MVT_HIP_THRUST, eviter: EVIT_CAMBRER_HAUT2 },
  'Hip Thrust Machine': { position: 'Haut du dos calé, coussin sur les hanches, pieds au sol.', mouvement: MVT_HIP_THRUST, eviter: EVIT_CAMBRER_HAUT2 },
  'Hip Thrust (Poids Corps)': { position: 'Haut du dos sur le banc, genoux pliés, pieds au sol.', mouvement: MVT_HIP_THRUST, eviter: EVIT_CAMBRER_HAUT2 },
  'Single Leg Hip Thrust': { position: 'Haut du dos sur le banc, un pied au sol, l’autre levé.', mouvement: 'Monte les hanches en poussant sur le talon, puis redescends.', eviter: 'Laisser le bassin pencher d’un côté.' },
  'Squat Bulgare': { position: POS_BULGARE, mouvement: MVT_FENTE, eviter: EVIT_GENOU_AVANT },
  'Fentes Bulgares': { position: POS_BULGARE, mouvement: MVT_FENTE, eviter: EVIT_GENOU_AVANT },
  'Split Squat': { position: 'Un pied devant, un pied derrière, buste droit.', mouvement: MVT_FENTE, eviter: EVIT_GENOU_AVANT },
  'Fentes Arrière': { position: POS_DEBOUT_DROIT, mouvement: 'Recule d’un grand pas, descends le genou arrière, puis reviens.', eviter: EVIT_GENOU_AVANT },
  'Fentes Marchées': { position: POS_DEBOUT_DROIT, mouvement: 'Avance d’un grand pas, descends le genou arrière, enchaîne l’autre jambe.', eviter: EVIT_GENOU_AVANT },
  'Fentes Avant (Haltères)': { position: 'Debout, haltères le long du corps, buste droit.', mouvement: 'Avance d’un grand pas, descends le genou arrière, puis reviens.', eviter: EVIT_GENOU_AVANT },
  'Step Up (Haltères)': { position: 'Face au banc, haltères en main, un pied posé dessus.', mouvement: 'Monte en poussant sur le pied posé, puis redescends lentement.', eviter: 'Pousser surtout avec la jambe restée au sol.' },
  'Mollets Debout (Machine)': { position: 'Épaules sous les appuis, avant des pieds sur la marche.', mouvement: MVT_MOLLETS, eviter: EVIT_REBONDIR },
  'Mollets Assis (Machine)': { position: 'Assis, genoux sous le coussin, avant des pieds sur la marche.', mouvement: MVT_MOLLETS, eviter: EVIT_REBONDIR },
  'Mollets Unilatéral': { position: 'Sur un pied, avant du pied sur une marche, une main en appui.', mouvement: MVT_MOLLETS, eviter: EVIT_REBONDIR },
  'Nordic Curl': { position: 'À genoux, chevilles bloquées, corps droit des genoux à la tête.', mouvement: 'Descends lentement vers l’avant, amortis avec les mains en bas.', eviter: 'Plier les hanches en descendant.' },
  'Box Jumps': { position: 'Debout face à la box, pieds largeur de hanches.', mouvement: 'Saute en t’aidant des bras, atterris en douceur genoux fléchis.', eviter: 'Redescendre en sautant : descends en marchant.' },
  'Kettlebell Swings': { position: 'Pieds un peu plus larges que les hanches, kettlebell devant toi.', mouvement: 'Pousse les hanches vers l’avant pour lancer la kettlebell, bras relâchés.', eviter: 'Lever la kettlebell avec les bras.' },
  'Banded Walks': { position: 'Élastique autour des jambes, genoux légèrement fléchis.', mouvement: 'Fais des pas sur le côté en gardant l’élastique tendu.', eviter: EVIT_GENOUX_RENTRENT },
  'Abducteurs Machine': { position: 'Assis dos calé, coussins contre l’extérieur des genoux.', mouvement: 'Écarte les jambes, puis reviens lentement.', eviter: EVIT_RETOUR_RAPIDE },
  'Cable Kickback': { position: 'Sangle à la cheville, face à la poulie basse, mains en appui.', mouvement: 'Pousse la jambe vers l’arrière en serrant le fessier, puis reviens.', eviter: EVIT_CAMBRER },
  'Copenhagen Plank': { position: 'Sur le côté, avant bras au sol, pied du dessus sur un banc.', mouvement: MVT_PLANCHE_COTE, eviter: EVIT_HANCHES_TOMBENT },
  'Relevé de jambes Suspendu': { position: 'Suspendu à la barre, bras tendus, corps immobile.', mouvement: 'Monte les jambes en enroulant le bassin, puis redescends lentement.', eviter: EVIT_BALANCER_CORPS },
  'Relevé de jambes (Sol)': { position: 'Allongé sur le dos, bas du dos collé au sol.', mouvement: 'Monte les jambes, puis redescends lentement sans toucher le sol.', eviter: EVIT_DECOLLER_DOS },
  'Pallof Press': { position: 'De profil à la poulie, poignée contre la poitrine, pieds écartés.', mouvement: 'Tends les bras devant toi sans laisser le buste tourner.', eviter: 'Laisser la poulie te faire pivoter.' },
  'Dead Bug': { position: 'Sur le dos, bras vers le plafond, genoux pliés au dessus des hanches.', mouvement: 'Tends un bras et la jambe opposée, sans décoller le dos.', eviter: EVIT_DECOLLER_DOS },
  'Crunch Poulie Haute': { position: 'À genoux face à la poulie, corde tenue près de la tête.', mouvement: 'Enroule le buste vers le bassin, les hanches ne bougent pas.', eviter: EVIT_TIRER_BRAS },
  'Gainage Latéral': { position: 'Sur le côté, avant bras sous l’épaule, jambes tendues.', mouvement: MVT_PLANCHE_COTE, eviter: EVIT_HANCHES_TOMBENT },
  'Roulette Abdos (Abs Wheel)': { position: 'À genoux, mains sur la roulette sous les épaules.', mouvement: 'Roule vers l’avant en gardant le dos plat, puis reviens.', eviter: 'Laisser le bas du dos se creuser.' },
  'Landmine Rotation': { position: 'Debout, bout de la barre tenu à deux mains, bras tendus.', mouvement: 'Amène la barre d’un côté à l’autre en pivotant sur les pieds.', eviter: 'Tourner seulement avec les bras.' },
  'Bird Dog': { position: 'À quatre pattes, mains sous les épaules, genoux sous les hanches.', mouvement: 'Tends un bras et la jambe opposée, tiens, puis change.', eviter: 'Cambrer le dos en tendant la jambe.' },
  'Cou Élastique (4 directions)': { position: 'Assis, buste droit, élastique autour de la tête.', mouvement: 'Pousse doucement avec la tête dans chaque direction, puis reviens.', eviter: 'Faire des mouvements brusques.' },
  'Cou Isométrique (4 directions)': { position: 'Assis, buste droit, une main posée contre la tête.', mouvement: 'Pousse la tête contre la main sans bouger, dans chaque direction.', eviter: 'Pousser fort d’un coup.' },
};

const plier = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
let index: Map<string, ExplicationExo> | null = null;

/** L'explication d'un exercice, sans tenir compte des accents ni des majuscules. null : rien à montrer. */
export function explicationDe(nom: string | null | undefined): ExplicationExo | null {
  if (typeof nom !== 'string' || !nom.trim()) return null;
  const exact = EXPLICATIONS_EXO[nom];
  if (exact) return exact;
  if (!index) index = new Map(Object.entries(EXPLICATIONS_EXO).map(([k, v]) => [plier(k), v]));
  return index.get(plier(nom)) ?? null;
}
