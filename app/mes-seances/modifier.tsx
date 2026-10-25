/**
 * Créer ou modifier une séance de « Mes séances » (25 octobre 2026).
 * Un nom, puis les exercices : ajoutés depuis la bibliothèque (la même recherche que pendant la séance),
 * avec leur nombre de séries et les répétitions visées, dans l'ordre choisi (flèches haut et bas).
 * Pas de charge à saisir : à la séance, YOROI reprend ta dernière fois sur chaque exercice.
 * Paramètre : id (modifier), rien pour une nouvelle séance.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { ExercisePicker } from '@/components/yoroi/v2/seance/ExercisePicker';
import { ExoDemo } from '@/components/yoroi/v2/seance/ExoDemo';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P } from '@/components/yoroi/livePalette';
import { getTrainings } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { demoDe } from '@/lib/v2/programmes/demos';
import { niceGroup } from '@/lib/v2/seance/format';
import { buildExerciseHistory, normName } from '@/lib/v2/seance/history';
import type { ExerciseHistory } from '@/lib/v2/seance/history';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { MAX_EXOS, MAX_SERIES, chargerMesSeances, creerMaSeance, exosDepuisSeance, maSeanceParId, modifierMaSeance, nomParDefaut } from '@/lib/v2/seance/mesSeances';
import type { ExoSeance } from '@/lib/v2/seance/mesSeances';
import { traduire } from '@/lib/i18n/tr';

type Ligne = ExoSeance & { cle: string };

let compteur = 0;
const cle = () => `l${Date.now().toString(36)}${(compteur++).toString(36)}`;

export default function ModifierMaSeance() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' && params.id ? params.id : null;
  const [nom, setNom] = useState('');
  const [sport, setSport] = useState('musculation');
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [autres, setAutres] = useState<string[]>([]);
  const [hist, setHist] = useState<{ map: Map<string, ExerciseHistory>; recent: string[] }>({ map: new Map(), recent: [] });
  const [picker, setPicker] = useState(false);
  const [pret, setPret] = useState(!id);
  // la seance a modifier existe encore (elle a pu etre supprimee entre temps)
  const [trouvee, setTrouvee] = useState(false);
  const [modifie, setModifie] = useState(false);
  const change = useRef(false);
  const enCours = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [liste, s] = await Promise.all([chargerMesSeances(), id ? maSeanceParId(id) : Promise.resolve(null)]);
        setAutres(liste.filter((x) => x.id !== id).map((x) => x.nom));
        if (s) {
          setTrouvee(true);
          setNom(s.nom);
          setSport(s.sport);
          setLignes(s.exos.map((e) => ({ ...e, cle: cle() })));
        }
      } catch (err) {
        logger.warn('Séance à modifier non lue', err);
      }
      setPret(true);
    })();
    getTrainings()
      .then((t) => setHist(buildExerciseHistory(t ?? [])))
      .catch(() => {});
  }, [id]);

  const marquerModifie = () => {
    change.current = true;
    setModifie(true);
  };
  const maj = (fn: (l: Ligne[]) => Ligne[]) => {
    marquerModifie();
    setLignes(fn);
  };

  const ajouter = (name: string, muscle?: string) => {
    setPicker(false);
    // series et repetitions : celles de ta derniere fois sur cet exercice, sinon 3 x 10
    const h = hist.map.get(normName(name));
    const depuis = h ? exosDepuisSeance([{ name, muscle_group: muscle ?? h.muscle, sets: (h.travail ?? h.lastSets).length, reps: 0, weight: 0, setsData: h.travail ?? h.lastSets }])[0] : null;
    const e: ExoSeance = depuis ?? { nom: name, ...(muscle ? { muscle } : {}), series: 3, reps: 10, poids: 0 };
    maj((l) => [...l, { ...e, cle: cle() }].slice(0, MAX_EXOS));
    tap();
  };

  const deplacer = (i: number, d: -1 | 1) =>
    maj((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const n = [...l];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const enregistrer = async () => {
    if (enCours.current || lignes.length === 0) return;
    enCours.current = true;
    const exos: ExoSeance[] = lignes.map(({ cle: _c, ...e }) => e);
    const nomFinal = nom.trim() || nomParDefaut(exos, autres);
    try {
      if (id && trouvee) await modifierMaSeance(id, { nom: nomFinal, exos });
      else await creerMaSeance(nomFinal, sport, exos);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      change.current = false;
      setModifie(false);
      router.back();
    } catch (err) {
      enCours.current = false;
      logger.error('Séance non enregistrée', err);
      appAlert('Oups', traduire('La séance n’a pas pu être enregistrée, réessaie.'));
    }
  };

  const retour = () => {
    if (!change.current) return router.back();
    appAlert(traduire('Quitter sans enregistrer ?'), traduire('Tes changements seront perdus.'), [
      { text: traduire('Rester'), style: 'cancel' },
      { text: traduire('Quitter'), style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const total = lignes.reduce((n, e) => n + e.series, 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* avec des changements, le retour passe par la fleche (qui demande confirmation), pas par le glissement */}
      <Stack.Screen options={{ gestureEnabled: !modifie }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 14 }} showsVerticalScrollIndicator={false}>
        <EnTete titre={id && trouvee ? traduire('Modifier ta séance') : traduire('Nouvelle séance')} onRetour={retour} repli="/mes-seances" style={{ marginHorizontal: -22, marginTop: -8 }} />

        <View style={{ gap: 6 }}>
          <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('NOM')}</Ink>
          <TextInput
            value={nom}
            onChangeText={(t) => {
              marquerModifie();
              setNom(t.slice(0, 40));
            }}
            placeholder={lignes.length ? nomParDefaut(lignes, autres) : traduire('Push lundi, Jambes, Haut du corps...')}
            placeholderTextColor={c.textMuted}
            returnKeyType="done"
            accessibilityLabel={traduire('Nom de la séance')}
            style={[fontStyle('bold'), { minHeight: 56, fontSize: 18, color: c.ink, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('EXERCICES')}</Ink>
          {lignes.length ? <Ink size={13} weight="bold" color={c.textMuted}>{traduire('{0} séries au total', total)}</Ink> : null}
        </View>

        {pret && lignes.length === 0 ? (
          <Ink size={14} color={c.textSecondary}>{traduire('Ajoute tes exercices dans l’ordre où tu les fais. Les charges viendront de ta dernière fois.')}</Ink>
        ) : null}

        {lignes.map((e, i) => (
          <View key={e.cle} style={{ borderRadius: 20, padding: 12, gap: 10, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {demoDe(e.nom) ? (
                <ExoDemo nom={e.nom} largeur={64} hauteur={44} arrondi={12} bordure={false} />
              ) : (
                <View style={{ width: 64, height: 44, borderRadius: 12, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="dumbbell" size={20} color={c.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1, gap: 1 }}>
                <Ink size={15} weight="extraBold" numberOfLines={2}>{`${i + 1}. ${traduire(nomFr(e.nom))}`}</Ink>
                {e.muscle ? <Ink size={12} color={c.textMuted}>{traduire(niceGroup(e.muscle))}</Ink> : null}
              </View>
              <Fleche nom="up" label={traduire('Monter {0}', traduire(nomFr(e.nom)))} actif={i > 0} onPress={() => deplacer(i, -1)} />
              <Fleche nom="down" label={traduire('Descendre {0}', traduire(nomFr(e.nom)))} actif={i < lignes.length - 1} onPress={() => deplacer(i, 1)} />
              <Fleche nom="close" label={traduire('Retirer {0}', traduire(nomFr(e.nom)))} actif onPress={() => maj((l) => l.filter((x) => x.cle !== e.cle))} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 14, backgroundColor: c.fillSubtle }}>
                <Ink size={11} weight="bold" color={c.textSecondary}>{traduire('séries')}</Ink>
                <Stepper value={e.series} step={1} min={1} max={MAX_SERIES} size={18} button={32} unit={traduire('séries')} onChange={(v) => maj((l) => l.map((x) => (x.cle === e.cle ? { ...x, series: v } : x)))} />
              </View>
              <View style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 14, backgroundColor: c.fillSubtle }}>
                <Ink size={11} weight="bold" color={c.textSecondary}>{traduire('répétitions')}</Ink>
                <Stepper value={e.reps} step={1} min={1} max={100} size={18} button={32} unit={traduire('répétitions')} onChange={(v) => maj((l) => l.map((x) => (x.cle === e.cle ? { ...x, reps: v } : x)))} />
              </View>
            </View>
          </View>
        ))}

        {lignes.length < MAX_EXOS ? (
          <Pressable
            onPress={() => { tap(); setPicker(true); }}
            accessibilityRole="button"
            style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.accent, backgroundColor: pressed ? c.accentTint : 'transparent' })}
          >
            <Icon name="plus" size={18} color={c.accent} />
            <Ink size={15} weight="extraBold" color={c.accent}>{traduire('Ajouter un exercice')}</Ink>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: c.background, borderTopWidth: 1, borderColor: c.divider }}>
        <Pressable
          onPress={enregistrer}
          disabled={lignes.length === 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: lignes.length === 0 }}
          style={({ pressed }) => ({ height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: lignes.length === 0 ? c.fillSoft : pressed ? c.accentPressed : c.accent })}
        >
          <Ink size={16} weight="extraBold" color={lignes.length === 0 ? c.textMuted : c.onAccent}>{traduire('Enregistrer')}</Ink>
        </Pressable>
      </View>

      <ExercisePicker visible={picker} onClose={() => setPicker(false)} onPick={ajouter} history={hist.map} recent={hist.recent} already={lignes.map((l) => l.nom)} />
    </View>
  );
}

function Fleche({ nom, label, actif, onPress }: { nom: 'up' | 'down' | 'close'; label: string; actif: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const d = nom === 'up' ? 'M6 15l6-6 6 6' : nom === 'down' ? 'M6 9l6 6 6-6' : 'M7 7l10 10M17 7L7 17';
  return (
    <Pressable
      onPress={() => { if (actif) { tap(); onPress(); } }}
      disabled={!actif}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.fillSubtle, opacity: actif ? 1 : 0.35 })}
    >
      <FlecheSvg d={d} couleur={nom === 'close' ? c.danger : c.ink} />
    </Pressable>
  );
}

function FlecheSvg({ d, couleur }: { d: string; couleur: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d={d} stroke={couleur} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
