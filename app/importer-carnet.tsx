/**
 * Importer mes seances (26 octobre 2026) : les notes du telephone collees telles quelles, ou l'export CSV de Hevy.
 * 1. coller le texte (ou choisir le fichier Hevy) ;
 * 2. YOROI montre ce qu'il a compris : seances, exercices, series, et les lignes qu'il n'a pas comprises ;
 * 3. un appui enregistre tout, sans doublon (lib/v2/import/enregistrerCarnet.ts).
 */
import React, { useEffect, useMemo, useState } from 'react';
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
import { lireCarnet, nommerExos } from '@/lib/v2/import/carnet';
import { reconnaitreExo } from '@/lib/v2/import/vocabulaire';
import { prendreTexteCarnet } from '@/lib/v2/import/texteEnAttente';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import type { ExoCherchable } from '@/lib/v2/seance/rechercheExo';
import type { ResultatLecture } from '@/lib/v2/import/carnet';
import { enregistrerCarnet } from '@/lib/v2/import/enregistrerCarnet';
import type { BilanImport } from '@/lib/v2/import/enregistrerCarnet';
import { logger } from '@/lib/security/logger';
import { traduire, traduirePluriel, DECIMAL, LOCALE } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

// la bibliotheque, une fois : nom exact (enregistre) et nom francais (cherche)
let BIBLIO: ExoCherchable[] | null = null;
const biblio = (): ExoCherchable[] =>
  (BIBLIO ??= EXERCISE_LIBRARY.filter((e) => e.category === 'musculation' || e.unit === 'reps').map((e, rang) => ({ name: e.name, autre: nomFr(e.name) !== e.name ? nomFr(e.name) : undefined, muscle: e.muscle, rang })));

const EXEMPLE = '14/10\nHack squat 60kg 2x12 70kg 2x10\nPresse inclinée 160kg 2x12\n\n15/10\nTirage vertical 70kg 2x10';

