/**
 * Créer ou modifier une séance de « Mes séances » (25 octobre 2026).
 * Un nom, puis les exercices : ajoutés depuis la bibliothèque (la même recherche que pendant la séance),
 * avec leur nombre de séries et les répétitions visées, dans l'ordre choisi (flèches haut et bas).
 * Pas de charge à saisir : à la séance, YOROI reprend ta dernière fois sur chaque exercice.
 * Paramètre : id (modifier), rien pour une nouvelle séance.
 * Paramètre zones (25 octobre 2026) : depuis « Quoi faire ? », la nouvelle séance part des exercices proposés pour
 * ces muscles, avec leur nom ; tu ajoutes, retires ou changes ce que tu veux, puis tu l'enregistres.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import Svg, { Circle, Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { ExercisePicker } from '@/components/yoroi/v2/seance/ExercisePicker';
import { ExoDemo } from '@/components/yoroi/v2/seance/ExoDemo';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P, blancA } from '@/components/yoroi/livePalette';
import { PlusPastille } from '@/components/yoroi/v2/accueil/kit';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { carteBlanche, tonDuRang } from '@/components/yoroi/v2/seance/pastel';
import { getTrainings } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { demoDe } from '@/lib/v2/programmes/demos';
import { niceGroup } from '@/lib/v2/seance/format';
import { buildExerciseHistory, normName } from '@/lib/v2/seance/history';
import type { ExerciseHistory } from '@/lib/v2/seance/history';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { MAX_EXOS, MAX_SERIES, chargerMesSeances, creerMaSeance, exosDepuisSeance, maSeanceParId, modifierMaSeance, nomParDefaut } from '@/lib/v2/seance/mesSeances';
import type { ExoSeance } from '@/lib/v2/seance/mesSeances';
import { seanceZones, titreZones, ZONES } from '@/lib/v2/programmes/zones';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

type Ligne = ExoSeance & { cle: string };

let compteur = 0;
const cle = () => `l${Date.now().toString(36)}${(compteur++).toString(36)}`;

export default function ModifierMaSeance() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; zones?: string }>();
  const id = typeof params.id === 'string' && params.id ? params.id : null;
  // les muscles choisis dans « Quoi faire ? » (seulement pour une nouvelle seance)
  const zonesDepart = id || typeof params.zones !== 'string' ? [] : ZONES.map((z) => z.id).filter((z) => params.zones!.split(',').includes(z));
  const [nom, setNom] = useState('');
  const [sport, setSport] = useState('musculation');
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [autres, setAutres] = useState<string[]>([]);
  const [hist, setHist] = useState<{ map: Map<string, ExerciseHistory>; recent: string[] }>({ map: new Map(), recent: [] });
  const [picker, setPicker] = useState(false);
  // 27 octobre 2026 : l'exercice dont les reglages sont ouverts (un seul a la fois, le dernier ajoute)
  const [ouvert, setOuvert] = useState<string | null>(null);
  const illus = useIllustrations();
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
        } else if (zonesDepart.length) {
          // les exercices proposes pour ces muscles : series prevues, repetitions au milieu de la fourchette
          setNom(titreZones(zonesDepart as ZoneId[], traduire).slice(0, 40));
          setLignes(
            seanceZones(zonesDepart as ZoneId[])
              .filter((x) => !x.secondes)
              .map((x) => ({ nom: x.nom, muscle: x.muscle, series: x.series, reps: Math.round((x.repsMin + x.repsMax) / 2), poids: 0, cle: cle() })),
          );
        }
      } catch (err) {
        logger.warn('Séance à modifier non lue', err);
      }
      setPret(true);
    })();
    getTrainings()
      .then((t) => setHist(buildExerciseHistory(t ?? [])))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const k = cle();
    maj((l) => [...l, { ...e, cle: k }].slice(0, MAX_EXOS));
    setOuvert(k);
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
  const vide = lignes.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* avec des changements, le retour passe par la fleche (qui demande confirmation), pas par le glissement */}
      <Stack.Screen options={{ gestureEnabled: !modifie }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <EnTete titre={id && trouvee ? traduire('Modifier ta séance') : traduire('Nouvelle séance')} onRetour={retour} repli="/mes-seances" style={{ marginHorizontal: -16, marginTop: -8 }} />

        {/* 27 octobre 2026 (maquette Pastel Seance) : le nom dans une carte blanche, son sticker a gauche */}
        <View style={[carteBlanche(c.surface, c.divider), { marginTop: 12, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Image source={illus.img('musculation')} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={12} weight="extraBold" color={c.textSecondary}>{traduire('Nom')}</Ink>
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
              style={[fontStyle('black'), { minHeight: 32, fontSize: 18, color: c.ink, padding: 0 }]}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 24, marginBottom: 10, paddingHorizontal: 4 }}>
          <Ink size={18} weight="black" tight>{traduire('Exercices')}</Ink>
          {lignes.length ? (
            <Ink size={13} weight="extraBold" color={c.accentText}>
              {`${traduirePluriel(lignes.length, lignes.length > 1, '{0} exercice', '{0} exercices', lignes.length)}, ${traduire('{0} séries au total', total)}`}
            </Ink>
          ) : null}
        </View>

        {pret && vide ? (
          <View style={[carteBlanche(c.surface, c.divider), { alignItems: 'center', gap: 10, paddingVertical: 22, paddingHorizontal: 22 }]}>
            <Image source={illus.img('carnet')} style={{ width: 72, height: 72 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Ink size={14} weight="bold" color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 20 }}>{traduire('Ajoute tes exercices dans l’ordre où tu les fais. Les charges viendront de ta dernière fois.')}</Ink>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          {lignes.map((e, i) => {
            const t = tonDuRang(i);
            const nomExo = traduire(nomFr(e.nom));
            const ouverte = ouvert === e.cle;
            return (
              <View key={e.cle} style={[carteBlanche(c.surface, c.divider), { padding: 12, gap: 12 }]}>
                <Pressable
                  onPress={() => { tap(); setOuvert(ouverte ? null : e.cle); }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: ouverte }}
                  accessibilityLabel={`${i + 1}. ${nomExo}, ${traduire('{0} séries de {1}', e.series, e.reps)}`}
                  accessibilityHint={traduire('Régler les séries, l’ordre, ou retirer')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={17} weight="black" color={t.encre}>{String(i + 1)}</Ink>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={15.5} weight="black" tight numberOfLines={2}>{nomExo}</Ink>
                    <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={1}>
                      {[traduire('{0} séries de {1}', e.series, e.reps), e.muscle ? traduire(niceGroup(e.muscle)) : ''].filter(Boolean).join(', ')}
                    </Ink>
                  </View>
                  {demoDe(e.nom) ? <ExoDemo nom={e.nom} largeur={52} hauteur={40} arrondi={12} bordure={false} /> : null}
                  <Poignee couleur={P.poignee} ouverte={ouverte} />
                </Pressable>

                {ouverte ? (
                  <>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 16, backgroundColor: t.fond }}>
                        <Ink size={12} weight="extraBold" color={t.encre}>{traduire('séries')}</Ink>
                        <Stepper value={e.series} step={1} min={1} max={MAX_SERIES} size={18} button={32} unit={traduire('séries')} onChange={(v) => maj((l) => l.map((x) => (x.cle === e.cle ? { ...x, series: v } : x)))} />
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 16, backgroundColor: t.fond }}>
                        <Ink size={12} weight="extraBold" color={t.encre}>{traduire('répétitions')}</Ink>
                        <Stepper value={e.reps} step={1} min={1} max={100} size={18} button={32} unit={traduire('répétitions')} onChange={(v) => maj((l) => l.map((x) => (x.cle === e.cle ? { ...x, reps: v } : x)))} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Fleche nom="up" label={traduire('Monter {0}', nomExo)} actif={i > 0} onPress={() => deplacer(i, -1)} />
                      <Fleche nom="down" label={traduire('Descendre {0}', nomExo)} actif={i < lignes.length - 1} onPress={() => deplacer(i, 1)} />
                      <View style={{ flex: 1 }} />
                      <Fleche nom="close" label={traduire('Retirer {0}', nomExo)} texte={traduire('Retirer')} actif onPress={() => { setOuvert(null); maj((l) => l.filter((x) => x.cle !== e.cle)); }} />
                    </View>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* bouton plein pastel (Houari ne voulait plus du bouton en pointilles) */}
        {lignes.length < MAX_EXOS ? (
          <Pressable
            onPress={() => { tap(); setPicker(true); }}
            accessibilityRole="button"
            style={({ pressed }) => ({ marginTop: 14, height: 60, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: pressed ? c.primaryPressed : c.primary })}
          >
            <View style={{ width: 30, height: 30, borderRadius: 11, backgroundColor: blancA(0.7), alignItems: 'center', justifyContent: 'center' }}>
              <PlusPastille />
            </View>
            <Ink size={16} weight="black" color={c.onPrimary}>{traduire('Ajouter un exercice')}</Ink>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: c.background }}>
        <Pressable
          onPress={enregistrer}
          disabled={vide}
          accessibilityRole="button"
          accessibilityState={{ disabled: vide }}
          style={({ pressed }) => ({ height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: vide ? c.fillSoft : pressed ? c.primaryPressed : c.primary })}
        >
          <Ink size={17} weight="black" color={vide ? c.textMuted : c.onPrimary}>{traduire('Enregistrer')}</Ink>
        </Pressable>
      </View>

      <ExercisePicker visible={picker} onClose={() => setPicker(false)} onPick={ajouter} history={hist.map} recent={hist.recent} already={lignes.map((l) => l.nom)} />
    </View>
  );
}

/** La poignee a six points de la maquette : elle ouvre et ferme les reglages de l'exercice */
function Poignee({ couleur, ouverte }: { couleur: string; ouverte: boolean }) {
  return (
    <View style={{ width: 28, height: 40, alignItems: 'center', justifyContent: 'center', opacity: ouverte ? 0.6 : 1 }}>
      <Svg width={20} height={20} viewBox="0 0 24 24">
        {[6, 12, 18].map((y) => (
          <React.Fragment key={y}>
            <Circle cx={9} cy={y} r={1.6} fill={couleur} />
            <Circle cx={15} cy={y} r={1.6} fill={couleur} />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

function Fleche({ nom, label, actif, onPress, texte }: { nom: 'up' | 'down' | 'close'; label: string; actif: boolean; onPress: () => void; texte?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const d = nom === 'up' ? 'M6 15l6-6 6 6' : nom === 'down' ? 'M6 9l6 6 6-6' : 'M7 7l10 10M17 7L7 17';
  const rouge = nom === 'close';
  return (
    <Pressable
      onPress={() => { if (actif) { tap(); onPress(); } }}
      disabled={!actif}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ minWidth: 44, height: 40, paddingHorizontal: texte ? 14 : 0, borderRadius: 14, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: rouge ? c.dangerTint : pressed ? c.fillSubtle : c.fillSoft, opacity: actif ? (pressed ? 0.8 : 1) : 0.35 })}
    >
      <FlecheSvg d={d} couleur={rouge ? c.danger : c.ink} />
      {texte ? <Ink size={13} weight="extraBold" color={c.danger}>{texte}</Ink> : null}
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
