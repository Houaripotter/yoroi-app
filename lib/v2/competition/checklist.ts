/**
 * Check-list de preparation avant une competition : les etapes apparaissent a l'approche du jour J.
 * Meme cle de stockage et memes identifiants que l'ancien ecran, la progression est conservee.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PrepIcon = 'scale' | 'bolt' | 'moon' | 'drop' | 'heart' | 'shield' | 'star' | 'sun' | 'flag';

export type PrepStep = {
  id: string;
  label: string;
  description: string;
  icon: PrepIcon;
  /** l'etape apparait quand il reste au plus ce nombre de jours */
  fromDays: number;
  checked: boolean;
};

export const CHECKLIST_KEY_PREFIX = '@yoroi_comp_checklist_';

const STEPS: Omit<PrepStep, 'checked'>[] = [
  { id: 'weight_check', label: 'Pesée de contrôle', description: 'Pèse-toi chaque matin à jeun. Ajuste sans paniquer.', icon: 'scale', fromDays: 14 },
  { id: 'train_taper', label: 'Affûtage technique', description: 'Réduis le volume. Garde l’intensité. Répète ton plan de combat.', icon: 'bolt', fromDays: 7 },
  { id: 'sleep_8h', label: 'Huit heures de sommeil', description: 'Couche-toi tôt. La récupération de la nuit est ton arme secrète.', icon: 'moon', fromDays: 7 },
  { id: 'hydration', label: 'Hydratation réglée', description: 'Deux à trois litres par jour. Pas d’excès d’eau la veille.', icon: 'drop', fromDays: 7 },
  { id: 'nutrition', label: 'Repas d’avant compétition', description: 'Glucides complexes et protéines. Aucun aliment nouveau.', icon: 'heart', fromDays: 3 },
  { id: 'gear', label: 'Matériel prêt', description: 'Kimono ou tenue, protections, encas, eau : vérifie la veille.', icon: 'shield', fromDays: 2 },
  { id: 'mental', label: 'Visualisation', description: 'Cinq minutes les yeux fermés. Vois ton combat, calme.', icon: 'star', fromDays: 2 },
  { id: 'light_breakfast', label: 'Petit déjeuner léger', description: 'Facile à digérer, deux à trois heures avant la pesée.', icon: 'sun', fromDays: 1 },
  { id: 'warmup_plan', label: 'Plan d’échauffement', description: 'Une routine connue. Aucune surprise le jour J.', icon: 'flag', fromDays: 1 },
];

export async function loadChecklist(compId: number): Promise<PrepStep[]> {
  let saved: Record<string, boolean> = {};
  try {
    const raw = await AsyncStorage.getItem(CHECKLIST_KEY_PREFIX + compId);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') saved = p;
    }
  } catch {
    saved = {};
  }
  return STEPS.map((s) => ({ ...s, checked: !!saved[s.id] }));
}

export async function saveChecklist(compId: number, steps: PrepStep[]): Promise<void> {
  const map: Record<string, boolean> = {};
  steps.forEach((s) => {
    map[s.id] = s.checked;
  });
  try {
    await AsyncStorage.setItem(CHECKLIST_KEY_PREFIX + compId, JSON.stringify(map));
  } catch {
    // stockage indisponible
  }
}

export function phaseOf(daysLeft: number): { label: string; color: string; kanji: string } {
  if (daysLeft < 0) return { label: 'Terminée', color: '#8B8D96', kanji: '終' };
  if (daysLeft === 0) return { label: 'Jour J', color: '#2C4A84', kanji: '戦' };
  if (daysLeft === 1) return { label: 'Veille du combat', color: '#2C4A84', kanji: '前' };
  if (daysLeft <= 3) return { label: 'Phase finale', color: '#A8832F', kanji: '決' };
  if (daysLeft <= 7) return { label: 'Dernière semaine', color: '#4F6B28', kanji: '週' };
  if (daysLeft <= 14) return { label: 'Affûtage', color: '#2C4A84', kanji: '刃' };
  return { label: 'Préparation', color: '#1D2029', kanji: '備' };
}
