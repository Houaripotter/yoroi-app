/**
 * Detail d'une pesee (1er novembre 2026, demande AT, points 1, 2 et 5) : ouvert depuis Tes pesees (« Détail »).
 * Son heure et son appareil (lus sur la photo de la balance, recus d'Apple Sante, ou notes ici), son moment
 * (reveil, avant seance, apres seance, autre) et « à jeun », les autres pesees du meme jour, et sa composition
 * detaillee. Le moment et « à jeun » se notent ici : l'ecran de saisie de la pesee (app/pesee.tsx) n'est pas modifie.
 * Rien n'est ecrit dans la table weights : tout va dans le contexte des pesees (lib/v2/mesures/contextePesee.ts).
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Aide, Carte, EcranCorps, Lien, nb, Puce, TitreCarte } from '@/components/yoroi/v2/corps/kit';
import { appareilLisible, CompositionDetaillee } from '@/components/yoroi/v2/corps/CompositionDetaillee';
import { useCorps } from '@/lib/v2/mesures/useCorps';
import { useNiveauSuivi } from '@/lib/v2/mesures/useNiveauSuivi';
import { voirBloc } from '@/lib/v2/mesures/niveauSuivi';
import { contexteDePesee, enregistrerContextes, MOMENTS_PESEE, peseesDuJourAvecContexte } from '@/lib/v2/mesures/contextePesee';
import type { MomentPesee } from '@/lib/v2/mesures/contextePesee';
import { heurePesee } from '@/lib/v2/pesee/poidsDuJour';
import { formatLongDate } from '@/lib/v2/weightStats';
import { traduire, LANG, LOCALE } from '@/lib/i18n/tr';

/** Hors français : l'heure « HH:MM » au format de la langue (« 6:30 PM », « 18:30 ») */
const heureLocale = (t: string) => new Date(2026, 0, 1, parseInt(t, 10) || 0, parseInt(t.split(':')[1] ?? '0', 10) || 0).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
import { LABEL_MOMENT } from '@/components/yoroi/v2/corps/libelles';

export default function PeseeDetail() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const corps = useCorps();
  const niveau = useNiveauSuivi();
  const w = useMemo(() => corps.pesees.find((x) => String(x.id) === String(params.id)), [corps.pesees, params.id]);
  if (!w) {
    return (
      <EcranCorps titre={traduire('Pesée')} repli="/pesees">
        {corps.pret ? <Aide>{traduire('Cette pesée n’existe plus.')}</Aide> : null}
      </EcranCorps>
    );
  }
  const jour = String(w.date).slice(0, 10);
  const ctx = contexteDePesee({ id: w.id, date: jour, weight: w.weight }, corps.contextes);
  const heure = ctx?.heure ?? heurePesee(w)?.texte ?? null;
  const appareil = ctx?.appareil ?? (w.source && w.source !== 'manual' && w.source !== 'csv' ? appareilLisible(w.source) : null);
  const duJour = peseesDuJourAvecContexte(jour, corps.pesees, corps.contextes, (x) => heurePesee(x as never)?.texte ?? null);
  const noter = (patch: { moment?: MomentPesee; aJeun?: boolean }) => {
    enregistrerContextes([{ date: jour, poids: w.weight, peseeId: w.id, heure, appareil: ctx?.appareil ?? null, moment: patch.moment ?? ctx?.moment ?? null, aJeun: patch.aJeun ?? ctx?.aJeun ?? null, origine: 'saisie' }]).catch(() => {});
  };
  return (
    <EcranCorps titre={traduire('Ta pesée')} sousTitre={formatLongDate(jour)} repli="/pesees">
      <Carte>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Ink size={44} weight="black" tight>{nb(w.weight, 1)}</Ink>
          <Ink size={17} weight="bold" color={c.textSecondary}>kg</Ink>
        </View>
        <View style={{ gap: 4 }}>
          <Ink size={14} weight="bold">{heure ? traduire('Pesée à {0}', LANG === 'fr' ? heure.replace(':', ' h ') : heureLocale(heure)) : traduire('Heure inconnue')}</Ink>
          <Ink size={14} weight="bold" color={c.textSecondary}>{appareil ? traduire('Appareil : {0}', appareil) : traduire('Notée à la main')}</Ink>
        </View>
      </Carte>

      <Carte>
        <TitreCarte sticker="calendrier" titre={traduire('Quand ?')} sous={traduire('Le moment de la pesée. Le matin au réveil reste la référence de ta courbe.')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MOMENTS_PESEE.map((m) => (
            <Puce key={m} label={traduire(LABEL_MOMENT[m].label)} sticker={LABEL_MOMENT[m].sticker} on={ctx?.moment === m} onPress={() => noter({ moment: m })} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Ink size={14} weight="bold" style={{ marginRight: 4 }}>{traduire('À jeun')}</Ink>
          <Puce label={traduire('Oui')} on={ctx?.aJeun === true} onPress={() => noter({ aJeun: true })} />
          <Puce label={traduire('Non')} on={ctx?.aJeun === false} onPress={() => noter({ aJeun: false })} />
        </View>
      </Carte>

      {duJour.length > 1 && voirBloc(niveau.niveau, 'pesees_multiples', true) ? (
        <Carte>
          <TitreCarte sticker="balance" titre={traduire('Tes pesées de ce jour')} sous={traduire('Toutes gardées, avec leur moment.')} />
          {duJour.map((p, i) => (
            <View key={`${p.heure ?? 'x'}_${p.poids}_${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, borderTopWidth: i ? 1 : 0, borderColor: c.divider }}>
              <Ink size={14} weight="bold" style={{ width: 60 }}>{p.heure ? (LANG === 'fr' ? p.heure.replace(':', ' h ') : heureLocale(p.heure)) : '…'}</Ink>
              <Ink size={13} color={c.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
                {[p.moment ? traduire(LABEL_MOMENT[p.moment].label) : null, p.appareil, p.seule ? traduire('pesée de séance') : null].filter(Boolean).join(', ')}
              </Ink>
              <Ink size={16} weight="black">{nb(p.poids, 1)}</Ink>
            </View>
          ))}
        </Carte>
      ) : null}

      <CompositionDetaillee pesees={corps.pesees} contextes={corps.contextes} brutes={corps.brutes} niveau={niveau.niveau} focus={{ date: jour, peseeId: w.id }} />

      <Lien label={traduire('Modifier le poids')} onPress={() => router.push({ pathname: '/pesee', params: { id: String(w.id), date: jour, value: String(w.weight) } } as never)} />
    </EcranCorps>
  );
}
