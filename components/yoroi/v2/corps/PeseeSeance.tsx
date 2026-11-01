/**
 * Pesees autour d'une seance (1er novembre 2026, demande AT, point 5).
 * - PeseeSeanceRapide : « Pesée avant séance » et « Pesée après séance » en deux touches depuis la seance en direct
 *   (et l'eau bue pendant). Rangees dans le contexte des pesees (lib/v2/mesures/contextePesee.ts, seule: true) :
 *   elles ne changent pas la courbe du poids, qui garde la pesee du reveil.
 * - PerteEauSeance : la perte d'eau estimee d'une seance faite, en kg et en % du poids, et le repere des 2 %.
 * - PertesEauRecentes : les dernieres seances pesees avant et apres, pour Progres Corps.
 * Source du repere : ACSM, Sawka et al., Medicine & Science in Sports & Exercise 2007 (lib/v2/mesures/perteEau.ts).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Pressable, View } from 'react-native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { enregistrerContextes, lireContextesPesees } from '@/lib/v2/mesures/contextePesee';
import type { ContextePesee, MomentPesee } from '@/lib/v2/mesures/contextePesee';
import { heureLocale, jourLocal, nombre, EVENEMENT_CORPS } from '@/lib/v2/mesures/listeStockee';
import { perteEau, peseesDeSeance, pertesRecentes, SEUIL_PERTE_PCT } from '@/lib/v2/mesures/perteEau';
import type { PerteEau } from '@/lib/v2/mesures/perteEau';
import { dayShort } from '@/lib/v2/progres/format';
import { traduire } from '@/lib/i18n/tr';
import { Aide, Carte, ChampNombre, nb, Sticker, TitreCarte } from './kit';

export const SOURCE_REPERE_EAU = 'ACSM, Sawka et al., Medicine & Science in Sports & Exercise 2007';

function useContextes(): ContextePesee[] {
  const [l, setL] = useState<ContextePesee[]>([]);
  useEffect(() => {
    let vivant = true;
    const lire = () => lireContextesPesees().then((x) => vivant && setL(x)).catch(() => {});
    lire();
    const s = DeviceEventEmitter.addListener(EVENEMENT_CORPS, lire);
    return () => {
      vivant = false;
      s.remove();
    };
  }, []);
  return l;
}

/** Saisie d'une pesee de seance : le poids, et l'eau bue pour la pesee apres */
function SaisiePesee({ moment, date, onFini }: { moment: MomentPesee; date: string; onFini: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [poids, setPoids] = useState('');
  const [eau, setEau] = useState('');
  const [erreur, setErreur] = useState(false);
  const valider = async () => {
    const p = nombre(poids);
    const e = nombre(eau);
    if (p === undefined || p < 20 || p > 400 || (eau.trim() && (e === undefined || e < 0 || e > 10))) {
      setErreur(true);
      return;
    }
    const ok = await enregistrerContextes([{ date, poids: p, heure: heureLocale(), moment, seule: true, origine: 'seance', ...(moment === 'apres_seance' && e !== undefined ? { eauBueL: e } : {}) }]);
    if (ok) notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    onFini();
  };
  return (
    <View style={{ gap: 10, paddingTop: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <ChampNombre valeur={poids} onChange={(s) => { setPoids(s); setErreur(false); }} placeholder="00,0" unite="kg" a11y={moment === 'avant_seance' ? traduire('Poids avant la séance, en kilos') : traduire('Poids après la séance, en kilos')} />
        {moment === 'apres_seance' ? <ChampNombre valeur={eau} onChange={(s) => { setEau(s); setErreur(false); }} placeholder="0,0" unite={traduire('L bus')} a11y={traduire('Eau bue pendant la séance, en litres')} largeur={80} /> : null}
      </View>
      {erreur ? <Ink size={12.5} weight="bold" color={c.danger}>{traduire('Vérifie le poids (en kilos) et l’eau bue (en litres).')}</Ink> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={valider} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.ink })}>
          <Ink size={14} weight="extraBold" color={c.background}>{traduire('Enregistrer')}</Ink>
        </Pressable>
        <Pressable onPress={onFini} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.fillSubtle })}>
          <Ink size={14} weight="extraBold">{traduire('Annuler')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}

function BoutonMoment({ moment, fait, onPress }: { moment: MomentPesee; fait?: number | null; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const label = moment === 'avant_seance' ? traduire('Pesée avant séance') : traduire('Pesée après séance');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={fait ? traduire('{0}, {1} kilos, modifier', label, nb(fait, 1)) : label} style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 16, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: pressed ? c.fillSoft : c.fillSubtle })}>
      <Sticker nom="balance" taille={26} />
      <View style={{ flex: 1 }}>
        <Ink size={13} weight="extraBold" numberOfLines={2}>{label}</Ink>
        {fait ? <Ink size={12} weight="bold" color={c.successText}>{`${nb(fait, 1)} kg`}</Ink> : null}
      </View>
    </Pressable>
  );
}

