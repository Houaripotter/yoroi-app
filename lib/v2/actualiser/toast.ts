/**
 * Petit message « À jour » apres un tirer pour actualiser (28 octobre 2026).
 * Fichier sans dependance (pas de react-native) : l'hote <ToastActualiser /> est monte une seule fois
 * dans app/_layout.tsx, n'importe quel ecran ou service peut afficher un message.
 */
export type ToneToast = 'ok' | 'erreur';
export type MessageToast = { id: number; texte: string; ton: ToneToast };

let seq = 0;
let courant: MessageToast | null = null;
const ecouteurs = new Set<(m: MessageToast | null) => void>();

function diffuser() {
  ecouteurs.forEach((l) => {
    try {
      l(courant);
    } catch {
      // un ecouteur defaillant ne bloque pas les autres
    }
  });
}

/** Affiche un message court en bas de l'ecran ; le suivant remplace le precedent */
export function montrerToast(texte: string, ton: ToneToast = 'ok'): void {
  if (!texte) return;
  courant = { id: ++seq, texte, ton };
  diffuser();
}

/** Appelee par l'hote quand le message a fini de s'afficher */
export function effacerToast(id: number): void {
  if (courant?.id !== id) return;
  courant = null;
  diffuser();
}

export function ecouterToast(l: (m: MessageToast | null) => void): () => void {
  ecouteurs.add(l);
  return () => {
    ecouteurs.delete(l);
  };
}

export function toastCourant(): MessageToast | null {
  return courant;
}
