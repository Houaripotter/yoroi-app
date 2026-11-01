/**
 * Plis cutanes (1er novembre 2026, demande AU, point 5), niveau Athlete : les 7 plis de Jackson et Pollock, ou les
 * 3 plis selon le sexe, en mm. Le % de graisse par Jackson et Pollock puis Siri, avec les sources, et sa courbe.
 * Age et sexe viennent de ton profil ; sans eux, la somme des plis est gardee sans pourcentage (lib/v2/mesures/plis.ts).
 */
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Aide, Carte, ChampNombre, EcranCorps, MiniCourbe, nb, Puce, TitreCarte } from '@/components/yoroi/v2/corps/kit';
import { ageA, creerMesurePlis, enregistrerPlis, LABEL_PLI, plisDeLaMethode } from '@/lib/v2/mesures/plis';
import type { MethodePlis, Pli, Sexe } from '@/lib/v2/mesures/plis';
import { jourLocal } from '@/lib/v2/mesures/listeStockee';
import { useCorps } from '@/lib/v2/mesures/useCorps';
import { DateChips } from '@/components/yoroi/v2/DateChips';
import { dayShort } from '@/lib/v2/progres/format';
import { traduire } from '@/lib/i18n/tr';

export default function Plis() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const corps = useCorps();
  const [methode, setMethode] = useState<MethodePlis>('jp7');
  const [date, setDate] = useState(jourLocal());
  const [saisis, setSaisis] = useState<Partial<Record<Pli, string>>>({});
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const sexeProfil: Sexe | null = corps.profil?.avatar_gender === 'femme' ? 'femme' : corps.profil?.avatar_gender === 'homme' ? 'homme' : null;
  const [sexeChoisi, setSexeChoisi] = useState<Sexe | null>(null);
  const sexe = sexeChoisi ?? sexeProfil;
  const age = ageA(corps.profil?.birth_date, date) ?? (corps.profil?.age && corps.profil.age > 10 ? corps.profil.age : null);
  const plis = plisDeLaMethode(methode, sexe ?? 'homme');
  const historique = useMemo(() => [...corps.plis].sort((a, b) => (a.date < b.date ? -1 : 1)), [corps.plis]);
  const courbe = historique.filter((m) => m.pctGraisse !== null).map((m) => ({ date: m.date, value: m.pctGraisse as number }));
  const derniere = historique[historique.length - 1];

  const enregistrer = async () => {
    const m = creerMesurePlis(date, methode, sexe, age, saisis);
    if (!m) {
      setMessage({ ok: false, texte: traduire('Il faut chaque pli de la méthode, en mm (entre 1 et 80).') });
      return;
    }
    await enregistrerPlis(m);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    setSaisis({});
    setMessage({ ok: true, texte: m.pctGraisse !== null ? traduire('Enregistré : {0} % de masse grasse', nb(m.pctGraisse, 1)) : traduire('Enregistré : somme des plis {0} mm (ajoute ton âge et ton sexe au profil pour le %)', nb(m.somme, 1)) });
  };

  return (
    <EcranCorps titre={traduire('Plis cutanés')} repli="/(tabs)/progres">
      {derniere ? (
        <Carte>
          <TitreCarte sticker="pourcentage" titre={traduire('Ta dernière mesure')} sous={traduire('{0}, {1}, somme {2} mm', dayShort(derniere.date), derniere.methode === 'jp7' ? traduire('7 plis') : traduire('3 plis'), nb(derniere.somme, 1))} />
          {derniere.pctGraisse !== null ? <Ink size={34} weight="black" tight>{`${nb(derniere.pctGraisse, 1)} %`}</Ink> : null}
          <MiniCourbe points={courbe} label={traduire('Masse grasse par les plis')} />
          {courbe.length > 0 && courbe.length < 3 ? <Aide>{traduire('La courbe se dessine dès la troisième mesure.')}</Aide> : null}
        </Carte>
      ) : null}

      <Carte>
        <TitreCarte sticker="metre_ruban" titre={traduire('Nouvelle mesure à la pince')} sous={traduire('Côté droit, pli pincé entre le pouce et l’index, lecture 2 secondes après.')} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Puce label={traduire('7 plis')} on={methode === 'jp7'} onPress={() => setMethode('jp7')} />
          <Puce label={traduire('3 plis')} on={methode === 'jp3'} onPress={() => setMethode('jp3')} />
          <Puce label={traduire('Homme')} on={sexe === 'homme'} onPress={() => setSexeChoisi('homme')} />
          <Puce label={traduire('Femme')} on={sexe === 'femme'} onPress={() => setSexeChoisi('femme')} />
        </View>
        <DateChips value={date} onChange={setDate} />
        {plis.map((p) => (
          <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, borderTopWidth: 1, borderColor: c.divider }}>
            <View style={{ flex: 1 }}>
              <Ink size={14.5} weight="extraBold">{traduire(LABEL_PLI[p].label)}</Ink>
              <Aide>{traduire(LABEL_PLI[p].aide)}</Aide>
            </View>
            <ChampNombre valeur={saisis[p] ?? ''} onChange={(s) => { setSaisis((o) => ({ ...o, [p]: s })); setMessage(null); }} unite="mm" a11y={traduire('{0}, en millimètres', traduire(LABEL_PLI[p].label))} largeur={80} />
          </View>
        ))}
        {!age || !sexe ? <Aide>{traduire('Sans ton âge et ton sexe dans le profil, YOROI garde la somme des plis, sans pourcentage.')}</Aide> : null}
        {message ? <Ink size={13} weight="bold" color={message.ok ? c.successText : c.danger}>{message.texte}</Ink> : null}
        <Pressable onPress={enregistrer} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.ink })}>
          <Ink size={15} weight="extraBold" color={c.background}>{traduire('Calculer et enregistrer')}</Ink>
        </Pressable>
      </Carte>

      <Aide>{traduire('Calcul : densité du corps par les équations de Jackson et Pollock (somme des plis, son carré et ton âge), puis % de graisse = 495 ÷ densité − 450 (Siri). Sources : Jackson et Pollock, British Journal of Nutrition 1978 ; Jackson, Pollock et Ward, Medicine & Science in Sports & Exercise 1980 ; Siri 1961.')}</Aide>
    </EcranCorps>
  );
}
