/** Texte colle ailleurs (Dicte ta seance) et passe a l'import du carnet, sans le mettre dans l'adresse */
let attente: string | null = null;
export function deposerTexteCarnet(t: string): void {
  attente = t;
}
export function prendreTexteCarnet(): string | null {
  const t = attente;
  attente = null;
  return t;
}

/**
 * Le texte ressemble-t-il a un carnet de seances (plusieurs lignes « exercice charge series x reps »,
 * ou une date sur sa ligne puis des exercices) ? Alors on propose l'import plutot que la dictee.
 */
export function ressembleCarnet(t: string): boolean {
  const lignes = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lignes[0] && /exercise_title/i.test(lignes[0])) return true;
  const exos = lignes.filter((l) => /[a-zà-ÿ]/i.test(l) && /\d\s*[x×*]\s*\d/i.test(l)).length;
  const dates = lignes.filter((l) => /^(\w+\s+)?\d{1,2}\s*[/.\-]\s*\d{1,2}([/.\-]\d{2,4})?$/.test(l)).length;
  return exos >= 3 || (exos >= 2 && dates >= 1);
}
