/**
 * Importer une ou plusieurs pesees depuis des photos (balance non connectee, captures d'apps de balance,
 * tickets, mensurations notees), en trois temps :
 * 1. copier la consigne pour l'IA (ChatGPT, Claude, Gemini...), a envoyer avec ses photos, meme tout un dossier ;
 * 2. coller la reponse (un bloc « YOROI BALANCE v1 » par date) ;
 * 3. IMPORT MULTI : l'apercu « N pesees trouvees », une carte repliable par date (la date a choisir d'abord,
 *    puis de la plus recente a la plus ancienne). Chaque valeur se coche et se corrige ; une pesee deja notee
 *    ce jour-la est completee sans rien ecraser, sauf si « Remplacer » est coche sur la valeur. Un seul bouton
 *    « Tout enregistrer », ou une date a la fois. Copie de securite locale avant un import de plus de 3 dates.
 * Poids et composition dans la pesee du jour, mensurations dans la table measurements a la meme date.
 * YOROI n'envoie rien a aucune IA : l'utilisateur choisit la sienne.
 * PHOTOS DATEES : premier choix « Choisir mes photos ». YOROI lit la date de prise de chaque photo, les trie,
 * prepare un document (une photo par page avec sa date) et la consigne completee par la liste des dates ;
 * « Envoyer a mon IA » copie la consigne et ouvre le partage. Un bloc rendu sans date reprend la date de sa photo.
 * Aucune photo n'est gardee : copies de cache effacees a la fin (lib/v2/balance/photoPrep.ts).
 * Analyse : lib/v2/balance/format.ts, fusion : lib/v2/balance/multi.ts, enregistrement : lib/v2/balance/save.ts.
 */
import { track } from '@/utils/telemetry';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { lienBilan, lireBilanAuto } from '@/lib/v2/bilan/reglage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { fontStyle } from '@/components/yoroi/fonts';
import { DatePickerSheet } from '@/components/yoroi/v2/DateChips';
import { DetailHeader, GhostButton, GlassCard, GUTTER, PrimaryButton } from '@/components/yoroi/v2/progres/ui';
import { CORPS } from '@/lib/v2/progres/couleursCorps';
import { getProfile, getWeights, openDatabase } from '@/lib/database';
import type { Weight } from '@/lib/database';
import { BALANCE_FIELD, BALANCE_FIELDS, BALANCE_PROMPT, blockSignature, fmtAutre, fmtBalance, parseBalanceBlocks, PHYSIQUE_LABELS, readEdited, readNumber } from '@/lib/v2/balance/format';
import type { BalanceFieldSpec, BalanceGroup, ParseResult, ScaleAutre } from '@/lib/v2/balance/format';
import { autreReplaceId, existingAutres, existingValues, measureOfDay, pickSameDayRow, valueStatus } from '@/lib/v2/balance/multi';
import type { MeasureDay } from '@/lib/v2/balance/multi';
import { saveImportBlock, sameDayWeight } from '@/lib/v2/balance/save';
import { buildPhotoPrompt, dateProposal, frenchDateTime, frenchTime, groupSessions, isoDay, proposalLabel, readStoredDates } from '@/lib/v2/balance/photos';
import type { DatedPhoto, DateProposal } from '@/lib/v2/balance/photos';
import { checkCoherence } from '@/lib/v2/balance/coherence';
import type { WeightPoint } from '@/lib/v2/balance/coherence';
import { cleanupPhotos, clearStoredDates, loadStoredDatesRaw, pickDatedPhotos, preparePhotos, shareDocument, storeDates } from '@/lib/v2/balance/photoPrep';
import type { Prepared } from '@/lib/v2/balance/photoPrep';
import { loadMeasures } from '@/lib/v2/progres/measures';
import { snapshotBeforeImport } from '@/lib/v2/sauvegarde/avantMiseAJour';
import { todayIso } from '@/lib/v2/progres/format';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

const GROUPS: { id: BalanceGroup; title: string }[] = [
  { id: 'principal', title: traduire('Poids et composition') },
  { id: 'avance', title: traduire('Les autres mesures') },
  { id: 'segment', title: traduire('Bras, jambes, tronc') },
  { id: 'mensuration', title: traduire('Mensurations') },
];

