/**
 * Ajouter (ou ranger) une video du carnet (vague 16).
 * 1. D'ou elle vient : ta galerie (TikTok, Instagram, filmee...) ou un lien.
 * 2. Son titre et son rangement : un muscle travaille (exemple d'exercice) ou une technique d'un sport.
 * La video de la galerie est copiee dans YOROI pour rester lisible.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { getSportById, getSportName } from '@/lib/sports';
import { getEspace } from '@/lib/v2/espace';
import logger from '@/lib/security/logger';
import { MUSCLES_VIDEO, copyToApp, kindOf, patchVideo, saveVideo } from '@/lib/v2/carnet/videos';
import type { CarnetVideo, VideoKind } from '@/lib/v2/carnet/videos';
import { P, Press, CIcon, Field, BigButton, Label, ChoiceLine, tap } from '../ui';
import { Illus } from '../nav';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { blancA } from '@/components/yoroi/livePalette';

const COMMON_SPORTS = ['jjb', 'boxe', 'mma', 'muay_thai', 'lutte', 'judo', 'grappling', 'kickboxing', 'musculation', 'crossfit', 'hyrox', 'running', 'yoga'];

export type VideoPreset = { muscleGroup?: string; sport?: string; benchmarkId?: string; benchmarkName?: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved?: (v: CarnetVideo) => void;
  /** rangement deja connu (depuis un exercice par exemple) */
  preset?: VideoPreset;
  /** video a renommer ou a ranger autrement */
  editing?: CarnetVideo | null;
};

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label}>
      <View style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? P.accent : P.white, borderWidth: 1, borderColor: on ? P.accent : P.line2 }}>
        <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? P.white : P.ink}>{label}</Ink>
      </View>
    </Press>
  );
}

