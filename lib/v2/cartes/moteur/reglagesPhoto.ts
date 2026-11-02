/**
 * Interrupteur du module photo (phase native, 2 novembre 2026).
 *
 * Faux : analyserPhoto (analysePhoto.ts) rend toujours la reponse vide, sans appeler le natif, et la carte retombe
 * sur la zone sure et ton recadrage au doigt, comme avant la phase native.
 *
 * C'est une CONSTANTE du code JavaScript : la changer demande une nouvelle version de l'app (l'app n'a pas de mise a
 * jour a distance). Pour couper le module tout de suite sur un appareil, sans rien publier : l'interrupteur du moteur
 * des cartes sur « Ancien », dans le Studio createur (lib/v2/cartes/store.ts).
 */
export const MODULE_PHOTO_ACTIF: boolean = true;
