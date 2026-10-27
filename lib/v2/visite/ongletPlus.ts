/**
 * 27 octobre 2026 (Houari : « on commence par le bouton plus, il appuie et il va dedans ») :
 * la visite guidee choisit l'onglet montre dans le menu du bouton + (Séance, Mensurations, Poids).
 * Le menu (app/ajouter.tsx) ecoute ; hors visite, rien n'est jamais envoye.
 */
export type OngletPlus = 'seance' | 'mesures' | 'poids';

const ecouteurs = new Set<(o: OngletPlus) => void>();

/** La visite montre cet onglet du menu + */
export function montrerOngletPlus(o: OngletPlus): void {
  ecouteurs.forEach((l) => {
    try {
      l(o);
    } catch {
      // un ecran deja demonte : sans importance
    }
  });
}

/** Le menu + suit la visite ; renvoie la fonction pour arreter d'ecouter */
export function ecouterOngletPlus(l: (o: OngletPlus) => void): () => void {
  ecouteurs.add(l);
  return () => {
    ecouteurs.delete(l);
  };
}
