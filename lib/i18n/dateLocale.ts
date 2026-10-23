// Locale date-fns de la langue de l'app (français, anglais, allemand, néerlandais).
import { fr, enUS, de, nl, es, ptBR, it } from 'date-fns/locale';
import { LANG } from './tr';

export const DATE_FNS_LOCALE = ({ fr, en: enUS, de, nl, es, pt: ptBR, it } as const)[LANG];
