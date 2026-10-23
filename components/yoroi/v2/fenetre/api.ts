/**
 * Fenetre maison YOROI : remplace les fenetres systeme d'iOS (alerte, saisie, feuille de choix).
 * API imperative, utilisable partout (ecrans, composants, services de lib/).
 * L'hote <FenetreHost /> est monte une seule fois dans app/_layout.tsx.
 *
 *   appAlert('Supprimer ?', 'C’est définitif.', [
 *     { text: 'Annuler', style: 'cancel' },
 *     { text: 'Supprimer', style: 'destructive', onPress: () => ... },
 *   ]);
 *
 * Fichier sans dependance (pas de react-native) : il peut etre importe depuis n'importe quel service.
 */
import type { ReactNode } from 'react';
import { traduire } from '@/lib/i18n/tr';

export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive' | 'primary';

export interface AppAlertButton {
  text?: string;
  style?: AppAlertButtonStyle;
  /** Pour une fenetre de saisie, recoit le texte tape */
  onPress?: (value?: string) => void;
  /** Force ce bouton comme action principale (indigo plein) */
  isPreferred?: boolean;
}

export interface AppAlertOptions {
  /** Comme l'alerte systeme : la fenetre se ferme au toucher du voile seulement s'il y a un bouton cancel */
  cancelable?: boolean;
  onDismiss?: () => void;
  userInterfaceStyle?: 'unspecified' | 'light' | 'dark';
  /** Petit pictogramme au-dessus du titre */
  icon?: ReactNode;
  /** Illustration dessinee au-dessus du titre, posee telle quelle (sans tuile), voir components/yoroi/v2/messages */
  illustration?: ReactNode;
}

export type AppPromptType = 'default' | 'plain-text' | 'secure-text' | 'login-password';

export interface FenetreInput {
  type: AppPromptType;
  defaultValue?: string;
  placeholder?: string;
  keyboardType?: string;
}

export interface FenetreRequest {
  id: number;
  kind: 'alert' | 'choices' | 'prompt';
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  options?: AppAlertOptions;
  input?: FenetreInput;
}

let seq = 0;
const queue: FenetreRequest[] = [];
const listeners = new Set<() => void>();
let closeSignal = 0;

function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // un ecouteur defaillant ne bloque pas les autres
    }
  });
}

function push(req: Omit<FenetreRequest, 'id'>) {
  queue.push({ ...req, id: ++seq });
  emit();
}

function clean(buttons?: AppAlertButton[] | null): AppAlertButton[] {
  const list = (buttons ?? []).filter(Boolean);
  return list.length > 0 ? list : [{ text: 'OK' }];
}

/** Meme signature que l'alerte systeme de React Native */
export function appAlert(title: string, message?: string | null, buttons?: AppAlertButton[] | null, options?: AppAlertOptions): void {
  push({ kind: 'alert', title: title ?? '', message: message ?? undefined, buttons: clean(buttons), options });
}

/** Petite feuille de choix en bas de l'ecran (remplace la feuille de choix d'iOS). Un bouton Annuler est ajoute s'il manque. */
export function appChoices(
  title: string | undefined,
  message: string | undefined,
  choices: AppAlertButton[],
  options?: AppAlertOptions & { cancelText?: string },
): void {
  const list = (choices ?? []).filter(Boolean);
  const withCancel = list.some((b) => b.style === 'cancel') ? list : [...list, { text: options?.cancelText ?? traduire('Annuler'), style: 'cancel' as const }];
  push({ kind: 'choices', title: title ?? '', message: message ?? undefined, buttons: withCancel, options });
}

/** Meme signature que la saisie systeme d'iOS (fonctionne aussi sur Android) */
export function appPrompt(
  title: string,
  message?: string | null,
  callbackOrButtons?: ((text: string) => void) | AppAlertButton[] | null,
  type: AppPromptType = 'plain-text',
  defaultValue?: string,
  keyboardType?: string,
  options?: AppAlertOptions & { placeholder?: string },
): void {
  const buttons: AppAlertButton[] =
    typeof callbackOrButtons === 'function'
      ? [
          { text: traduire('Annuler'), style: 'cancel' },
          { text: 'OK', onPress: (v) => callbackOrButtons(v ?? '') },
        ]
      : callbackOrButtons && callbackOrButtons.length > 0
        ? callbackOrButtons
        : [{ text: traduire('Annuler'), style: 'cancel' }, { text: 'OK' }];
  push({
    kind: 'prompt',
    title: title ?? '',
    message: message ?? undefined,
    buttons,
    options,
    input: { type: type === 'default' ? 'plain-text' : type, defaultValue, placeholder: options?.placeholder, keyboardType },
  });
}

/**
 * Demande un mot de passe (saisie masquee). Resout avec le texte, ou null si annule.
 * Si minLength est donne et que le texte est trop court, la fenetre le dit puis se rouvre.
 */
export function appPassword(opts: { title: string; message?: string; confirmLabel?: string; minLength?: number }): Promise<string | null> {
  return new Promise((resolve) => {
    const ask = () =>
      appPrompt(
        opts.title,
        opts.message,
        [
          { text: traduire('Annuler'), style: 'cancel', onPress: () => resolve(null) },
          {
            text: opts.confirmLabel ?? traduire('Valider'),
            onPress: (v) => {
              const typed = v ?? '';
              const min = opts.minLength ?? 0;
              if (typed.length === 0 || typed.length < min) {
                appAlert(
                  typed.length === 0 ? traduire('Mot de passe vide') : traduire('Mot de passe trop court'),
                  min > 0 ? traduire("Il faut au moins {0} caractères.", min) : traduire('Tape ton mot de passe.'),
                  [
                    { text: traduire('Annuler'), style: 'cancel', onPress: () => resolve(null) },
                    { text: traduire('Réessayer'), onPress: ask },
                  ],
                );
                return;
              }
              resolve(typed);
            },
          },
        ],
        'secure-text',
        '',
        undefined,
        { placeholder: traduire('Mot de passe') },
      );
    ask();
  });
}

/** Ferme la fenetre affichee sans declencher de bouton */
export function closeAppAlert(): void {
  closeSignal += 1;
  emit();
}

// ---------- reserve a l'hote ----------

export function _fenetreCurrent(): FenetreRequest | undefined {
  return queue[0];
}

export function _fenetreCloseSignal(): number {
  return closeSignal;
}

export function _fenetreDone(id: number): void {
  const i = queue.findIndex((r) => r.id === id);
  if (i >= 0) queue.splice(i, 1);
  emit();
}

export function _fenetreSubscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