const MOIS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];
const MOIS_COURT = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];
const JOURS_COURT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d === 1 ? '1er' : d} ${MOIS[m - 1] ?? ''} ${y}`;
}
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const year = y !== new Date().getFullYear() ? ` ${y}` : '';
  return `${d === 1 ? '1er' : d} ${MOIS_COURT[m - 1] ?? ''}${year}`;
}
function dayTitle(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(y, m - 1, d, 12).getDay();
  return `${JOURS_COURT[wd] ?? ''} ${shortDate(iso)}`;
}

/** NUIT 14 : « 89,2 kg enregistré le 13 oct. », avec l'ancien poids s'il est remplace */
function savedText(weight: number, date: string, old?: number): string {
  const base = traduire("{0} kg enregistré le {1}", fmtBalance(weight, 0.1), shortDate(date));
  return old !== undefined ? traduire("{0}, à la place de {1} kg (gardé dans tes pesées)", base, fmtBalance(old, 0.1)) : base;
}

const FROM: Record<string, string> = { lb: traduire('converti depuis les livres'), st: traduire('converti depuis les stones'), kj: traduire('converti depuis les kJ'), in: traduire('converti depuis les pouces') };
/** au-dela, une copie de securite locale est faite avant l'import */
const SNAPSHOT_OVER = 3;

/** L'etat de l'apercu d'une pesee (une carte par date) */
type BlockState = {
  edits: Record<string, string>;
  checked: Record<string, boolean>;
  /** valeurs deja notees ce jour-la a remplacer (sinon gardees) */
  replace: Record<string, boolean>;
  /** '' : date inconnue, a choisir */
  date: string;
  /** BALANCE 3 : la date proposee et d'ou elle vient (IA, photo, aujourd'hui), jamais enregistree sans ton accord */
  proposal: DateProposal;
  /** tu as dit Oui, choisi une des deux dates ou un autre jour */
  confirmed: boolean;
  /** le jour a ete choisi a la main */
  chosen?: boolean;
  include: boolean;
  open: boolean;
  error?: string;
  done?: string;
};
const autreId = (i: number) => `autre:${i}`;
/** Un mot trop long pour la colonne (« intracellulaire ») peut se couper : trait d'union conditionnel */
const breakable = (t: string) => t.replace(/[A-Za-zÀ-ÿ]{12,}/g, (w) => `${w.slice(0, 8)}\u00AD${w.slice(8)}`);

/** Ce bloc a-t-il des valeurs de pesee (sinon seulement des mensurations a colonne) */
const needsWeightLine = (b: ParseResult) => b.autres.length > 0 || b.values.some((v) => !BALANCE_FIELD[v.key]?.measure && v.key !== 'poids_kg');

function initBlock(b: ParseResult, rows: Weight[], single: boolean, dates: { at?: number }[], fromThisVisit: boolean, undatedCount: number): BlockState {
  const edits: Record<string, string> = {};
  const checked: Record<string, boolean> = {};
  for (const v of b.values) {
    edits[v.key] = fmtBalance(v.value, BALANCE_FIELD[v.key].step);
    checked[v.key] = !v.outOfRange;
  }
  b.autres.forEach((a, i) => {
    edits[autreId(i)] = fmtAutre(a.value);
    checked[autreId(i)] = true;
  });
  // BALANCE 3 : la date de l'IA (avec sa source), sinon celle de la photo, sinon aujourd'hui : toujours a confirmer
  const proposal = dateProposal(b, dates, fromThisVisit, undatedCount, todayIso());
  const date = proposal.date;
  if (needsWeightLine(b) && !b.values.some((v) => v.key === 'poids_kg')) {
    const w = date ? sameDayWeight(rows, date) : undefined;
    edits.poids_kg = w ? fmtBalance(w, 0.1) : '';
    checked.poids_kg = true;
  }
  const attention = !date || !!proposal.conflict || b.values.some((v) => v.outOfRange);
  return { edits, checked, replace: {}, date, proposal, confirmed: false, include: true, open: single || attention };
}

export default function BalancePhotoScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [text, setText] = useState('');
  const [states, setStates] = useState<BlockState[]>([]);
  const [rows, setRows] = useState<Weight[]>([]);
  const [measures, setMeasures] = useState<MeasureDay[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [picker, setPicker] = useState<number | null>(null);
  // PHOTOS DATEES
  const [photos, setPhotos] = useState<DatedPhoto[]>([]);
  const [storedDates, setStoredDates] = useState<{ at?: number }[]>([]);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  // BALANCE 3 : taille du profil (controle de l'IMC), defilement vers le champ, texte de l'IA trouve
  const [heightCm, setHeightCm] = useState<number | undefined>(undefined);
  const [clipFound, setClipFound] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pasteY = useRef(0);
  const previewY = useRef(0);
  const pasteFocused = useRef(false);
  const textRef = useRef('');
  textRef.current = text;
  const photosRef = useRef<DatedPhoto[]>([]);
  const lastSaved = useRef<string | null>(null);
  const preparedRef = useRef<Prepared | null>(null);
  photosRef.current = photos;
  preparedRef.current = prepared;
  /** les dates qui servent a completer la reponse : les photos choisies, ou celles gardees (dates seules) */
  const dates = photos.length ? photos : storedDates;
  const datesSig = dates.map((p) => p.at ?? 0).join(',');
  const sessions = useMemo(() => groupSessions(photos), [photos]);
  const currentPrompt = photos.length ? buildPhotoPrompt(photos) : BALANCE_PROMPT;

  const reload = useCallback(async () => {
    try {
      setRows((await getWeights()) ?? []);
    } catch (err) {
      logger.warn('[Balance photo] lecture des pesees impossible', err);
    }
    try {
      setMeasures((await loadMeasures()) as MeasureDay[]);
    } catch (err) {
      logger.warn('[Balance photo] lecture des mensurations impossible', err);
    }
  }, []);

  useEffect(() => {
    void reload();
    getProfile()
      .then((p) => setHeightCm(p?.height_cm ? Number(p.height_cm) : undefined))
      .catch(() => {});
  }, [reload]);

  /** la consigne de YOROI copiee elle-meme n'est pas une reponse de l'IA */
  const isOwnPrompt = (t: string) => t.trim().startsWith(BALANCE_PROMPT.slice(0, 40));

  // BALANCE 3 : le presse-papiers contient un texte YOROI BALANCE (copie dans ton IA) : on propose de l'importer
  const lookClipboard = useCallback(async () => {
    try {
      if (!(await Clipboard.hasStringAsync())) return;
      const t = await Clipboard.getStringAsync();
      if (!t || !/yoroi[\s_-]*balance/i.test(t) || isOwnPrompt(t) || t.trim() === textRef.current.trim()) return;
      if (!parseBalanceBlocks(t).some((b) => b.values.length || b.autres.length)) return;
      setClipFound(t);
    } catch {
      // presse-papiers illisible : le bouton Coller et le champ restent la
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void lookClipboard();
    // retour depuis ton IA : on regarde a nouveau
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void lookClipboard();
    });
    return () => sub.remove();
  }, [lookClipboard]);

  /** le champ de la reponse juste au-dessus du clavier */
  const scrollToPaste = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, pasteY.current - 12), animated: true }), Platform.OS === 'ios' ? 280 : 120);
  };
  useEffect(() => {
    const sub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      if (pasteFocused.current) scrollToPaste();
    });
    return () => sub.remove();
  }, []);

  const importText = (t: string) => {
    Keyboard.dismiss();
    setText(t);
    setClipFound(null);
    setError(null);
    selectionAsync().catch(() => {});
    // l'apercu juste en dessous
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, previewY.current - 12), animated: true }), 350);
  };

  // dates des photos d'un passage precedent (l'app a pu se fermer pendant le detour par l'IA)
  useEffect(() => {
    void loadStoredDatesRaw().then((raw) => setStoredDates(readStoredDates(raw)));
    // a la sortie : les copies de cache sont effacees, YOROI ne garde aucune photo
    return () => {
      void cleanupPhotos(photosRef.current, preparedRef.current?.copies);
    };
  }, []);

  const blocks = useMemo(() => parseBalanceBlocks(text, todayIso()).filter((b) => b.values.length || b.autres.length), [text]);
  const sig = useMemo(() => blocks.map(blockSignature).join('#') + blocks.map((b) => b.date ?? '?').join(','), [blocks]);

  // Nouveau texte colle : l'apercu repart de ce que l'IA a lu, une carte par date
  useEffect(() => {
    const undated = blocks.filter((b) => !b.date).length;
    setStates(blocks.map((b) => initBlock(b, rows, blocks.length === 1, dates, photos.length > 0, undated)));
    setError(null);
    setNotice(null);
    setAllDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, datesSig]);

  /** tes pesees deja notees, pour le controle de coherence */
  const history: WeightPoint[] = useMemo(
    () => rows.filter((r) => Number(r.weight) > 0 && r.date).map((r) => ({ date: String(r.date).slice(0, 10), weight: Number(r.weight), bmi: Number(r.bmi_scale) > 0 ? Number(r.bmi_scale) : undefined })),
    [rows],
  );

  const update = (i: number, fn: (s: BlockState) => BlockState) => setStates((all) => all.map((s, k) => (k === i ? fn(s) : s)));

  const choosePhotos = async () => {
    if (progress) return;
    try {
      setProgress(traduire('Lecture des dates de tes photos'));
      const list = await pickDatedPhotos();
      if (!list) return;
      await cleanupPhotos(photos, prepared?.copies);
      setPrepared(null);
      setSendNotice(null);
      setPhotos(list);
      void storeDates(list);
      selectionAsync().catch(() => {});
    } catch (err) {
      logger.warn('[Balance photo] choix des photos impossible', err);
      setError(traduire('Impossible d’ouvrir tes photos. Vérifie que YOROI y a accès dans les réglages du téléphone.'));
    } finally {
      setProgress(null);
    }
  };

  /** Envoyer a mon IA : la consigne datee est copiee, puis le partage s'ouvre avec le document des photos */
  const sendToAi = async () => {
    if (progress || !photos.length) return;
    try {
      await Clipboard.setStringAsync(currentPrompt);
    } catch (err) {
      logger.warn('[Balance photo] copie impossible', err);
    }
    setSendNotice(traduire('Consigne copiée, colle-la dans ton IA avec tes photos.'));
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    if (Platform.OS === 'web') return;
    try {
      let ready = prepared;
      if (!ready) {
        setProgress(traduire("Préparation de tes photos, 0 sur {0}", photos.length));
        ready = await preparePhotos(photos, (d, t) => setProgress(traduire("Préparation de tes photos, {0} sur {1}", d, t)));
        setPrepared(ready);
      }
      setProgress(null);
      const shared = await shareDocument(ready.pdf);
      if (!shared) setSendNotice(traduire('Consigne copiée. Le partage n’est pas disponible : dans ton IA, ajoute tes photos depuis ta galerie, de la plus ancienne à la plus récente, puis colle la consigne.'));
    } catch (err) {
      logger.warn('[Balance photo] preparation ou partage impossible', err);
      setSendNotice(traduire('Consigne copiée. Le document n’a pas pu être préparé : dans ton IA, ajoute tes photos depuis ta galerie, de la plus ancienne à la plus récente, puis colle la consigne.'));
    } finally {
      setProgress(null);
    }
  };

  const copyPrompt = async () => {
    try {
      await Clipboard.setStringAsync(currentPrompt);
      setCopied(true);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      logger.warn('[Balance photo] copie impossible', err);
      setShowPrompt(true);
    }
  };

  const paste = async () => {
    try {
      const t = await Clipboard.getStringAsync();
      if (t && t.trim() && isOwnPrompt(t)) setError(traduire('C’est la consigne de YOROI qui est copiée. Dans ton IA, copie sa réponse, puis reviens ici.'));
      else if (t && t.trim()) importText(t);
      else setError(traduire('Le presse-papiers est vide. Copie la réponse de ton IA, puis réessaie.'));
    } catch (err) {
      logger.warn('[Balance photo] lecture du presse-papiers impossible', err);
      setError(traduire('Lecture du presse-papiers impossible. Colle la réponse dans le champ.'));
    }
  };

  /** Ce qui est deja note le jour d'une carte */
  const existingOf = (st: BlockState) => {
    if (!st.date) return { values: {} as Record<string, number>, autres: new Map<string, ScaleAutre>(), has: false };
    const w = readEdited(st.edits.poids_kg ?? '', BALANCE_FIELD.poids_kg);
    const row = pickSameDayRow(rows, st.date, w);
    const values = existingValues(row, measureOfDay(measures, st.date));
    return { values, autres: existingAutres(row), has: !!row || Object.keys(values).length > 0 };
  };

  /** Les valeurs cochees d'une carte, lues et verifiees */
  const collect = (b: ParseResult, st: BlockState) => {
    const fields = BALANCE_FIELDS.filter((f) => st.edits[f.key] !== undefined && st.checked[f.key]);
    const values: Record<string, number | undefined> = {};
    const bad: string[] = [];
    for (const f of fields) {
      const raw = (st.edits[f.key] ?? '').trim();
      const v = readEdited(raw, f);
      if (v === undefined) {
        if (f.key !== 'poids_kg' || raw) bad.push(f.label.toLowerCase());
        continue;
      }
      if (v < f.min || v > f.max) bad.push(f.label.toLowerCase());
      else values[f.key] = v;
    }
    const list: ScaleAutre[] = [];
    b.autres.forEach((a, i) => {
      if (!st.checked[autreId(i)]) return;
      const n = readNumber(st.edits[autreId(i)] ?? '');
      if (!n) bad.push(a.name.toLowerCase());
      else list.push({ nom: a.name, valeur: n.value, ...(a.unit ? { unite: a.unit } : {}) });
    });
    const replace = new Set<string>();
    // NUIT 14 : la balance fait foi pour le poids : il remplace celui deja note ce jour-la, sauf si tu decoches
    if (st.replace.poids_kg !== false) replace.add('poids_kg');
    for (const [k, on] of Object.entries(st.replace)) {
      if (!on || k === 'poids_kg') continue;
      if (k.startsWith('autre:')) {
        const a = b.autres[Number(k.slice(6))];
        if (a) replace.add(autreReplaceId(a.name));
      } else replace.add(k);
    }
    const count = Object.keys(values).length + list.length;
    const err = !st.date
      ? traduire('Choisis le jour de cette pesée : aucune date trouvée.')
      : !st.confirmed
        ? traduire('Confirme la date de cette pesée : touche Oui ou Changer.')
      : bad.length
        ? traduire("À vérifier : {0}. Corrige la valeur ou décoche la ligne.", bad.join(', '))
        : !count
          ? traduire('Coche au moins une valeur.')
          : undefined;
    return { values, list, replace, err };
  };

  /** Enregistre une carte ; le texte du resultat, ou null si elle n'a pas pu l'etre (l'erreur est sur la carte) */
  const saveBlock = async (i: number): Promise<string | null> => {
    const b = blocks[i];
    const st = states[i];
    if (!b || !st) return null;
    const { values, list, replace, err } = collect(b, st);
    if (err) {
      update(i, (s) => ({ ...s, error: err, open: true }));
      return null;
    }
    const had = existingOf(st).has;
    const res = await saveImportBlock(st.date, values, list, replace);
    if (!res.ok) {
      update(i, (s) => ({ ...s, open: true, error: traduire('Il manque ton poids : il n’est pas sur les photos et aucune pesée n’est notée ce jour-là. Écris-le dans la ligne Poids, ou décoche les valeurs de la balance.') }));
      return null;
    }
    const kept = res.kept ? `, ${res.kept} ${res.kept > 1 ? traduire('valeurs gardées') : traduire('valeur gardée')}` : '';
    const done = res.nothingNew
      ? traduire('Déjà à jour, rien de nouveau.')
      : res.weight
        ? `${savedText(res.weight, res.date, res.replaced?.weight)}${kept}.`
        : had
          ? traduire("Pesée complétée{0}.", kept)
          : traduire('Pesée enregistrée.');
    update(i, (s) => ({ ...s, error: undefined, done, open: false, include: false }));
    if (res.weight && !res.nothingNew) lastSaved.current = savedText(res.weight, res.date, res.replaced?.weight) + '.';
    return res.nothingNew ? 'same' : had && !res.replaced ? 'merged' : 'new';
  };

  const finish = (results: (string | null)[], dates: string[]) => {
    const ok = results.filter(Boolean) as string[];
    if (!ok.length) return;
    // la courbe, l'accueil, la tendance et le rythme prevu se rechargent tout de suite (useWeightData ecoute)
    DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    track('poids_saisi', { methode: 'photo_balance' });
    void reload();
    const nNew = ok.filter((r) => r === 'new').length;
    const nMerged = ok.filter((r) => r === 'merged').length;
    const nSame = ok.filter((r) => r === 'same').length;
    const parts = [nNew ? traduirePluriel(nNew, nNew > 1, "{0} nouvelle", "{0} nouvelles", nNew) : '', nMerged ? traduirePluriel(nMerged, nMerged > 1, "{0} complétée", "{0} complétées", nMerged) : '', nSame ? traduire("{0} déjà à jour", nSame) : ''].filter(Boolean);
    // NUIT 14 : la confirmation reste a l'ecran (« 89,2 kg enregistré le 13 oct. »), plus de depart automatique
    // vers un autre ecran qui la cachait ; « Voir ma courbe » y mene.
    const one = ok.length === 1 && lastSaved.current;
    setNotice(one ? traduire("{0} Ta courbe est à jour.", lastSaved.current) : traduirePluriel(ok.length, ok.length > 1, "{0} pesée enregistrée{1}. Tes courbes sont à jour.", "{0} pesées enregistrées{1}. Tes courbes sont à jour.", ok.length, parts.length ? ` : ${parts.join(', ')}` : ''));
    lastSaved.current = null;
    // 16 octobre : une seule pesee lue, la page de bilan s'ouvre ; plusieurs (import en masse), jamais un bilan par pesee,
    // un seul resume sur demande (« Voir mon bilan »)
    if (!multi && ok.length === 1 && dates[0]) {
      void lireBilanAuto().then((on) => {
        if (on) router.replace(lienBilan({ type: 'corps', date: dates[0], origine: 'photo' }) as never);
      });
    }
  };

  const saveOne = async (i: number) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const r = await saveBlock(i);
      finish([r], [states[i]?.date ?? '']);
      if (!r) notificationAsync(NotificationFeedbackType.Warning).catch(() => {});
      setAllDone(states.every((s, k) => k === i ? !!r : !!s.done));
    } catch (err) {
      logger.error('[Balance photo] enregistrement impossible', err);
      setError(traduire('Enregistrement impossible, réessaie.'));
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    if (saving) return;
    const todo = states.map((s, i) => ({ s, i })).filter(({ s }) => s.include && !s.done);
    if (!todo.length) {
      setError(traduire('Coche au moins une pesée.'));
      return;
    }
    // tout est verifie avant d'ecrire quoi que ce soit
    const invalid = todo.filter(({ s, i }) => !!collect(blocks[i], s).err);
    if (invalid.length) {
      setStates((all) => all.map((s, i) => (invalid.some((x) => x.i === i) ? { ...s, open: true, error: collect(blocks[i], s).err } : s)));
      setError(invalid.length > 1 ? traduire("{0} pesées à vérifier avant d’enregistrer, elles sont ouvertes.", invalid.length) : traduire('Une pesée est à vérifier avant d’enregistrer, elle est ouverte.'));
      notificationAsync(NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (todo.length > SNAPSHOT_OVER) {
        // copie de securite locale avant un gros import (jamais bloquante)
        try {
          const db = await openDatabase();
          await snapshotBeforeImport(db, traduire("Avant l’import de {0} pesées", todo.length));
        } catch (err) {
          logger.warn('[Balance photo] copie avant import impossible', err);
        }
      }
      const results: (string | null)[] = [];
      for (const { i } of todo) results.push(await saveBlock(i));
      finish(results, todo.map(({ s }) => s.date));
      const failed = results.filter((r) => !r).length;
      if (failed) setError(traduirePluriel(failed, failed > 1, "{0} pesée n’a pas pu être enregistrée, regarde la carte ouverte.", "{0} pesées n’ont pas pu être enregistrées, regarde la carte ouverte.", failed));
      else {
        setAllDone(true);
        void cleanupPhotos(photos, prepared?.copies);
        void clearStoredDates();
      }
    } catch (err) {
      logger.error('[Balance photo] enregistrement impossible', err);
      setError(traduire('Enregistrement impossible, réessaie.'));
    } finally {
      setSaving(false);
    }
  };

  const stroke = { stroke: c.ink, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  const Check = ({ on, size = 28 }: { on: boolean; size?: number }) => (
    <View style={{ width: size, height: size, borderRadius: size / 3, borderWidth: 2, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {on ? (
        <Svg width={size * 0.57} height={size * 0.57} viewBox="0 0 24 24">
          <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c.onAccent} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );

  const row = (bi: number, st: BlockState, p: { id: string; label: string; unit: string; color: string; sub?: string; off: boolean; placeholder: string; first: boolean; old?: string; status?: 'same' | 'conflict' | 'new' }) => {
    const on = !!st.checked[p.id];
    // NUIT 14 : pour le poids, la valeur de la balance remplace par defaut (decocher garde l'ancienne)
    const isWeight = p.id === 'poids_kg';
    const rep = isWeight ? st.replace.poids_kg !== false : !!st.replace[p.id];
    const nowTxt = `${st.edits[p.id] ?? ''} ${p.unit}`.trim();
    return (
      <View key={p.id} style={{ paddingVertical: 8, borderTopWidth: p.first ? 0 : 1, borderColor: c.divider, opacity: on ? 1 : 0.55, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
        <Pressable
          onPress={() => {
            selectionAsync().catch(() => {});
            update(bi, (s) => ({ ...s, checked: { ...s.checked, [p.id]: !s.checked[p.id] }, error: undefined }));
          }}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: on }}
          accessibilityLabel={`Garder ${p.label}`}
        >
          <Check on={on} />
        </Pressable>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: p.color }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={p.id.startsWith('autre:') ? 13 : 14} weight="extraBold" numberOfLines={3}>
            {breakable(p.label)}
          </Ink>
          {p.sub ? (
            <Ink size={12} weight={p.off ? 'bold' : 'medium'} color={p.off ? c.danger : c.textSecondary} numberOfLines={2}>
              {traduire(p.sub)}
            </Ink>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TextInput
            value={st.edits[p.id] ?? ''}
            onChangeText={(t) => update(bi, (s) => ({ ...s, edits: { ...s.edits, [p.id]: t.replace('.', DECIMAL) }, checked: { ...s.checked, [p.id]: true }, error: undefined }))}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
            maxLength={7}
            placeholder={p.placeholder}
            placeholderTextColor={c.textMuted}
            accessibilityLabel={`${p.label}${p.unit ? ` en ${p.unit}` : ''}`}
            style={[fontStyle('black'), { width: 76, height: 44, borderRadius: 12, borderWidth: 1, borderColor: p.off ? c.danger : c.border, backgroundColor: c.surface, color: c.ink, fontSize: 18, textAlign: 'right', paddingHorizontal: 10, paddingVertical: 0, includeFontPadding: false }]}
          />
          <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2} style={{ width: p.unit.length <= 3 ? 26 : 42 }}>
            {p.unit}
          </Ink>
        </View>
      </View>
          {p.status === 'same' ? (
            <Ink size={12} color={c.textSecondary} numberOfLines={2} style={{ paddingLeft: 47 }}>{traduire("Déjà notée, identique")}</Ink>
          ) : p.status === 'conflict' && p.old ? (
            <Pressable
              onPress={() => {
                selectionAsync().catch(() => {});
                update(bi, (s) => ({ ...s, replace: { ...s.replace, [p.id]: isWeight ? s.replace.poids_kg === false : !s.replace[p.id] }, checked: { ...s.checked, [p.id]: true } }));
              }}
              hitSlop={6}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rep }}
              accessibilityLabel={isWeight ? traduire("Remplacer {0}, déjà noté ce jour-là, par {1} de la balance", p.old, nowTxt) : traduire("Remplacer {0}, déjà notée {1}", p.label, p.old)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32, paddingLeft: 47 }}
            >
              <Check on={rep} size={18} />
              <Ink size={12} weight="bold" color={rep ? c.accent : c.textSecondary} style={{ flexShrink: 1 }} numberOfLines={isWeight ? 4 : 2}>
                {isWeight
                  ? rep
                    ? traduire("Déjà noté ce jour-là : {0}. La balance fait foi : {1} le remplace, {2} reste dans tes pesées.", p.old, nowTxt, p.old)
                    : traduire("Déjà noté ce jour-là : {0}, gardé. Coche pour prendre {1} de la balance.", p.old, nowTxt)
                  : rep
                    ? `Remplacer ${p.old}`
                    : traduire("Déjà notée : {0}, gardée", p.old)}
              </Ink>
            </Pressable>
          ) : null}
      </View>
    );
  };

  const confirmDate = (bi: number, date: string, chosen = false) => {
    selectionAsync().catch(() => {});
    update(bi, (s) => ({ ...s, date, confirmed: true, chosen, error: undefined }));
  };

  const pill = (label: string, onPress: () => void, primary: boolean, a11y?: string) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      hitSlop={4}
      style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', backgroundColor: primary ? (pressed ? c.primaryPressed : c.primary) : pressed ? c.fillSubtle : c.surface, borderWidth: primary ? 0 : 1.5, borderColor: c.border })}
    >
      <Ink size={14} weight="extraBold" color={primary ? c.onPrimary : c.ink}>{label}</Ink>
    </Pressable>
  );

  /** BALANCE 3 : « Date détectée : 12 oct. (écran de la balance). C'est bon ? » Oui / Changer, jamais de date silencieuse */
  const dateStrip = (b: ParseResult, st: BlockState, bi: number) => {
    const p = st.proposal;
    const label = st.chosen ? traduire('choisie par toi') : proposalLabel(p, b.yearAdded);
    if (st.confirmed && st.date) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 12, paddingHorizontal: 12, minHeight: 44, borderRadius: 14, backgroundColor: c.fillSubtle }}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c.successText} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Ink size={13} weight="bold" style={{ flex: 1 }} numberOfLines={2}>{`${shortDate(st.date)}, ${label}`}</Ink>
          <Pressable onPress={() => setPicker(bi)} accessibilityRole="button" accessibilityLabel={traduire("Changer le jour de cette pesée")} hitSlop={8} style={{ minHeight: 40, justifyContent: 'center' }}>
            <Ink size={13} weight="extraBold" color={c.accent}>{traduire("Changer")}</Ink>
          </Pressable>
        </View>
      );
    }
    const box = { marginHorizontal: 14, marginBottom: 12, padding: 12, borderRadius: 14, gap: 10, borderWidth: 1.5, borderColor: c.accent + '55', backgroundColor: c.accentTint };
    if (p.conflict && st.date === p.date) {
      const cf = p.conflict;
      const choice = (date: string, line1: string, line2: string) => (
        <Pressable
          key={line2}
          onPress={() => confirmDate(bi, date)}
          accessibilityRole="button"
          accessibilityLabel={`${line1}, ${line2}`}
          style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border, justifyContent: 'center' })}
        >
          <Ink size={15} weight="extraBold">{line1}</Ink>
          <Ink size={12} color={c.textSecondary} numberOfLines={2}>{line2}</Ink>
        </Pressable>
      );
      return (
        <View style={box}>
          <Ink size={14} weight="extraBold">{traduire("Deux dates possibles : laquelle est la bonne ?")}</Ink>
          {choice(p.date, dayTitle(p.date), traduire("lue par l’IA, {0}", label))}
          {choice(cf.date, dayTitle(cf.date), cf.photo ? traduire("prise de la photo {0}, le {1}", cf.photo, frenchDateTime(cf.at)) : traduire("prise de tes photos, le {0}", frenchDateTime(cf.at)))}
          <View style={{ flexDirection: 'row' }}>{pill(traduire('Autre jour'), () => setPicker(bi), false, traduire('Choisir un autre jour'))}</View>
        </View>
      );
    }
    if (st.date) {
      return (
        <View style={box}>
          <Ink size={14} weight="bold">
            {p.source === 'aujourdhui' && !st.chosen ? traduire('Aucune date trouvée : ') : traduire('Date détectée : ')}
            <Ink size={14} weight="black">{shortDate(st.date)}</Ink>
            {traduire(" ({0}). C’est bon ?", label)}
          </Ink>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {pill(traduire('Oui'), () => confirmDate(bi, st.date, st.chosen), true, traduire("Oui, la pesée est du {0}", longDate(st.date)))}
            {pill(traduire('Changer'), () => setPicker(bi), false, traduire('Changer le jour de cette pesée'))}
          </View>
        </View>
      );
    }
    return (
      <View style={box}>
        <Ink size={14} weight="bold">{b.badDate ? traduire('Date illisible sur la photo : choisis le jour.') : traduire('Aucune date trouvée : choisis le jour.')}</Ink>
        <View style={{ flexDirection: 'row' }}>{pill(traduire('Choisir le jour'), () => setPicker(bi), true)}</View>
      </View>
    );
  };

  const card = (b: ParseResult, st: BlockState, bi: number) => {
    const ex = existingOf(st);
    const shown: BalanceFieldSpec[] = BALANCE_FIELDS.filter((f) => st.edits[f.key] !== undefined);
    const nOn = shown.filter((f) => st.checked[f.key]).length + b.autres.filter((_, i) => st.checked[autreId(i)]).length;
    const hasWeight = b.values.some((v) => v.key === 'poids_kg');
    const dayWeight = st.date ? sameDayWeight(rows, st.date) : undefined;
    const poids = readEdited(st.edits.poids_kg ?? '', BALANCE_FIELD.poids_kg);
    const nMes = shown.filter((f) => f.group === 'mensuration' && st.checked[f.key]).length;
    // NUIT 14 : un autre poids est deja note ce jour-la : les deux valeurs se voient sans ouvrir la carte
    const weightClash = !!st.date && hasWeight && poids !== undefined && ex.values.poids_kg !== undefined && valueStatus('poids_kg', poids, ex.values) === 'conflict';
    const summary = [poids ? `${fmtBalance(poids, 0.1)} kg` : '', nMes ? `${nMes} ${nMes > 1 ? 'mensurations' : 'mensuration'}` : '', `${nOn} ${nOn > 1 ? 'valeurs' : 'valeur'}`].filter(Boolean).join(', ');
    const fieldRow = (f: BalanceFieldSpec, first: boolean) => {
      const pv = b.values.find((v) => v.key === f.key);
      const edited = readEdited(st.edits[f.key] ?? '', f);
      const off = edited !== undefined && (edited < f.min || edited > f.max);
      const sub =
        f.key === 'poids_kg' && !hasWeight
          ? dayWeight
            ? traduire('pas sur les photos : ta pesée de ce jour-là')
            : traduire('pas sur les photos : écris-le')
          : off
            ? traduire("à vérifier, de {0} à {1}", String(f.min).replace('.', DECIMAL), String(f.max).replace('.', DECIMAL))
            : f.key === 'physique' && edited
              ? PHYSIQUE_LABELS[edited] ?? undefined
              : pv?.from
                ? FROM[pv.from]
                : undefined;
      const oldV = ex.values[f.key];
      const status = edited !== undefined && oldV !== undefined && !(f.key === 'poids_kg' && !hasWeight) ? valueStatus(f.key, edited, ex.values) : undefined;
      return row(bi, st, { id: f.key, label: f.label, unit: f.unit, color: f.kind ? CORPS[f.kind] : f.group === 'mensuration' ? c.accent : c.textMuted, sub, off, placeholder: f.step >= 1 ? '0' : '0,0', first, old: oldV !== undefined ? `${fmtBalance(oldV, f.step)}${f.unit && f.unit !== 'niveau' ? ` ${f.unit}` : ''}` : undefined, status });
    };
    const title = st.date ? dayTitle(st.date) : traduire('Date à choisir');
    // BALANCE 3 : poids loin de tes dernieres pesees, IMC qui ne va pas avec ton poids et ta taille
    const num = (k: string) => (st.checked[k] && st.edits[k] !== undefined ? readEdited(st.edits[k] ?? '', BALANCE_FIELD[k]) : undefined);
    const others: WeightPoint[] = states.flatMap((o, k) => {
      const w = k === bi ? undefined : readEdited(o.edits.poids_kg ?? '', BALANCE_FIELD.poids_kg);
      return w ? [{ date: o.date || todayIso(), weight: w }] : [];
    });
    const warns = hasWeight
      ? checkCoherence({ date: st.date || todayIso(), values: { poids_kg: num('poids_kg'), imc: num('imc'), muscle_kg: num('muscle_kg'), os_kg: num('os_kg'), graisse_kg: num('graisse_kg'), graisse_pct: num('graisse_pct') }, history, others, heightCm })
      : [];
    return (
      <GlassCard key={`b${bi}`} style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
          {st.done ? (
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c.successText} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                selectionAsync().catch(() => {});
                update(bi, (s) => ({ ...s, include: !s.include }));
              }}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: st.include }}
              accessibilityLabel={st.date ? traduire("Garder la pesée du {0}", longDate(st.date)) : traduire("Garder la pesée sans date")}
            >
              <Check on={st.include} />
            </Pressable>
          )}
          <Pressable
            onPress={() => update(bi, (s) => ({ ...s, open: !s.open }))}
            accessibilityRole="button"
            accessibilityState={{ expanded: st.open }}
            accessibilityLabel={`${title}, ${summary}. ${st.open ? 'Replier' : traduire('Déplier')}`}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Ink size={16} weight="black" color={st.date ? c.ink : c.danger} numberOfLines={1}>{title}</Ink>
              <Ink size={12} color={c.textSecondary} numberOfLines={2}>{st.done ?? summary}</Ink>
              {weightClash && !st.done ? (
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: c.accentTint, marginTop: 2 }}>
                  <Ink size={12} weight="bold" color={c.accent} numberOfLines={3}>{traduire("Déjà noté le {0} : {1} kg. La balance : {2} kg.", shortDate(st.date), fmtBalance(ex.values.poids_kg as number, 0.1), fmtBalance(poids as number, 0.1))}</Ink>
                </View>
              ) : ex.has && st.date && !st.done ? (
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: c.accentTint, marginTop: 2 }}>
                  <Ink size={12} weight="bold" color={c.accent} numberOfLines={2}>{traduire("Complète ta pesée du {0}", shortDate(st.date))}</Ink>
                </View>
              ) : null}
            </View>
            <View style={{ transform: [{ rotate: st.open ? '90deg' : '0deg' }] }}>
              <ChevronIcon color={c.textSecondary} />
            </View>
          </Pressable>
        </View>
        {!st.done ? dateStrip(b, st, bi) : null}
        {!st.done && warns.length ? (
          <View accessibilityLiveRegion="polite" style={{ marginHorizontal: 14, marginBottom: 12, padding: 12, borderRadius: 14, backgroundColor: c.goldTint, flexDirection: 'row', gap: 10 }}>
            <Svg width={18} height={18} viewBox="0 0 24 24" style={{ marginTop: 1 }}>
              <Path d="M12 4l9 16H3z" stroke={c.goldDeep} strokeWidth={2} fill="none" strokeLinejoin="round" />
              <Path d="M12 10v4.5M12 17.4v.1" stroke={c.goldDeep} strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
            <View style={{ flex: 1, gap: 4 }}>
              {warns.map((w) => (
                <Ink key={w.kind} size={13} weight="bold" color={c.ink}>{traduire(w.text)}</Ink>
              ))}
            </View>
          </View>
        ) : null}
        {st.open ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderTopWidth: 1, borderColor: c.divider, paddingTop: 12 }}>
            {GROUPS.map((g) => {
              const list = shown.filter((f) => f.group === g.id);
              if (!list.length) return null;
              return (
                <View key={g.id} style={{ borderRadius: 14, backgroundColor: c.fillSubtle, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ paddingTop: 8, paddingBottom: 2 }}>{traduire(g.title)}</Ink>
                  {list.map((f, i) => fieldRow(f, i === 0))}
                </View>
              );
            })}
            {b.autres.length ? (
              <View style={{ borderRadius: 14, backgroundColor: c.fillSubtle, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ paddingTop: 8 }}>{traduire("Mesures en plus de ta balance")}</Ink>
                <Ink size={12} color={c.textSecondary} style={{ paddingBottom: 2 }}>{traduire("Gardées telles quelles, avec le nom affiché.")}</Ink>
                {b.autres.map((a, i) => {
                  const old = ex.autres.get(autreReplaceId(a.name).slice(6));
                  const edited = readNumber(st.edits[autreId(i)] ?? '')?.value;
                  const status = old && edited !== undefined ? (Math.abs(old.valeur - edited) < 1e-6 ? 'same' : 'conflict') : undefined;
                  return row(bi, st, { id: autreId(i), label: a.name, unit: a.unit, color: c.textMuted, off: false, placeholder: '0', first: i === 0, old: old ? `${fmtAutre(old.valeur)}${old.unite ? ` ${old.unite}` : ''}` : undefined, status });
                })}
              </View>
            ) : null}
            {st.error ? (
              <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.dangerTint }}>
                <Ink size={14} weight="bold">{st.error}</Ink>
              </View>
            ) : null}
            {blocks.length > 1 && !st.done ? (
              <GhostButton label={st.date ? traduire("Enregistrer seulement le {0}", shortDate(st.date)) : traduire('Enregistrer seulement cette pesée')} onPress={() => void saveOne(bi)} />
            ) : null}
          </View>
        ) : null}
      </GlassCard>
    );
  };

  const total = blocks.reduce((n, b) => n + b.values.length + b.autres.length, 0);
  const status = !text.trim()
    ? null
    : total
      ? `${total} ${total > 1 ? 'valeurs reconnues' : 'valeur reconnue'}${blocks.some((b) => b.values.some((v) => v.outOfRange)) ? traduire(', certaines à vérifier') : ''}.`
      : traduire('Aucune valeur reconnue. Colle les blocs YOROI BALANCE en entier, de la première ligne à FIN.');
  const ignored = blocks.flatMap((b) => b.unknown);
  const multi = blocks.length > 1;
  const pending = states.filter((s) => s.include && !s.done).length;
  const toChoose = states.filter((s) => !s.date && !s.done).length;
  const single = states[0];
  const singleCount = single && blocks[0] ? BALANCE_FIELDS.filter((f) => single.edits[f.key] !== undefined && single.checked[f.key]).length + blocks[0].autres.filter((_, i) => single.checked[autreId(i)]).length : 0;

  return (
    // BALANCE 3 : sur iPhone, la liste s'agrandit de la hauteur du clavier (automaticallyAdjustKeyboardInsets) et
    // defile jusqu'au champ ; plus de KeyboardAvoidingView en padding qui laissait le champ sous le clavier
    <KeyboardAvoidingView behavior={undefined} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'} showsVerticalScrollIndicator={false}>
        <DetailHeader title={traduire("Pesée par photo")} sub={traduire("Ton IA lit les photos de ta balance, tu colles sa réponse ici. Trois étapes.")} />

        {/* BALANCE 3 : les trois etapes, visibles d'un coup d'oeil */}
        <View style={{ flexDirection: 'row', gap: 6, marginHorizontal: GUTTER, marginTop: 12 }}>
          {[traduire('Consigne et photos'), traduire('Ton IA'), traduire('Colle la réponse')].map((t, i) => {
            const done = i === 0 ? copied || photos.length > 0 || !!sendNotice : i === 1 ? !!sendNotice || !!text.trim() : blocks.length > 0;
            return (
              <View key={t} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12, backgroundColor: done ? c.accentTint : c.fillSubtle }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done ? c.primary : c.surface, borderWidth: done ? 0 : 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Ink size={12} weight="black" color={done ? c.onPrimary : c.ink}>{String(i + 1)}</Ink>
                </View>
                <Ink size={11} weight="bold" color={c.ink} numberOfLines={2} style={{ flex: 1 }}>{t}</Ink>
              </View>
            );
          })}
        </View>

        {/* 1. La consigne et les photos */}
        <GlassCard style={{ marginHorizontal: GUTTER, marginTop: 12, gap: 12 }}>
          <StepTitle n={1} title={traduire("Copie la consigne et choisis tes photos")} />
          {photos.length ? (
            <View style={{ gap: 8 }}>
              <Ink size={14} weight="extraBold">{`${photos.length} ${photos.length > 1 ? 'photos' : 'photo'}, ${sessions.length} ${sessions.length > 1 ? traduire('pesées') : traduire('pesée')}`}</Ink>
              {sessions.map((g, gi) => {
                const first = photos[g[0]];
                const last = photos[g[g.length - 1]];
                const when = first.at !== undefined ? `${dayTitle(isoDay(first.at))}, ${frenchTime(first.at)}${last.at !== undefined && g.length > 1 && frenchTime(last.at) !== frenchTime(first.at) ? traduire(" à {0}", frenchTime(last.at)) : ''}` : 'Date inconnue';
                return (
                  <View key={`g${gi}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, backgroundColor: c.fillSubtle }}>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {g.slice(0, 3).map((pi) => (
                        <View key={pi} style={{ width: 40, height: 40, borderRadius: 9, overflow: 'hidden', backgroundColor: c.border }}>
                          <Image source={{ uri: photos[pi].uri }} style={{ width: 40, height: 40 }} resizeMode="cover" accessibilityIgnoresInvertColors />
                          <View style={{ position: 'absolute', left: 2, bottom: 2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: 'rgba(29,32,41,0.82)', alignItems: 'center', justifyContent: 'center' }}>
                            <Ink size={10} weight="black" color="#FFFFFF">{String(pi + 1)}</Ink>
                          </View>
                        </View>
                      ))}
                      {g.length > 3 ? (
                        <View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                          <Ink size={12} weight="black" color={c.textSecondary}>{`+${g.length - 3}`}</Ink>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Ink size={13} weight="extraBold" color={first.at !== undefined ? c.ink : c.danger} numberOfLines={2}>{when}</Ink>
                      <Ink size={12} color={c.textSecondary} numberOfLines={2}>
                        {first.at === undefined
                          ? traduire('Tu choisiras le jour après.')
                          : g.length > 1
                            ? traduire("Photos {0} à {1}, une seule pesée", g[0] + 1, g[g.length - 1] + 1)
                            : traduire("Photo {0}", g[0] + 1)}
                      </Ink>
                    </View>
                  </View>
                );
              })}
              <GhostButton label={traduire("Changer de photos")} onPress={() => void choosePhotos()} />
            </View>
          ) : (
            <>
              <Ink size={13} color={c.textSecondary}>{traduire("YOROI lit le jour et l’heure de chaque photo et les ajoute à la consigne.")}</Ink>
              <PrimaryButton label={progress ?? traduire('Choisir mes photos')} onPress={() => void choosePhotos()} disabled={!!progress} />
            </>
          )}
          <GhostButton label={copied ? traduire('Consigne copiée') : photos.length ? traduire('Copier seulement la consigne') : traduire('Ou copie seulement la consigne')} onPress={copyPrompt} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
            <Pressable onPress={() => setShowPrompt((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showPrompt }} hitSlop={6} style={{ minHeight: 32, justifyContent: 'center' }}>
              <Ink size={13} weight="bold" color={c.accent}>{showPrompt ? traduire('Masquer la consigne') : traduire('Voir la consigne')}</Ink>
            </Pressable>
            <Pressable onPress={() => setShowTips((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showTips }} hitSlop={6} style={{ minHeight: 32, justifyContent: 'center' }}>
              <Ink size={13} weight="bold" color={c.accent}>{showTips ? traduire('Masquer les conseils') : traduire('Bien prendre tes photos')}</Ink>
            </Pressable>
          </View>
          {showPrompt ? (
            <View style={{ maxHeight: 260, borderRadius: 14, backgroundColor: c.fillSubtle, padding: 12 }}>
              <ScrollView nestedScrollEnabled>
                <Ink size={12} color={c.textSecondary} selectable>{currentPrompt}</Ink>
              </ScrollView>
            </View>
          ) : null}
          {showTips ? (
            <View style={{ gap: 8, borderRadius: 14, backgroundColor: c.fillSubtle, padding: 12 }}>
              {[
                traduire('Une photo par écran : la Tanita fait défiler ses valeurs, photographie chacune, segments compris (les deux boutons orange).'),
                traduire('Bien en face, sans reflet, chiffres nets. Toute balance marche, connectée ou pas.'),
                traduire('Tout un dossier de photos, même de dates différentes : chaque date devient une pesée.'),
                traduire('Un ticket InBody, une capture de l’historique d’une app de balance ou tes mensurations notées marchent aussi.'),
              ].map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                  <Ink size={13} weight="black" color={c.accent} style={{ width: 14 }}>{String(i + 1)}</Ink>
                  <Ink size={13} color={c.textSecondary} style={{ flex: 1 }}>{t}</Ink>
                </View>
              ))}
            </View>
          ) : null}
        </GlassCard>

        {/* 2. Envoyer a ton IA */}
        <GlassCard style={{ marginHorizontal: GUTTER, marginTop: 12, gap: 12 }}>
          <StepTitle n={2} title={traduire("Envoie à ton IA")} />
          {photos.length ? (
            <>
              <Ink size={13} color={c.textSecondary}>{traduire("Un appui : la consigne est copiée et le partage s’ouvre avec tes photos datées. Choisis ChatGPT, Claude, Gemini ou une autre IA, colle la consigne, envoie.")}</Ink>
              <PrimaryButton label={progress ?? traduire('Envoyer à mon IA')} onPress={() => void sendToAi()} disabled={!!progress} />
            </>
          ) : (
            <Ink size={13} color={c.textSecondary}>{traduire("Ouvre ChatGPT, Claude, Gemini ou une autre IA. Colle la consigne, ajoute tes photos, envoie. Quand elle répond, copie sa réponse et reviens ici.")}</Ink>
          )}
          {sendNotice ? (
            <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.accentTint }}>
              <Ink size={13} weight="bold" color={c.ink}>{sendNotice}</Ink>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Rect x={5} y={10.5} width={14} height={10} rx={2.5} {...stroke} />
              <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...stroke} />
            </Svg>
            <Ink size={12} weight="bold" style={{ flex: 1 }}>{traduire("YOROI n’envoie rien à aucune IA et ne garde aucune photo.")}</Ink>
          </View>
        </GlassCard>

        {/* 3. Coller la reponse : un gros bouton, sans clavier */}
        <View onLayout={(e) => (pasteY.current = e.nativeEvent.layout.y)}>
          <GlassCard style={{ marginHorizontal: GUTTER, marginTop: 12, gap: 12, borderWidth: 1.5, borderColor: c.accent }}>
            <StepTitle n={3} title={traduire("Colle sa réponse")} />
            {clipFound ? (
              <View accessibilityLiveRegion="polite" style={{ padding: 12, borderRadius: 14, backgroundColor: c.accentTint, gap: 10 }}>
                <Ink size={14} weight="extraBold">{traduire("Texte de l’IA trouvé : l’importer ?")}</Ink>
                <Ink size={12} color={c.textSecondary} numberOfLines={2}>{clipFound.replace(/\s+/g, ' ').trim().slice(0, 90)}</Ink>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {pill(traduire('Importer'), () => importText(clipFound), true, traduire('Importer le texte de l’IA copié'))}
                  {pill(traduire('Non'), () => setClipFound(null), false, traduire('Ne pas importer'))}
                </View>
              </View>
            ) : null}
            <PrimaryButton label={traduire("Coller depuis le presse-papiers")} onPress={() => void paste()} />
            <Ink size={12} color={c.textSecondary}>{traduire("Ou colle-la dans le champ :")}</Ink>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              onFocus={() => {
                pasteFocused.current = true;
                scrollToPaste();
              }}
              onBlur={() => (pasteFocused.current = false)}
              placeholder={traduire('YOROI BALANCE v1\ndate: 2026-10-12\npoids_kg: 82.4\n...\nFIN')}
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={traduire("Réponse de ton IA")}
              style={[fontStyle('medium'), { minHeight: 110, maxHeight: 200, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.ink, fontSize: 14, padding: 12, textAlignVertical: 'top' }]}
            />
            {status ? (
              <Ink size={13} weight="bold" color={total ? c.successText : c.danger}>
                {status}
              </Ink>
            ) : null}
            {ignored.length ? (
              <Ink size={12} color={c.textSecondary}>{traduire("Ignoré, sans valeur lisible : {0}{1}", ignored.slice(0, 4).join(', '), ignored.length > 4 ? '...' : '')}</Ink>
            ) : null}
          </GlassCard>
        </View>

        {/* 3. L'apercu : une carte par date */}
        {blocks.length && states.length === blocks.length ? (
          <View onLayout={(e) => (previewY.current = e.nativeEvent.layout.y)} style={{ marginHorizontal: GUTTER, marginTop: 22, gap: 12 }}>
            <View style={{ gap: 4 }}>
              <Ink size={20} weight="black" tight>{traduirePluriel(blocks.length, blocks.length > 1, "{0} pesée trouvée", "{0} pesées trouvées", blocks.length)}</Ink>
              {toChoose ? (
                <Ink size={13} weight="bold" color={c.danger}>{traduirePluriel(toChoose, toChoose > 1, "{0} pesée sans date : choisis son jour avant d’enregistrer.", "{0} pesées sans date : choisis leur jour avant d’enregistrer.", toChoose)}</Ink>
              ) : null}
              <Ink size={13} color={c.textSecondary}>
                {multi
                  ? traduire('Ouvre une date pour vérifier ses valeurs, corrige un chiffre si l’IA s’est trompée, décoche ce que tu ne veux pas garder.')
                  : traduire('Corrige un chiffre si l’IA s’est trompée, décoche ce que tu ne veux pas garder.')}
              </Ink>
            </View>
            {blocks.map((b, i) => (states[i] ? card(b, states[i], i) : null))}
            {notice ? (
              <View accessibilityLiveRegion="polite" style={{ padding: 14, borderRadius: 16, backgroundColor: c.fillSubtle, borderWidth: 1.5, borderColor: c.successText, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c.successText} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Ink size={15} weight="extraBold" color={c.ink} style={{ flex: 1 }}>{notice}</Ink>
                </View>
                {allDone && states.some((s) => s.date) ? (
                  <GhostButton
                    label={traduire("Voir mon bilan")}
                    onPress={() => router.replace(lienBilan({ type: 'corps', date: states.map((s) => s.date).filter(Boolean).sort().slice(-1)[0] as string, origine: 'photo' }) as never)}
                  />
                ) : null}
                {allDone ? (
                  <GhostButton
                    label={blocks.some((b) => b.values.some((v) => v.key === 'poids_kg')) ? traduire('Voir ma courbe') : traduire('Voir mes mesures')}
                    onPress={() => router.replace((blocks.some((b) => b.values.some((v) => v.key === 'poids_kg')) ? '/poids-detail' : multi ? '/measurements' : { pathname: '/composition-detail', params: { mode: 'mesure', date: states[0]?.date } }) as any)}
                  />
                ) : null}
              </View>
            ) : null}
            {error ? (
              <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.dangerTint }}>
                <Ink size={14} weight="bold">{error}</Ink>
              </View>
            ) : null}
            {!allDone ? (
              <PrimaryButton
                label={
                  saving
                    ? 'Enregistrement en cours'
                    : multi
                      ? pending > 1
                        ? traduire("Tout enregistrer, {0} pesées", pending)
                        : pending === 1
                          ? traduire('Enregistrer la pesée cochée')
                          : traduire('Coche une pesée')
                      : traduirePluriel(singleCount, singleCount > 1, "Enregistrer {0} valeur", "Enregistrer {0} valeurs", singleCount)
                }
                onPress={() => void saveAll()}
                disabled={saving || (multi ? !pending : !singleCount)}
              />
            ) : null}
            {multi && pending > SNAPSHOT_OVER && !allDone ? (
              <Ink size={12} color={c.textSecondary}>{traduire("Une copie de sécurité de tes données est faite sur ce téléphone avant l’import.")}</Ink>
            ) : null}
            <Ink size={12} color={c.textSecondary}>{traduire("Une valeur déjà notée n’est jamais écrasée, sauf si tu coches Remplacer. Source notée : Balance (photo). Les balances à impédance donnent une estimation, compare-toi à toi-même.")}</Ink>
          </View>
        ) : error ? (
          <View style={{ marginHorizontal: GUTTER, marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: c.dangerTint }}>
            <Ink size={14} weight="bold">{error}</Ink>
          </View>
        ) : null}
      </ScrollView>
      <DatePickerSheet
        visible={picker !== null}
        value={(picker !== null && states[picker]?.date) || todayIso()}
        title={traduire("Jour de cette pesée")}
        onClose={() => setPicker(null)}
        onPick={(iso) => {
          if (picker !== null) update(picker, (s) => ({ ...s, date: iso, confirmed: true, chosen: iso !== s.proposal.date, error: undefined }));
          setPicker(null);
        }}
        maxDate={todayIso()}
      />
    </KeyboardAvoidingView>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="header">
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Ink size={15} weight="black" color={c.onPrimary}>{String(n)}</Ink>
      </View>
      <Ink size={17} weight="black" tight style={{ flex: 1 }}>{title}</Ink>
    </View>
  );
}

function ChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