/** « mardi 14 octobre 2025 » */
function jourLong(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  const d = new Date(a, m - 1, j, 12);
  const t = d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const fmtKg = (v: number): string => String(Math.round(v * 10) / 10).replace('.', DECIMAL);

/** series identiques qui se suivent : « 2 × 12 a 60 kg », puis « 2 × 10 a 70 kg » */
function grouper(series: { weight: number; reps: number; type?: string }[]): { n: number; reps: number; weight: number; type?: string }[] {
  const out: { n: number; reps: number; weight: number; type?: string }[] = [];
  for (const x of series) {
    const d = out[out.length - 1];
    if (d && d.reps === x.reps && Math.abs(d.weight - x.weight) < 0.01 && d.type === x.type) d.n++;
    else out.push({ n: 1, reps: x.reps, weight: x.weight, type: x.type });
  }
  return out;
}

export default function ImporterCarnet() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [texte, setTexte] = useState('');
  // 26 octobre 2026 : un carnet colle dans « Dicte ta seance » arrive ici tout seul
  useEffect(() => {
    const t = prendreTexteCarnet();
    if (t) {
      setTexte(t);
      setSource('notes');
    }
  }, []);
  const [source, setSource] = useState<'notes' | 'hevy' | null>(null);
  const [etat, setEtat] = useState<'saisie' | 'enregistrement' | 'fini'>('saisie');
  const [progres, setProgres] = useState({ fait: 0, total: 0 });
  const [bilan, setBilan] = useState<BilanImport | null>(null);
  const [combien, setCombien] = useState(10);

  const lu: ResultatLecture | null = useMemo(() => (texte.trim() ? nommerExos(lireCarnet(texte), (n) => reconnaitreExo(n, biblio())) : null), [texte]);
  const inconnus = lu ? [...new Set(lu.seances.flatMap((s) => s.exos.filter((e) => e.inconnu).map((e) => e.nom)))] : [];
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
        <EnTete titre={traduire('Importer mes séances')} sousTitre={traduire('Tes notes du téléphone, ou une autre app')} repli="/(tabs)/seances" style={{ marginHorizontal: -22, marginTop: -8 }} />

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
              <BoutonPrincipal onPress={() => void coller()} haptique="light" label={traduire('Coller mes notes')} hauteur={52} rayon={16} tailleTexte={15} style={{ flex: 1 }} />
              <Pressable onPress={() => void fichier()} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.accent, backgroundColor: pressed ? c.accentTint : 'transparent' })}>
                <Ink size={15} weight="extraBold" color={c.accent}>{traduire('Fichier CSV')}</Ink>
              </Pressable>
            </View>
            <Ink size={12} color={c.textMuted}>{traduire('Tu viens d’une autre app de muscu ? Exporte tes séances en fichier CSV depuis ses réglages, puis choisis le fichier ici.')}</Ink>

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
              <>
                {/* 26 octobre 2026 (Houari : « on ne comprend rien ») : chaque jour comme une vraie seance,
                    chaque exercice avec ses series regroupees, lisibles d'un coup d'oeil */}
                <Glass style={{ gap: 6, padding: 16 }}>
                  <Ink size={12} weight="black" color={c.accent} style={{ letterSpacing: 0.6 }}>{traduire('CE QUE YOROI A COMPRIS')}</Ink>
                  <Ink size={20} weight="black" tight>
                    {traduirePluriel(lu.seances.length, lu.seances.length > 1, '{0} séance', '{0} séances', lu.seances.length)}
                    {lu.seances.length ? `, ${traduirePluriel(nbSeries, nbSeries > 1, '{0} série', '{0} séries', nbSeries)}` : ''}
                  </Ink>
                  {inconnus.length ? (
                    <Ink size={13} color={c.textSecondary}>{traduirePluriel(inconnus.length, inconnus.length > 1, '{0} exercice pas reconnu, il sera créé avec ton nom : {1}', '{0} exercices pas reconnus, ils seront créés avec ton nom : {1}', inconnus.length, inconnus.slice(0, 6).join(', '))}</Ink>
                  ) : (
                    <Ink size={13} color={c.textSecondary}>{traduire('Tous les exercices sont reconnus. Vérifie, puis importe.')}</Ink>
                  )}
                </Glass>

                {lu.seances.slice().reverse().slice(0, combien).map((s) => (
                  <View key={s.cle} style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 14, gap: 10 }}>
                    <View style={{ gap: 2 }}>
                      <Ink size={17} weight="black" tight>{jourLong(s.date)}{s.titre ? `, ${s.titre}` : ''}</Ink>
                      <Ink size={12} weight="bold" color={c.textMuted}>
                        {traduirePluriel(s.exos.length, s.exos.length > 1, '{0} exercice', '{0} exercices', s.exos.length)}
                        {', '}
                        {traduirePluriel(s.exos.reduce((n, e) => n + e.series.length, 0), s.exos.reduce((n, e) => n + e.series.length, 0) > 1, '{0} série', '{0} séries', s.exos.reduce((n, e) => n + e.series.length, 0))}
                      </Ink>
                    </View>
                    {s.exos.map((e, i) => (
                      <View key={`${s.cle}-${i}`} style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: e.inconnu ? c.accentTint : c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
                            <Ink size={12} weight="black" color={e.inconnu ? c.accent : c.textSecondary}>{String(i + 1)}</Ink>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Ink size={15} weight="extraBold">{sansTiret(traduire(nomFr(e.nom)))}</Ink>
                            {e.saisi ? <Ink size={12} color={c.textMuted}>{traduire('écrit « {0} »', e.saisi)}</Ink> : e.inconnu ? <Ink size={12} weight="bold" color={c.accent}>{traduire('nouvel exercice, gardé avec ton nom')}</Ink> : null}
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 36 }}>
                          {grouper(e.series).map((g, k) => (
                            <View key={k} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: g.type === 'warmup' ? c.goldTint : g.type === 'dropset' ? c.accentTint : c.fillSubtle }}>
                              <Ink size={15} weight="black">{`${g.n} × ${g.reps}`}</Ink>
                              <Ink size={13} weight="bold" color={c.textSecondary}>{g.weight > 0 ? `${fmtKg(g.weight)} kg` : traduire('poids du corps')}</Ink>
                              {g.type === 'warmup' ? <Ink size={11} weight="bold" color={c.textMuted}>{traduire('échauffement')}</Ink> : g.type === 'dropset' ? <Ink size={11} weight="bold" color={c.accent}>{traduire('Drop set')}</Ink> : null}
                            </View>
                          ))}
                        </View>
                        {e.notes ? <Ink size={12} color={c.textMuted} style={{ paddingLeft: 36 }}>{traduire('note : {0}', e.notes)}</Ink> : null}
                      </View>
                    ))}
                  </View>
                ))}

                {lu.seances.length > combien ? (
                  <Pressable onPress={() => setCombien((n) => n + 10)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.border, backgroundColor: pressed ? c.fillSubtle : 'transparent' })}>
                    <Ink size={14} weight="extraBold" color={c.textSecondary}>{traduire('Voir les {0} séances plus anciennes', lu.seances.length - combien)}</Ink>
                  </Pressable>
                ) : null}

                {lu.incomprises.length ? (
                  <View style={{ gap: 2, padding: 14, borderRadius: 18, backgroundColor: c.dangerTint }}>
                    <Ink size={13} weight="extraBold" color={c.danger}>{traduirePluriel(lu.incomprises.length, lu.incomprises.length > 1, '{0} ligne pas comprise, elle sera ignorée :', '{0} lignes pas comprises, elles seront ignorées :', lu.incomprises.length)}</Ink>
                    {lu.incomprises.slice(0, 5).map((l, k) => <Ink key={k} size={12} color={c.textSecondary} numberOfLines={1}>{l}</Ink>)}
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {etat !== 'fini' && lu && lu.seances.length > 0 ? (
        <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 16 }}>
          {etat === 'enregistrement' ? (
            <View style={{ minHeight: 56, borderRadius: 18, backgroundColor: c.primary, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={c.onPrimary} />
              <Ink size={16} weight="extraBold" color={c.onPrimary}>{traduire('{0} sur {1}', progres.fait, progres.total)}</Ink>
            </View>
          ) : (
            <BigButton label={traduirePluriel(lu.seances.length, lu.seances.length > 1, 'Importer {0} séance', 'Importer {0} séances', lu.seances.length)} icon="check" onPress={() => void importer()} />
          )}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
