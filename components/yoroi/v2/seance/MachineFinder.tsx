/**
 * Trouve ta machine (16 octobre) : les machines de salle en illustrations, sans marque.
 * Recherche par nom ou par le nom dit en salle, filtre par muscle, toucher une machine ajoute son exercice.
 * « Prendre la machine en photo » : sur le modele de la pesee par photo. YOROI copie une consigne,
 * tu l'envoies avec ta photo a ton IA, tu colles sa reponse (bloc YOROI MACHINE v1) et la machine est proposee.
 * Rien n'est envoye par l'app. Catalogue et lecture du bloc : lib/v2/seance/machines.ts.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, FlatList, Image, Modal, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { fontStyle } from '@/components/yoroi/fonts';
import { GhostButton, PrimaryButton } from '@/components/yoroi/v2/progres/ui';
import { normName, strengthLibrary } from '@/lib/v2/seance/history';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { GROUPES, MACHINE_HEADER, MACHINES, buildMachinePrompt, chercherMachines, isOwnMachinePrompt, parseMachineBlock } from '@/lib/v2/seance/machines';
import type { Machine, MachineBlock, MachineGroupe } from '@/lib/v2/seance/machines';
import { machineArt } from '@/lib/v2/seance/machinesArt';
import { Icon } from './Icon';
import { traduire } from '@/lib/i18n/tr';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** l'exercice choisi, avec son groupe musculaire de la bibliotheque quand il y est */
  onPick: (name: string, muscle?: string) => void;
  /** nom enregistre pour un exercice de la bibliotheque (celui de ton historique, sinon le francais) */
  nommer?: (name: string) => string;
};

const PAPIER = '#F5F6FB';
const GAP = 10;

/** groupe musculaire de l'exercice dans la bibliotheque de l'app, sinon celui de la machine */
export function muscleOf(name: string, m: Machine): string | undefined {
  const k = normName(name);
  const lib = strengthLibrary().find((l) => l.key === k || normName(nomFr(l.name)) === k);
  if (lib) return lib.muscle;
  return m.groupe === 'POLYVALENT' ? undefined : m.groupe;
}

function CameraGlyph({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" stroke={color} strokeWidth={2.2} fill="none" strokeLinejoin="round" />
      <Circle cx={12} cy={12.5} r={3.4} stroke={color} strokeWidth={2.2} fill="none" />
    </Svg>
  );
}

/** case papier quand l'illustration n'est pas encore faite : une silhouette de banc au trait */
function Placeholder({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <Svg width={size * 0.42} height={size * 0.42} viewBox="0 0 48 48">
        <Rect x={30} y={6} width={10} height={34} rx={2} stroke={color} strokeWidth={2} fill="none" />
        <Path d="M8 30h22M12 30v10M26 30v10M10 22h8l4 8" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M33 12h4M33 17h4M33 22h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      <Ink size={11} weight="bold" color={color}>{traduire("Illustration à venir")}</Ink>
    </View>
  );
}

