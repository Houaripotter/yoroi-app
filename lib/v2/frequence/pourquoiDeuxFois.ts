/**
 * « Pourquoi 2 fois ? » (30 octobre 2026) : la feuille « Pourquoi ? » (components/yoroi/v2/programmes/Pourquoi.tsx)
 * pour la règle « chaque muscle 2 fois par semaine » (deuxFois.ts). Rien d'inventé : chaque phrase reprend l'apport
 * d'une étude de lib/v2/programmes/sources.ts, ou dit la règle de calcul de l'app. Aucun chiffre ajouté.
 */
import type { Explication } from '@/lib/v2/programmes/pourquoi';

export const POURQUOI_DEUX_FOIS: Explication = {
  titre: 'Chaque muscle 2 fois par semaine',
  ligne: 'Travailler un muscle 2 fois par semaine donne plus de muscle qu’une seule fois.',
  icone: 'calendar',
  points: [
    { icone: 'chart', texte: 'Les études qui comparent montrent plus de croissance quand un muscle est travaillé 2 fois par semaine plutôt qu’une.' },
    { icone: 'gauge', texte: 'À volume égal sur la semaine, l’écart est petit : le nombre de séries compte plus que le nombre de jours.' },
    { icone: 'repeat', texte: 'La clé : assez de séries pour chaque muscle sur la semaine, réparties sur 2 jours.' },
    { icone: 'heart', texte: 'Les recommandations de l’ACSM et de l’OMS : tous les grands muscles au moins 2 jours par semaine.' },
    { icone: 'target', texte: 'Dans YOROI, un jour compte quand le muscle y fait au moins 2 séries de travail. Les échauffements et les sports sans séries ne comptent pas.' },
  ],
  sources: ['schoenfeld2016frequence', 'schoenfeld2019frequence', 'pelland2026', 'acsm2026', 'oms2020'],
};
