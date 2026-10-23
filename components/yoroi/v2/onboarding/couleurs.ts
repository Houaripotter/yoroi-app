/**
 * Couleurs d'encre de l'onboarding (vague 29) : une teinte par tampon d'objectif et de frein,
 * en harmonie avec la charte (papier #F2F1EC, encre #1D2029). Le rouge vif reste reserve aux records.
 * ink : l'encre du tampon, la bordure et la coche quand la carte est choisie ; fond : la carte choisie.
 * 17 octobre 2026 (revue de l'onboarding) : ENCRES_THEME suit le mode clair ou sombre au moment ou l'encre est lue
 * (accesseurs), comme les domaines de l'accueil (accueil/domaines.ts). En sombre, les fonds pastel clairs rendaient
 * les textes du theme illisibles (bandeau « Te peser aux memes moments », bloc YOROI de « Tout au meme endroit »,
 * carte d'objectif choisie). Les ecrans de l'onboarding l'utilisent ; ENCRES (fixe) reste pour les autres ecrans.
 */
export type Encre = { readonly ink: string; readonly fond: string };

export const ENCRES = {
  vermillon: { ink: '#BA6440', fond: '#F7E9E0' },
  or: { ink: '#A87B22', fond: '#F5EDD9' },
  mousse: { ink: '#5A7631', fond: '#E8EEDB' },
  indigo: { ink: '#2C4A84', fond: '#E3E8F3' },
  prune: { ink: '#7B3F6E', fond: '#F2E4EE' },
  sarcelle: { ink: '#1E6B68', fond: '#DCEEEB' },
} satisfies Record<string, Encre>;

export type EncreId = keyof typeof ENCRES;

/** Sombre : encre claire sur un fond sombre teinte (texte papier #F2F1EC lisible, AA) */
export const ENCRES_SOMBRE: Record<EncreId, Encre> = {
  vermillon: { ink: '#E9A07F', fond: '#33231D' },
  or: { ink: '#D8B562', fond: '#2F2A1C' },
  mousse: { ink: '#A9C77F', fond: '#232B1C' },
  indigo: { ink: '#8FA8DE', fond: '#212B42' },
  prune: { ink: '#E3A3CB', fond: '#33202C' },
  sarcelle: { ink: '#7FCDC6', fond: '#17302E' },
};

// lu a la demande : evite de charger la palette (et React Native) dans les tests purs qui importent ce fichier
function sombre(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return !!require('@/components/yoroi/livePalette').paletteSombre();
  } catch {
    return false;
  }
}

function vive(id: EncreId): Encre {
  return {
    get ink() {
      return (sombre() ? ENCRES_SOMBRE : ENCRES)[id].ink;
    },
    get fond() {
      return (sombre() ? ENCRES_SOMBRE : ENCRES)[id].fond;
    },
  };
}

/** Les memes encres, qui suivent le mode clair ou sombre a chaque lecture */
export const ENCRES_THEME: Record<EncreId, Encre> = {
  vermillon: vive('vermillon'),
  or: vive('or'),
  mousse: vive('mousse'),
  indigo: vive('indigo'),
  prune: vive('prune'),
  sarcelle: vive('sarcelle'),
};