export function MachineFinder({ visible, onClose, onPick, nommer = nomFr }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [groupe, setGroupe] = useState<MachineGroupe | null>(null);
  const [choix, setChoix] = useState<Machine | null>(null);
  const [photo, setPhoto] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reponse, setReponse] = useState('');
  const [bloc, setBloc] = useState<MachineBlock | null>(null);
  const [clipFound, setClipFound] = useState<string | null>(null);

  const pageW = Math.min(width, 640);
  const tile = Math.floor((pageW - 44 - GAP) / 2);

  // sans recherche, les machines deja illustrees d'abord (l'ordre du catalogue est garde dans chaque moitie)
  // 16 octobre : en tapant, on cherche dans toutes les machines, le filtre de muscle ne cache plus rien
  const liste = useMemo(() => {
    const l = chercherMachines(query, query.trim() ? null : groupe);
    if (query.trim()) return l;
    return [...l.filter((m) => machineArt(m.id)), ...l.filter((m) => !machineArt(m.id))];
  }, [query, groupe]);
  const nbIllus = useMemo(() => MACHINES.filter((m) => machineArt(m.id)).length, []);

  const reset = () => {
    setQuery('');
    setChoix(null);
    setPhoto(false);
    setReponse('');
    setBloc(null);
    setCopied(false);
    setClipFound(null);
  };

  const fermer = () => {
    reset();
    onClose();
  };

  const ajoute = (exo: string, m: Machine) => {
    const name = nommer(exo);
    onPick(name, muscleOf(exo, m));
    reset();
    onClose();
  };

  const touche = (m: Machine) => {
    if (m.exercices.length === 1) ajoute(m.exercices[0], m);
    else setChoix(m);
  };

  const lire = (t: string) => {
    setReponse(t);
    setClipFound(null);
    setBloc(t.trim() ? parseMachineBlock(t) : null);
  };

  // retour depuis ton IA : si le presse-papiers contient un bloc YOROI MACHINE, on propose de le coller
  const regardePressePapiers = useCallback(async () => {
    try {
      if (!(await Clipboard.hasStringAsync())) return;
      const t = await Clipboard.getStringAsync();
      if (!t || isOwnMachinePrompt(t) || !parseMachineBlock(t).found) return;
      setClipFound(t);
    } catch {
      // presse-papiers illisible : le bouton Coller et le champ restent la
    }
  }, []);

  useEffect(() => {
    if (!visible || !photo) return;
    void regardePressePapiers();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void regardePressePapiers();
    });
    return () => sub.remove();
  }, [visible, photo, regardePressePapiers]);

  const copier = async () => {
    try {
      await Clipboard.setStringAsync(buildMachinePrompt());
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const coller = async () => {
    try {
      const t = await Clipboard.getStringAsync();
      if (t && !isOwnMachinePrompt(t)) lire(t);
    } catch {
      // rien a coller
    }
  };

  const chip = (id: MachineGroupe | null, label: string) => {
    const on = query.trim() ? id === null : groupe === id;
    return (
      <Pressable key={id ?? 'toutes'} onPress={() => { setGroupe(id); setQuery(''); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: c.border }}>
        <Ink size={13} weight={on ? 'extraBold' : 'bold'} color={on ? PAPIER : c.textSecondary}>{label}</Ink>
      </Pressable>
    );
  };

  const illustration = (m: Machine, size: number) => {
    const art = machineArt(m.id);
    return (
      <View style={{ width: size, height: size, borderRadius: 16, overflow: 'hidden', backgroundColor: PAPIER, borderWidth: 1, borderColor: c.divider }}>
        {art ? <Image source={art} style={{ width: size, height: size }} resizeMode="cover" accessibilityIgnoresInvertColors /> : <Placeholder size={size} color={c.textMuted} />}
      </View>
    );
  };

  const muscles = (m: Machine) => m.muscles.slice(0, 2).join(', ');

  const carte = (m: Machine) => (
    <Pressable
      key={m.id}
      onPress={() => touche(m)}
      accessibilityRole="button"
      accessibilityLabel={`${m.nom}, ${muscles(m)}`}
      style={({ pressed }) => ({ width: tile, opacity: pressed ? 0.75 : 1, gap: 6 })}
    >
      {illustration(m, tile)}
      <View style={{ paddingHorizontal: 2, gap: 1 }}>
        <Ink size={14} weight="extraBold" numberOfLines={2}>{traduire(m.nom)}</Ink>
        <Ink size={12} color={c.textMuted} numberOfLines={1}>{muscles(m)}</Ink>
      </View>
    </Pressable>
  );

  const entete = (titre: string, retour?: () => void) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22 }}>
      {retour ? (
        <Pressable onPress={retour} accessibilityRole="button" accessibilityLabel={traduire("Retour")} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} strokeWidth={2.6} />
        </Pressable>
      ) : null}
      <Ink size={26} weight="black" tight style={{ flex: 1 }} numberOfLines={1}>{titre}</Ink>
      <Pressable onPress={fermer} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" size={18} strokeWidth={2.6} />
      </Pressable>
    </View>
  );

  /* ---------- choix de l'exercice sur une station polyvalente ---------- */
  const vueChoix = (m: Machine) => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: insets.bottom + 30, gap: 14 }}>
      <View style={{ alignItems: 'center' }}>{illustration(m, Math.min(260, pageW - 44))}</View>
      <View style={{ gap: 2 }}>
        <Ink size={20} weight="black">{traduire(m.nom)}</Ink>
        <Ink size={13} color={c.textMuted}>{m.muscles.join(', ')}</Ink>
      </View>
      <Ink size={15} weight="bold" color={c.textSecondary}>{traduire("Quel exercice tu fais dessus ?")}</Ink>
      <View style={{ gap: 6 }}>
        {m.exercices.map((e) => (
          <Pressable key={e} onPress={() => ajoute(e, m)} accessibilityRole="button" accessibilityLabel={traduire("Ajouter {0}", nommer(e))} style={({ pressed }) => ({ minHeight: 56, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.divider })}>
            <Ink size={16} weight="extraBold" style={{ flex: 1 }} numberOfLines={1}>{nommer(e)}</Ink>
            <Icon name="plus" size={20} color={c.textSecondary} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  /* ---------- photo : consigne, reponse collee, machine proposee ---------- */
  const etape = (n: number, titre: string, texte: string) => (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Ink size={14} weight="black" color={PAPIER}>{n}</Ink>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={16} weight="extraBold">{titre}</Ink>
        <Ink size={13} color={c.textSecondary}>{texte}</Ink>
      </View>
    </View>
  );

  const proposition = (b: MachineBlock) => {
    if (!b.found) {
      return (
        <Ink size={14} color={c.textSecondary}>
          {traduire("Je ne trouve pas le bloc {0} dans ce texte. Colle toute la réponse de ton IA, du titre jusqu’à FIN.", MACHINE_HEADER)}</Ink>
      );
    }
    if (!b.machine) {
      return (
        <View style={{ gap: 10 }}>
          <Ink size={16} weight="extraBold">{traduire("Ton IA ne reconnaît pas cette machine")}</Ink>
          {b.description ? <Ink size={14} color={c.textSecondary}>{traduire("Elle voit : {0}", b.description)}</Ink> : null}
          <GhostButton label={traduire("Chercher dans la liste")} onPress={() => { setPhoto(false); setQuery(b.description ?? ''); }} />
        </View>
      );
    }
    const m = b.machine;
    const conf = b.confiance === 'haute' ? traduire('Ton IA en est sûre') : b.confiance === 'moyenne' ? traduire('Ton IA pense que c’est elle') : b.confiance === 'faible' ? traduire('Ton IA hésite') : traduire('Proposée par ton IA');
    return (
      <View style={{ gap: 12 }}>
        <Ink size={13} weight="bold" color={c.textMuted}>{conf}</Ink>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          {illustration(m, 116)}
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={18} weight="black">{traduire(m.nom)}</Ink>
            <Ink size={13} color={c.textMuted}>{m.muscles.slice(0, 3).join(', ')}</Ink>
          </View>
        </View>
        <PrimaryButton label={traduire("C’est elle")} onPress={() => { setPhoto(false); touche(m); }} />
        {b.autres.length ? (
          <View style={{ gap: 6 }}>
            <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Sinon, ton IA a aussi pensé à")}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {b.autres.map((a) => (
                <Pressable key={a.id} onPress={() => { setPhoto(false); touche(a); }} accessibilityRole="button" style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', borderWidth: 1.5, borderColor: c.border }}>
                  <Ink size={13} weight="bold" color={c.textSecondary}>{traduire(a.nom)}</Ink>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <GhostButton label={traduire("Pas la bonne, chercher dans la liste")} onPress={() => setPhoto(false)} />
      </View>
    );
  };

  const vuePhoto = () => (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: insets.bottom + 40, gap: 18 }}>
      <Ink size={14} color={c.textSecondary}>{traduire("Ton IA reconnaît la machine sur ta photo. YOROI n’envoie rien : tu passes par l’IA que tu utilises déjà.")}</Ink>
      {etape(1, traduire('Copie la consigne'), traduire('Elle contient la liste des machines de YOROI.'))}
      <PrimaryButton label={copied ? traduire('Consigne copiée') : traduire('Copier la consigne')} tone={copied ? 'ink' : 'accent'} onPress={() => void copier()} />
      {etape(2, traduire('Envoie-la à ton IA avec ta photo'), traduire('ChatGPT, Gemini, Claude ou une autre : colle la consigne et joins la photo de la machine, prise de côté si tu peux.'))}
      {etape(3, traduire('Colle sa réponse ici'), traduire("Elle commence par {0} et finit par FIN.", MACHINE_HEADER))}
      {clipFound && !bloc ? (
        <Pressable onPress={() => lire(clipFound)} accessibilityRole="button" style={({ pressed }) => ({ borderRadius: 16, padding: 14, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1.5, borderColor: c.accent, gap: 2 })}>
          <Ink size={15} weight="extraBold" color={c.accent}>{traduire("Réponse trouvée dans le presse-papiers")}</Ink>
          <Ink size={13} color={c.textSecondary}>{traduire("Touche pour la lire")}</Ink>
        </Pressable>
      ) : null}
      <PrimaryButton label={traduire("Coller depuis le presse-papiers")} tone="ink" onPress={() => void coller()} />
      <TextInput
        value={reponse}
        onChangeText={lire}
        multiline
        placeholder={`${MACHINE_HEADER}\nmachine: ...\nFIN`}
        placeholderTextColor={c.textMuted}
        accessibilityLabel={traduire("Réponse de ton IA")}
        style={[fontStyle('bold'), { minHeight: 140, borderRadius: 16, padding: 14, fontSize: 14, color: c.ink, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, textAlignVertical: 'top' }]}
      />
      {bloc ? proposition(bloc) : null}
    </ScrollView>
  );

  /* ---------- liste : recherche, muscles, grille ---------- */
  const vueListe = () => (
    <>
      <View style={{ marginHorizontal: 22, marginTop: 14, height: 50, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }}>
        <Icon name="search" size={20} color={c.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={traduire("Presse, poulie, pec deck, smith...")}
          placeholderTextColor={c.textMuted}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={traduire("Chercher une machine")}
          style={[fontStyle('bold'), { flex: 1, fontSize: 16, color: c.ink, paddingVertical: 0 }]}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityLabel={traduire("Effacer la recherche")} hitSlop={10}>
            <Icon name="close" size={16} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ height: 54 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 22, alignItems: 'center' }}>
          {chip(null, traduire('Toutes'))}
          {GROUPES.map((g) => chip(g.id, g.label))}
        </ScrollView>
      </View>

      <FlatList
        data={liste}
        key={`grille-${tile}`}
        numColumns={2}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 30, gap: 16 }}
        ListHeaderComponent={
          <Pressable onPress={() => setPhoto(true)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 60, borderRadius: 18, paddingHorizontal: 16, marginBottom: 2, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.primaryPressed : c.primary })}>
            <CameraGlyph color={c.onPrimary} />
            <View style={{ flex: 1 }}>
              <Ink size={16} weight="extraBold" color={c.onPrimary} numberOfLines={1}>{traduire("Prendre la machine en photo")}</Ink>
              <Ink size={12} color={c.onPrimary} numberOfLines={1} style={{ opacity: 0.85 }}>{traduire("Ton IA la reconnaît pour toi")}</Ink>
            </View>
            <Icon name="chevron" size={18} color={c.onPrimary} />
          </Pressable>
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center', gap: 6 }}>
            <Ink size={15} color={c.textSecondary}>{traduire("Aucune machine ne correspond.")}</Ink>
            <Ink size={13} color={c.textMuted}>{traduire("Essaie un autre nom, ou prends-la en photo.")}</Ink>
          </View>
        }
        ListFooterComponent={
          liste.length ? (
            <Ink size={12} color={c.textMuted} style={{ textAlign: 'center', marginTop: 6 }}>
              {traduire("{0} machines illustrées sur {1}, les autres arrivent.", nbIllus, MACHINES.length)}</Ink>
          ) : null
        }
        renderItem={({ item }) => carte(item)}
      />
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={fermer}>
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: 18 }}>
        {choix ? (
          <>
            {entete(traduire('Ta machine'), () => setChoix(null))}
            {vueChoix(choix)}
          </>
        ) : photo ? (
          <>
            {entete('En photo', () => setPhoto(false))}
            {vuePhoto()}
          </>
        ) : (
          <>
            {entete(traduire('Trouve ta machine'))}
            {vueListe()}
          </>
        )}
      </View>
    </Modal>
  );
}

/** bouton d'entree, partage par la saisie muscu et la dictee */
export function MachineFinderButton({ onPress }: { onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}>
      <CameraGlyph color={c.accent} size={20} />
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={15} weight="extraBold" numberOfLines={1}>{traduire("Trouve ta machine")}</Ink>
        <Ink size={12} color={c.textMuted} numberOfLines={1}>{traduire("En image, ou prends-la en photo")}</Ink>
      </View>
      <Icon name="chevron" size={16} color={c.textMuted} />
    </Pressable>
  );
}