function KindCard({ k, on, onPress }: { k: VideoKind; on: boolean; onPress: () => void }) {
  const meta = k === 'muscle' ? { t: 'Un muscle', s: 'exemple d’exercice', il: 'musculation' as const } : k === 'technique' ? { t: 'Une technique', s: 'd’un sport', il: 'jjb' as const } : { t: 'Autre', s: 'sans rangement', il: 'videos' as const };
  return (
    <View style={{ flex: 1 }}>
      <Press onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${meta.t}, ${meta.s}`}>
        <View style={{ minHeight: 112, borderRadius: 20, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: on ? P.accentSoft : P.white, borderWidth: on ? 1.5 : 1, borderColor: on ? P.accent : P.line2 }}>
          <Illus name={meta.il} size={44} />
          <Ink size={13} weight="extraBold" color={on ? P.accent : P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{meta.t}</Ink>
          <Ink size={11} weight="bold" color={P.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{meta.s}</Ink>
        </View>
      </Press>
    </View>
  );
}

export function AddVideoSheet({ visible, onClose, onSaved, preset, editing }: Props) {
  const [step, setStep] = useState<'source' | 'link' | 'form'>('source');
  const [asset, setAsset] = useState<{ uri: string; durationSec?: number } | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<VideoKind>('muscle');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [sport, setSport] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSaving(false);
    setUrl('');
    setAsset(null);
    if (editing) {
      setStep('form');
      setTitle(editing.title);
      setKind(kindOf(editing));
      setMuscle(editing.muscleGroup ?? null);
      setSport(editing.sport ?? null);
    } else {
      setStep('source');
      setTitle('');
      setKind(preset?.sport ? 'technique' : 'muscle');
      setMuscle(preset?.muscleGroup ?? null);
      setSport(preset?.sport ?? null);
    }
    getEspace()
      .then((e) => setFavs(e.sportsFavoris ?? []))
      .catch(() => {});
  }, [visible, editing, preset?.muscleGroup, preset?.sport]);

  const sports = useMemo(() => {
    const ids = Array.from(new Set([...favs, ...COMMON_SPORTS])).filter((id) => !!getSportById(id));
    return ids.slice(0, 14);
  }, [favs]);

  const fromBenchmark = !!preset?.benchmarkId && !editing;

  const pickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        appAlert('Accès refusé', 'Autorise l’accès à ta galerie dans les réglages du téléphone pour importer une vidéo.');
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, quality: 1 });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      const d = typeof a.duration === 'number' && a.duration > 0 ? a.duration / 1000 : undefined;
      setAsset({ uri: a.uri, durationSec: d });
      setStep('form');
      tap();
    } catch (e) {
      logger.error('[AddVideoSheet] galerie', e);
      appAlert('Oups', 'La galerie n’a pas pu s’ouvrir.');
    }
  };

  const placeOk = fromBenchmark || kind === 'autre' || (kind === 'muscle' && !!muscle) || (kind === 'technique' && !!sport);
  const canSave = !!title.trim() && placeOk && !saving;

  const place = () => {
    if (fromBenchmark) return { muscleGroup: undefined, sport: undefined, sportLabel: undefined, sportColor: undefined, benchmarkId: preset?.benchmarkId, benchmarkName: preset?.benchmarkName };
    if (kind === 'muscle') return { muscleGroup: muscle ?? undefined, sport: undefined, sportLabel: undefined, sportColor: undefined };
    if (kind === 'technique' && sport) return { muscleGroup: undefined, sport, sportLabel: getSportName(sport), sportColor: getSportById(sport)?.color };
    return { muscleGroup: undefined, sport: undefined, sportLabel: undefined, sportColor: undefined };
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editing) {
        const p = place();
        await patchVideo(editing.id, { title: title.trim(), kind: fromBenchmark ? 'muscle' : kind, ...p });
        onSaved?.({ ...editing, title: title.trim(), kind, ...p });
        onClose();
        return;
      }
      let uri = '';
      let isUrl = false;
      if (asset) uri = await copyToApp(asset.uri);
      else {
        const link = url.trim();
        if (!/^https?:\/\//i.test(link)) {
          appAlert('Lien invalide', 'Le lien doit commencer par https://');
          setSaving(false);
          return;
        }
        uri = link;
        isUrl = true;
      }
      const v = await saveVideo({ title: title.trim(), uri, isUrl, kind: fromBenchmark ? 'muscle' : kind, durationSec: asset?.durationSec, ...place() });
      tap('success');
      onSaved?.(v);
      onClose();
    } catch (e) {
      logger.error('[AddVideoSheet] enregistrement', e);
      appAlert('Oups', 'La vidéo n’a pas pu être enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  const sheetTitle = editing ? 'Modifier la vidéo' : step === 'source' ? 'Ajouter une vidéo' : step === 'link' ? 'Ajouter un lien' : 'Range ta vidéo';

  return (
    <Sheet visible={visible} onClose={onClose} title={sheetTitle} scroll>
      {step === 'source' ? (
        <>
          <Ink size={14} weight="medium" color={P.ink2} style={{ paddingHorizontal: 4 }}>
            Une vidéo TikTok ou Instagram enregistrée sur ton téléphone, ou que tu as filmée : importe-la, elle reste dans YOROI.
          </Ink>
          <Press onPress={pickFromGallery} haptic="medium" accessibilityRole="button" accessibilityLabel="Importer depuis ta galerie">
            <View style={{ minHeight: 96, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: P.accent }}>
              <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: blancA(0.92), alignItems: 'center', justifyContent: 'center' }}>
                <Illus name="videos" size={48} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={18} weight="black" color={P.white}>Depuis ta galerie</Ink>
                <Ink size={13} weight="bold" color="rgba(255,255,255,0.8)">Choisis la vidéo, donne-lui un titre</Ink>
              </View>
              <CIcon name="chevron" size={18} color={P.white} />
            </View>
          </Press>
          <ChoiceLine title="Un lien" sub="YouTube, Instagram, TikTok..." icon="link" onPress={() => setStep('link')} />
        </>
      ) : null}

      {step === 'link' ? (
        <>
          <Field label="Lien de la vidéo" value={url} onChangeText={setUrl} placeholder="https://..." autoCapitalize="none" keyboardType="url" autoCorrect={false} />
          <BigButton label="Continuer" icon="chevron" disabled={!/^https?:\/\/.+/i.test(url.trim())} onPress={() => setStep('form')} />
          <BigButton label="Retour" tone="light" icon="back" onPress={() => setStep('source')} />
        </>
      ) : null}

      {step === 'form' ? (
        <View style={{ gap: 14 }}>
          <Field label="Titre" value={title} onChangeText={setTitle} placeholder="Ex : rowing haltère, coudes serrés" maxLength={80} autoFocus={!editing} />
          {fromBenchmark ? (
            <Ink size={13} weight="medium" color={P.ink2} style={{ paddingHorizontal: 4 }}>{`Rangée avec l’exercice ${preset?.benchmarkName ?? ''}.`}</Ink>
          ) : (
            <>
              <Label>Ce qu’elle montre</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <KindCard k="muscle" on={kind === 'muscle'} onPress={() => setKind('muscle')} />
                <KindCard k="technique" on={kind === 'technique'} onPress={() => setKind('technique')} />
                <KindCard k="autre" on={kind === 'autre'} onPress={() => setKind('autre')} />
              </View>
              {kind === 'muscle' ? (
                <>
                  <Label>Muscle travaillé</Label>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {MUSCLES_VIDEO.map((m) => (
                      <Chip key={m} label={m} on={muscle === m} onPress={() => setMuscle(m)} />
                    ))}
                  </View>
                </>
              ) : null}
              {kind === 'technique' ? (
                <>
                  <Label>Sport</Label>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {sports.map((s) => (
                      <Chip key={s} label={getSportName(s)} on={sport === s} onPress={() => setSport(s)} />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
          <BigButton label={saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Ranger la vidéo'} icon="check" disabled={!canSave} onPress={save} />
          {!editing ? <BigButton label="Choisir une autre vidéo" tone="light" onPress={() => setStep('source')} /> : null}
        </View>
      ) : null}
    </Sheet>
  );
}

export default AddVideoSheet;
