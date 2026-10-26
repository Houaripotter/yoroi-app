/**
 * Importer mes seances (26 octobre 2026) : les notes du telephone collees telles quelles, ou l'export CSV de Hevy.
 * 1. coller le texte (ou choisir le fichier Hevy) ;
 * 2. YOROI montre ce qu'il a compris : seances, exercices, series, et les lignes qu'il n'a pas comprises ;
 * 3. un appui enregistre tout, sans doublon (lib/v2/import/enregistrerCarnet.ts).
 */
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { BigButton, Glass } from '@/components/yoroi/v2/seances/ui';
import { lireCarnet } from '@/lib/v2/import/carnet';
import type { ResultatLecture } from '@/lib/v2/import/carnet';
import { enregistrerCarnet } from '@/lib/v2/import/enregistrerCarnet';
import type { BilanImport } from '@/lib/v2/import/enregistrerCarnet';
import { logger } from '@/lib/security/logger';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const EXEMPLE = '14/10\nHack squat 60kg 2x12 70kg 2x10\nPresse inclinée 160kg 2x12\n\n15/10\nTirage vertical 70kg 2x10';

function dateLisible(iso: string): string {
  const [a, m, j] = iso.split('-');
  return `${j}/${m}/${a}`;
}

export default function ImporterCarnet() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [texte, setTexte] = useState('');
  const [source, setSource] = useState<'notes' | 'hevy' | null>(null);
  const [etat, setEtat] = useState<'saisie' | 'enregistrement' | 'fini'>('saisie');
  const [progres, setProgres] = useState({ fait: 0, total: 0 });
  const [bilan, setBilan] = useState<BilanImport | null>(null);

  const lu: ResultatLecture | null = useMemo(() => (texte.trim() ? lireCarnet(texte) : null), [texte]);
  const nbSeries = lu ? lu.seances.reduce((n, s) => n + s.exos.reduce((k, e) => k + e.series.length, 0), 0) : 0;

  const coller = async () => {
    try {
      const t = await Clipboard.getStringAsync();
      if (t) {
        setTexte(t);
        setSource('notes');
      }
    } catch (e) {
      logger.warn('[ImportCarnet] presse papiers illisible', e);
    }
  };

  const fichier = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.[0]) return;
      const t = await FileSystem.readAsStringAsync(r.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      setTexte(t);
      setSource('hevy');
    } catch (e) {
      logger.warn('[ImportCarnet] fichier illisible', e);
    }
  };

  const importer = async () => {
    if (!lu || !lu.seances.length) return;
    setEtat('enregistrement');
    setProgres({ fait: 0, total: lu.seances.length });
    const b = await enregistrerCarnet(lu.seances, (fait, total) => setProgres({ fait, total }));
    setBilan(b);
    setEtat('fini');
    if (b.ajoutees > 0) notificationAsync(NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 14 }} keyboardShouldPersistTaps="handled">
        <EnTete titre={traduire('Importer mes séances')} sousTitre={traduire('Tes notes du téléphone, ou Hevy')} repli="/(tabs)/seances" style={{ marginHorizontal: -22, marginTop: -8 }} />

        {etat === 'fini' && bilan ? (
          <Glass style={{ gap: 8, padding: 18 }}>
            <Ink size={20} weight="black" tight>{bilan.ajoutees > 0 ? traduirePluriel(bilan.ajoutees, bilan.ajoutees > 1, '{0} séance ajoutée', '{0} séances ajoutées', bilan.ajoutees) : traduire('Rien de nouveau à ajouter')}</Ink>
            {bilan.dejaLa > 0 ? <Ink size={14} color={c.textSecondary}>{traduirePluriel(bilan.dejaLa, bilan.dejaLa > 1, '{0} était déjà dans YOROI, gardée une seule fois.', '{0} étaient déjà dans YOROI, gardées une seule fois.', bilan.dejaLa)}</Ink> : null}
            {bilan.echecs > 0 ? <Ink size={14} color={c.danger}>{traduirePluriel(bilan.echecs, bilan.echecs > 1, '{0} séance n’a pas pu être ajoutée.', '{0} séances n’ont pas pu être ajoutées.', bilan.echecs)}</Ink> : null}
            <Ink size={14} color={c.textSecondary}>{traduire('Tes charges passées servent maintenant à te proposer les prochaines.')}</Ink>
            <BigButton label={traduire('Voir mes séances')} onPress={() => router.replace('/(tabs)/seances' as never)} />
          </Glass>
        ) : (
          <>
            <Ink size={14} color={c.textSecondary}>{traduire('Copie tes notes de muscu, même des années, et colle les ici. Une date sur une ligne, puis un exercice par ligne :')}</Ink>
            <View style={{ borderRadius: 16, padding: 12, backgroundColor: c.fillSubtle }}>
              <Ink size={13} color={c.textSecondary}>{EXEMPLE}</Ink>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => void coller()} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent })}>
                <Ink size={15} weight="extraBold" color={c.onAccent}>{traduire('Coller mes notes')}</Ink>
              </Pressable>
              <Pressable onPress={() => void fichier()} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.accent, backgroundColor: pressed ? c.accentTint : 'transparent' })}>
                <Ink size={15} weight="extraBold" color={c.accent}>{traduire('Fichier Hevy')}</Ink>
              </Pressable>
            </View>
            <Ink size={12} color={c.textMuted}>{traduire('Dans Hevy : Profil, Réglages, Exporter et importer, Exporter les séances. Puis choisis le fichier ici.')}</Ink>

            {source !== 'hevy' ? (
              <TextInput
                value={texte}
                onChangeText={(t) => { setTexte(t); setSource('notes'); }}
                multiline
                placeholder={traduire('Ou colle ton texte ici')}
                placeholderTextColor={c.textMuted}
                style={{ minHeight: 140, maxHeight: 260, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, padding: 14, color: c.ink, fontSize: 15, textAlignVertical: 'top' }}
                accessibilityLabel={traduire('Tes notes de séances')}
              />
            ) : null}

            {lu ? (
              <Glass style={{ gap: 10, padding: 16 }}>
                <Ink size={12} weight="black" color={c.accent} style={{ letterSpacing: 0.6 }}>{traduire('CE QUE YOROI A COMPRIS')}</Ink>
                <Ink size={18} weight="black" tight>
                  {traduirePluriel(lu.seances.length, lu.seances.length > 1, '{0} séance', '{0} séances', lu.seances.length)}
                  {lu.seances.length ? `, ${traduirePluriel(nbSeries, nbSeries > 1, '{0} série', '{0} séries', nbSeries)}` : ''}
                </Ink>
                {lu.seances.slice(-4).reverse().map((s) => (
                  <View key={s.cle} style={{ gap: 2, paddingTop: 6, borderTopWidth: 1, borderColor: c.divider }}>
                    <Ink size={14} weight="extraBold">{s.titre ? `${dateLisible(s.date)}, ${s.titre}` : dateLisible(s.date)}</Ink>
                    {s.exos.slice(0, 6).map((e, i) => (
                      <Ink key={`${s.cle}-${i}`} size={13} color={c.textSecondary} numberOfLines={1}>
                        {`${e.nom} : ${e.series.map((x) => (x.weight > 0 ? `${Math.round(x.weight * 10) / 10} kg × ${x.reps}` : `× ${x.reps}`)).join(', ')}`}
                      </Ink>
                    ))}
                    {s.exos.length > 6 ? <Ink size={12} color={c.textMuted}>{traduire('et {0} autres exercices', s.exos.length - 6)}</Ink> : null}
                  </View>
                ))}
                {lu.seances.length > 4 ? <Ink size={12} color={c.textMuted}>{traduire('Les 4 plus récentes sont affichées.')}</Ink> : null}
                {lu.incomprises.length ? (
                  <View style={{ gap: 2, paddingTop: 6, borderTopWidth: 1, borderColor: c.divider }}>
                    <Ink size={13} weight="extraBold" color={c.danger}>{traduirePluriel(lu.incomprises.length, lu.incomprises.length > 1, '{0} ligne pas comprise, elle sera ignorée :', '{0} lignes pas comprises, elles seront ignorées :', lu.incomprises.length)}</Ink>
                    {lu.incomprises.slice(0, 5).map((l, i) => <Ink key={i} size={12} color={c.textSecondary} numberOfLines={1}>{l}</Ink>)}
                  </View>
                ) : null}
              </Glass>
            ) : null}
          </>
        )}
      </ScrollView>

      {etat !== 'fini' && lu && lu.seances.length > 0 ? (
        <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 16 }}>
          {etat === 'enregistrement' ? (
            <View style={{ minHeight: 56, borderRadius: 18, backgroundColor: c.accent, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={c.onAccent} />
              <Ink size={16} weight="extraBold" color={c.onAccent}>{traduire('{0} sur {1}', progres.fait, progres.total)}</Ink>
            </View>
          ) : (
            <BigButton label={traduirePluriel(lu.seances.length, lu.seances.length > 1, 'Importer {0} séance', 'Importer {0} séances', lu.seances.length)} icon="check" onPress={() => void importer()} />
          )}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
