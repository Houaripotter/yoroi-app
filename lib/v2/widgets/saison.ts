/**
 * Decorations de saison des widgets (18 octobre 2026), comme INRO : Halloween et Noel sur les widgets iPhone et iPad.
 * L'app calcule la saison du jour (lib/v2/saisons/calendrier.ts) et la passe au natif (setSeason), au meme moment
 * que la scene et le personnage (lib/v2/widgets/synchro.ts). Le reglage « Décorations de saison » coupe aussi
 * les widgets : la saison envoyee est alors vide, et le widget retire ses decorations.
 * Le widget garde la saison recue tant que la date tombe dans sa fenetre (memes dates dans GroupeYoroi.swift) :
 * le 2 novembre, la citrouille s'en va meme si l'app n'est pas ouverte.
 * Pas d'apercu force du Studio ici : les widgets suivent la vraie date.
 */
import { saisonAffichee, type SaisonId } from '@/lib/v2/saisons/calendrier';
import { lireDecorationsSaison } from '@/lib/v2/saisons/reglage';
import { ecrireSaisonNatif } from './natif';

/** La valeur passee au widget : « halloween », « noel », ou vide (aucune saison, ou decorations coupees) */
export type SaisonWidgets = SaisonId | '';

export function saisonPourWidgets(date: Date, active: boolean): SaisonWidgets {
  return saisonAffichee({ date, active, apercu: 'auto' }) ?? '';
}

let derniereSaison: SaisonWidgets | null = null;

/** Pour les tests : oublie la derniere saison envoyee */
export function oublierSaisonWidgets(): void {
  derniereSaison = null;
}

/**
 * Envoie la saison au widget si elle a change depuis le dernier envoi (le natif redessine alors les widgets).
 * Renvoie la valeur envoyee, ou null si rien n'est parti (inchangee, ou ancien build sans setSeason).
 */
export async function majSaisonWidgets(maintenant: Date = new Date()): Promise<SaisonWidgets | null> {
  const active = await lireDecorationsSaison();
  const s = saisonPourWidgets(maintenant, active);
  if (s === derniereSaison) return null;
  if (!(await ecrireSaisonNatif(s))) return null;
  derniereSaison = s;
  return s;
}
