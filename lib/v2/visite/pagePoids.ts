/**
 * 28 octobre 2026 (Houari : « la presentation s'adapte a mon application ») : la carte Ton poids de l'accueil a deux
 * pages (ton poids et ses paliers, puis ta courbe). La visite guidee montre l'une puis l'autre : elle demande la page,
 * la carte (components/yoroi/v2/accueil/CartePoids.tsx) ecoute et glisse dessus. Hors visite, rien n'est envoye.
 */
const ecouteurs = new Set<(page: number) => void>();

/** La visite montre cette page de la carte Ton poids (0 : ton poids et ses paliers, 1 : ta courbe) */
export function montrerPagePoids(page: number): void {
  ecouteurs.forEach((l) => {
    try {
      l(page);
    } catch {
      // une carte deja demontee : sans importance
    }
  });
}

/** La carte Ton poids suit la visite ; renvoie la fonction pour arreter d'ecouter */
export function ecouterPagePoids(l: (page: number) => void): () => void {
  ecouteurs.add(l);
  return () => {
    ecouteurs.delete(l);
  };
}
