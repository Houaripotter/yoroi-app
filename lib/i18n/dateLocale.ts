// Locale date-fns de la langue de l'app (français, anglais, allemand, néerlandais).
import { fr, enUS, de, nl, es, ptBR, it, tr, ja, ko, zhCN, th, id, sv, da, nb, fi, vi, ms, hi, el, hu, pl, ru, uk, ro, cs, arSA } from 'date-fns/locale';
import { LANG } from './tr';

export const DATE_FNS_LOCALE = ({ fr, en: enUS, de, nl, es, pt: ptBR, it, tr, ja, ko, zh: zhCN, th, id, sv, da, nb, fi, vi, ms, hi, el, hu, pl, ru, uk, ro, cs, ar: arSA } as const)[LANG];
