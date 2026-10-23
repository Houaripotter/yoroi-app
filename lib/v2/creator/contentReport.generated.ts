/**
 * Fichier ecrit par scripts/studio-content.mjs, ne pas modifier a la main.
 * Compteurs du contenu et controles de coherence, pour la rubrique Contenu du Studio.
 */
import { traduire } from '@/lib/i18n/tr';
export type ContentCount = { id: string; label: string; value: number };
export type ContentCheck = { id: string; label: string; ok: boolean; detail: string; count: number };

export const CONTENT_REPORT_AT = traduire("11/10/2026 à 1 h 21");

export const CONTENT_COUNTS: ContentCount[] = [
  {
    "id": "sports",
    "label": "Sports",
    "value": 202
  },
  {
    "id": "sports_illustres",
    "label": traduire("Sports illustrés"),
    "value": 49
  },
  {
    "id": "exercices",
    "label": traduire("Exercices de la bibliothèque"),
    "value": 1040
  },
  {
    "id": "exercices_saisie",
    "label": traduire("Exercices de saisie rapide"),
    "value": 56
  },
  {
    "id": "techniques",
    "label": traduire("Techniques du carnet"),
    "value": 47
  },
  {
    "id": "citations",
    "label": "Citations",
    "value": 100
  },
  {
    "id": "personnages",
    "label": "Personnages (images)",
    "value": 37
  },
  {
    "id": "packs",
    "label": traduire("Packs de personnages"),
    "value": 5
  },
  {
    "id": "scenes",
    "label": traduire("Scènes"),
    "value": 30
  },
  {
    "id": "fonds",
    "label": "Fonds verticaux",
    "value": 4
  },
  {
    "id": "ornements",
    "label": "Ornements",
    "value": 14
  },
  {
    "id": "carnet",
    "label": traduire("Illustrations du carnet"),
    "value": 16
  },
  {
    "id": "sons",
    "label": "Sons",
    "value": 10
  }
];

export const CONTENT_CHECKS: ContentCheck[] = [
  {
    "id": "sports_doublons",
    "label": traduire("Sports en double dans la liste"),
    "ok": true,
    "detail": traduire("202 sports, aucun en double"),
    "count": 0
  },
  {
    "id": "sports_images",
    "label": traduire("Sports illustrés complets (homme et femme, 3 niveaux)"),
    "ok": true,
    "detail": "49 sports, 6 images chacun",
    "count": 0
  },
  {
    "id": "sports_orphelins",
    "label": traduire("Dossiers d’illustration sans sport dans la liste"),
    "ok": true,
    "detail": traduire("Chaque dossier correspond à un sport"),
    "count": 0
  },
  {
    "id": "exercices_doublons",
    "label": traduire("Exercices en double dans la bibliothèque"),
    "ok": true,
    "detail": traduire("1040 exercices, aucun en double"),
    "count": 0
  },
  {
    "id": "modeles_doublons",
    "label": traduire("Identifiants d’exercice en double (saisie rapide)"),
    "ok": true,
    "detail": traduire("56 exercices de saisie, identifiants uniques"),
    "count": 0
  },
  {
    "id": "techniques_doublons",
    "label": "Techniques en double",
    "ok": true,
    "detail": traduire("47 techniques, aucune en double"),
    "count": 0
  },
  {
    "id": "citations_doublons",
    "label": "Citations en double",
    "ok": true,
    "detail": traduire("100 citations, aucune en double"),
    "count": 0
  },
  {
    "id": "guerrier",
    "label": traduire("Guerrier et guerrière, un par rang"),
    "ok": true,
    "detail": traduire("10 illustrations, les 5 rangs en homme et en femme"),
    "count": 0
  },
  {
    "id": "monde",
    "label": traduire("Personnages du monde en homme et en femme"),
    "ok": true,
    "detail": traduire("6 personnages, les deux genres"),
    "count": 0
  },
  {
    "id": "requires",
    "label": traduire("Fichiers appelés par le code et absents du projet"),
    "ok": true,
    "detail": traduire("1443 appels, tous les fichiers existent"),
    "count": 0
  },
  {
    "id": "sons",
    "label": traduire("Sons du chrono présents"),
    "ok": true,
    "detail": traduire("Cloche, claquettes, gong et bip présents"),
    "count": 0
  }
];

export const CONTENT_SOUNDS: string[] = ["beep.mp3","bell_end.mp3","clap10.mp3","fanfare-badge.mp3","gong.mp3","level-up.mp3","recovery.mp3","ring.mp3","victory.mp3","wizz.mp3"];
