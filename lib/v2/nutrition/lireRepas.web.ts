/**
 * « Mangé aujourd'hui » sur le web : ni Apple Santé ni Health Connect. Rien à lire, sauf la démonstration
 * de la copie web (?demo=1), jamais utilisée dans l'app.
 */
import type { EntreeRepas } from './mange';
import { demoRepas, estDemoWeb } from './mangeDemo';

export const FOURNISSEUR_REPAS = 'Apple Santé';

export async function lireRepas(_jours = 7): Promise<EntreeRepas[] | null> {
  return estDemoWeb() ? demoRepas() : null;
}