/** Les deux boutons de la seance en direct (ajout minimal dans app/seance/muscu.tsx) */
export function PeseeSeanceRapide({ debut }: { /** heure de debut HH:MM, pour retrouver les pesees de cette seance */ debut?: string | null }) {
  const liste = useContextes();
  const [ouvert, setOuvert] = useState<MomentPesee | null>(null);
  const date = jourLocal();
  const { avant, apres } = useMemo(() => peseesDeSeance(liste, { date, debut }), [liste, date, debut]);
  const p = perteEau(avant?.poids, apres?.poids, apres?.eauBueL);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <BoutonMoment moment="avant_seance" fait={avant?.poids} onPress={() => setOuvert(ouvert === 'avant_seance' ? null : 'avant_seance')} />
        <BoutonMoment moment="apres_seance" fait={apres?.poids} onPress={() => setOuvert(ouvert === 'apres_seance' ? null : 'apres_seance')} />
      </View>
      {ouvert ? <SaisiePesee moment={ouvert} date={date} onFini={() => setOuvert(null)} /> : null}
      {p && !ouvert ? <LignePerte p={p} /> : null}
    </View>
  );
}

function LignePerte({ p }: { p: PerteEau }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <Ink size={28} weight="black" tight>{`${p.perteKg >= 0 ? '' : '+ '}${nb(Math.abs(p.perteKg), 1)} kg`}</Ink>
        <Ink size={15} weight="extraBold" color={p.aRehydrater ? c.danger : c.textSecondary}>{traduire('{0} % de ton poids', nb(Math.abs(p.pct), 1))}</Ink>
      </View>
      <Aide>
        {traduire('{0} kg avant, {1} kg après', nb(p.avant, 1), nb(p.apres, 1))}
        {p.eauBueL ? traduire(', {0} L bus pendant', nb(p.eauBueL, 1)) : ''}
      </Aide>
      {p.aRehydrater ? (
        <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.dangerTint, gap: 4 }}>
          <Ink size={14} weight="extraBold" color={c.danger}>{traduire('Plus de {0} % perdus : pense à te réhydrater', SEUIL_PERTE_PCT)}</Ink>
          <Ink size={12.5} color={c.ink}>{traduire('Bois environ {0} L dans les heures qui viennent, avec un peu de sel.', nb(p.aBoireL, 1))}</Ink>
        </View>
      ) : null}
      <Aide>{traduire('Repère : au-delà de 2 % du poids perdus, réhydrate-toi (environ 1,5 L par kilo perdu). Source : {0}.', SOURCE_REPERE_EAU)}</Aide>
    </View>
  );
}

/** Carte du detail d'une seance faite : la perte d'eau, ou les deux boutons pour noter les pesees */
export function PerteEauSeance({ date, debut }: { date: string; debut?: string | null }) {
  const liste = useContextes();
  const [ouvert, setOuvert] = useState<MomentPesee | null>(null);
  const jour = String(date).slice(0, 10);
  const { avant, apres } = useMemo(() => peseesDeSeance(liste, { date: jour, debut }), [liste, jour, debut]);
  const p = perteEau(avant?.poids, apres?.poids, apres?.eauBueL);
  return (
    <Carte>
      <TitreCarte sticker="vague" titre={traduire('Perte d’eau sur la séance')} sous={p ? null : traduire('Pèse-toi avant et après la séance pour la voir.')} />
      {p ? <LignePerte p={p} /> : null}
      {!p || ouvert ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <BoutonMoment moment="avant_seance" fait={avant?.poids} onPress={() => setOuvert(ouvert === 'avant_seance' ? null : 'avant_seance')} />
          <BoutonMoment moment="apres_seance" fait={apres?.poids} onPress={() => setOuvert(ouvert === 'apres_seance' ? null : 'apres_seance')} />
        </View>
      ) : null}
      {ouvert ? <SaisiePesee moment={ouvert} date={jour} onFini={() => setOuvert(null)} /> : null}
    </Carte>
  );
}

/** Progres Corps : les dernieres seances pesees avant et apres */
export function PertesEauRecentes({ contextes }: { contextes: ContextePesee[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pertes = useMemo(() => pertesRecentes(contextes, 5), [contextes]);
  if (!pertes.length) return null;
  return (
    <Carte>
      <TitreCarte sticker="vague" titre={traduire('Perte d’eau sur tes séances')} sous={traduire('Pesée avant moins pesée après, plus l’eau bue pendant')} />
      {pertes.map((p) => (
        <View key={p.date} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, borderTopWidth: 1, borderColor: c.divider }}>
          <Ink size={14} weight="bold" style={{ flex: 1 }}>{dayShort(p.date)}</Ink>
          <Ink size={15} weight="black">{`${nb(p.perteKg, 1)} kg`}</Ink>
          <Ink size={13} weight="extraBold" color={p.aRehydrater ? c.danger : c.textSecondary} style={{ minWidth: 56, textAlign: 'right' }}>{`${nb(p.pct, 1)} %`}</Ink>
        </View>
      ))}
      <Aide>{traduire('En rouge : plus de 2 % du poids perdus, pense à te réhydrater. Source : {0}.', SOURCE_REPERE_EAU)}</Aide>
    </Carte>
  );
}
