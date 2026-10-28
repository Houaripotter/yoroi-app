/**
 * Sur le tapis (28 octobre 2026, maquette validee « le melange ») : tes pratiques en cartes, dans la rubrique menthe.
 * Une carte par sport pratique, avec son club (nom, logo importe) et, si le sport a des ceintures, ta ceinture
 * dessinee, le choix en medaillons (la rangee defile au dela de 5) et tes degres (barrette a cases et pastilles 0 a 4)
 * ou ton dan. Une carte ouverte a la fois. Ajouter, modifier, retirer une pratique ; choisir ta pratique principale.
 * Logos : un logo importe s'affiche toujours, les logos de marque fournis seulement en demo (logoAffiche).
 */
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { Sheet } from '@/components/yoroi/v2/espace/reglages/parts';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { STICKERS, useIllustrations } from '@/components/yoroi/v2/stickers';
import { logoAffiche, stickerDuSport } from '@/components/yoroi/v2/seances/MonthMarks';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { useModeDemo } from '@/lib/v2/demo/useModeDemo';
import { SPORTS, getSportName } from '@/lib/sports';
import type { Club } from '@/lib/database';
import { GAMMES, gammeDe, nomCeinture, regleGrade, texteGrade, titreCeinture, type CeintureId } from '@/lib/v2/profil/gammes';
import { ajouterPratique, choisirCeinture, choisirGrade, rendrePrincipale, retirerPratique, type EtatPratiques, type Pratique } from '@/lib/v2/profil/pratiques';
import { logger } from '@/lib/security/logger';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { CeintureNouee, GrandeBarrette } from './CeintureNouee';
import { LigneRubrique, Rubrique, teinteRubrique } from './Rubriques';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

const VERT = '#1C6B45';
const BOUTON = '#DCE3FF';
const BOUTON_TEXTE = '#23358F';

/** Nom du sport, traduit, sans trait d'union (« Jiu jitsu brésilien ») */
export function nomSport(id: string): string {
  return sansTiret(traduire(getSportName(id)));
}

/** Le logo a montrer pour un club : ton logo importe toujours, un logo de marque fourni seulement en demo */
export function logoDuClub(club: Club | undefined | null, demo: boolean): unknown {
  if (!club) return null;
  return logoAffiche({ clubLogo: club.logo_uri, clubNom: club.name, demo, parNom: demo });
}

function RondLogo({ src, sport, size = 44 }: { src: unknown; sport: string; size?: number }) {
  const { theme } = useYoroiTheme();
  const illus = useIllustrations();
  const [casse, setCasse] = useState(false);
  if (src && !casse) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF', overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border }}>
        <Image source={src as never} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setCasse(true)} accessibilityIgnoresInvertColors />
      </View>
    );
  }
  if (illus.stickers) return <Image source={STICKERS[stickerDuSport(sport)]} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={gammeDe(sport) ? 'belt' : 'dumbbell'} size={size * 0.48} />
    </View>
  );
}

function Medaillon({ id, on, size, onPress }: { id: CeintureId; on: boolean; size: number; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const nom = nomCeinture(id);
  return (
    <Pressable
      onPress={() => { selectionAsync().catch(() => {}); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={titreCeinture(id)}
      style={{ alignItems: 'center', gap: 5, width: size + 8 }}
    >
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: on ? VERT : '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: VERT, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
        <CeintureNouee ceinture={id} width={size - 12} ombre={false} />
        {on ? (
          <View style={{ position: 'absolute', right: -4, top: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: VERT, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={10} color="#FFFFFF" stroke={3.6} />
          </View>
        ) : null}
      </View>
      <Ink size={12} weight={on ? 'extraBold' : 'bold'} color={c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{nom}</Ink>
    </Pressable>
  );
}

function Pastille({ n, on, onPress, label }: { n: number; on: boolean; onPress: () => void; label: string }) {
  const { theme } = useYoroiTheme();
  return (
    <Pressable
      onPress={() => { selectionAsync().catch(() => {}); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      hitSlop={4}
      style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? BOUTON_TEXTE : '#FFFFFF' }}
    >
      <Ink size={13} weight="extraBold" color={on ? '#FFFFFF' : theme.colors.ink}>{String(n)}</Ink>
    </Pressable>
  );
}

function PetitBouton({ label, onPress, danger, icon, a11y }: { label: string; onPress: () => void; danger?: boolean; icon?: 'star' | 'trash' | 'plus'; a11y?: string }) {
  const { theme } = useYoroiTheme();
  const col = danger ? theme.colors.danger : BOUTON_TEXTE;
  return (
    <Pressable
      onPress={() => { selectionAsync().catch(() => {}); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: danger ? 'transparent' : BOUTON, opacity: pressed ? 0.7 : 1, flexShrink: 1 })}
    >
      {icon ? <Icon name={icon} size={15} color={col} stroke={2.4} /> : null}
      <Ink size={13} weight="extraBold" color={col} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1 }}>{label}</Ink>
    </Pressable>
  );
}

/** Ta ceinture et ton grade dans une pratique */
function EditeurCeinture({ p, onCeinture, onGrade }: { p: Pratique; onCeinture: (c: CeintureId) => void; onGrade: (n: number) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const g = gammeDe(p.sport)!;
  const regle = regleGrade(p.sport, p.ceinture);
  const n = p.degres ?? 0;
  const defile = g.ceintures.length > 5;
  const medaillons = g.ceintures.map((id) => <Medaillon key={id} id={id} on={p.ceinture === id} size={defile ? 50 : 52} onPress={() => onCeinture(id)} />);
  return (
    <View>
      <View style={{ marginTop: 12, height: 118, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F3FAF6' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', backgroundColor: '#D3EBDD' }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 2, alignItems: 'center' }}>
          <CeintureNouee ceinture={p.ceinture ?? 'blanche'} vide={!p.ceinture} degres={regle?.type === 'degres' ? n : 0} barrette={g.barrette} width={200} />
        </View>
      </View>
      <View style={{ marginTop: 10, marginHorizontal: 2, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <Ink size={18} weight="extraBold" numberOfLines={1} style={{ flexShrink: 1 }}>{p.ceinture ? titreCeinture(p.ceinture) : traduire('Choisis ta ceinture')}</Ink>
        <Ink size={13} weight="extraBold" color={VERT} numberOfLines={1} style={{ flexShrink: 0 }}>{traduire('{0} ceintures en {1}', g.ceintures.length, traduire(g.court))}</Ink>
      </View>
      {defile ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // la ceinture choisie reste visible quand la rangee defile (noire, marron...)
          contentOffset={{ x: Math.max(0, g.ceintures.indexOf(p.ceinture ?? 'blanche') * 64 - 120), y: 0 }}
          style={{ marginTop: 12, marginHorizontal: -12 }}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingTop: 4, paddingBottom: 2 }}
        >
          {medaillons}
        </ScrollView>
      ) : (
        <View style={{ marginTop: 12, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>{medaillons}</View>
      )}

      {p.ceinture && regle ? (
        <View style={{ marginTop: 14, backgroundColor: '#EEF7F2', borderRadius: 18, padding: 12 }}>
          {regle.type === 'degres' ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <GrandeBarrette n={n} max={regle.max} rouge={p.ceinture === 'noire'} onChange={onGrade} width={150} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Ink size={14} weight="extraBold">{texteGrade(p.sport, p.ceinture, n)}</Ink>
                  <Ink size={11.5} weight="bold" color={c.textSecondary}>{traduire('Touche une case de la barrette')}</Ink>
                </View>
              </View>
              <View style={{ marginTop: 10, flexDirection: regle.max > 4 ? 'column' : 'row', alignItems: regle.max > 4 ? 'stretch' : 'center', justifyContent: 'space-between', gap: 8 }}>
                <Ink size={12} weight="extraBold" color={c.textSecondary}>{traduire('Degrés')}</Ink>
                <View style={{ flexDirection: 'row', gap: 6, justifyContent: regle.max > 4 ? 'space-between' : 'flex-end' }}>
                  {Array.from({ length: regle.max + 1 }, (_, k) => (
                    <Pastille key={k} n={k} on={k === n} onPress={() => onGrade(k)} label={k === 0 ? traduire('Aucun degré') : k === 1 ? traduire('1 degré') : traduire('{0} degrés', k)} />
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <Ink size={14} weight="extraBold">{texteGrade(p.sport, p.ceinture, n)}</Ink>
                <Ink size={11.5} weight="bold" color={c.textSecondary}>{traduire('Ton dan sur la ceinture noire')}</Ink>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginHorizontal: -12 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}>
                {Array.from({ length: regle.max - regle.min + 1 }, (_, k) => k + regle.min).map((v) => (
                  <Pastille key={v} n={v} on={v === n} onPress={() => onGrade(v)} label={v === 1 ? traduire('1er dan') : traduire('{0}e dan', v)} />
                ))}
              </ScrollView>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function CartePratique({ p, club, ouverte, seule, onOuvrir, onCeinture, onGrade, onClub, onPrincipale, onRetirer }: {
  p: Pratique;
  club: Club | undefined;
  ouverte: boolean;
  seule: boolean;
  onOuvrir: () => void;
  onCeinture: (c: CeintureId) => void;
  onGrade: (n: number) => void;
  onClub: () => void;
  onPrincipale: () => void;
  onRetirer: () => void;
}) {
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const demo = useModeDemo();
  const g = gammeDe(p.sport);
  const logo = logoDuClub(club, demo);
  const nomClub = club?.name ?? p.clubNom ?? null;
  const regle = regleGrade(p.sport, p.ceinture);
  const t = teinteRubrique('menthe', isDark);
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 22, paddingHorizontal: 12, paddingTop: 10, paddingBottom: ouverte ? 4 : 10, shadowColor: VERT, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } }}>
      <Pressable
        onPress={() => { selectionAsync().catch(() => {}); onOuvrir(); }}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouverte }}
        accessibilityLabel={[nomSport(p.sport), nomClub, p.ceinture ? titreCeinture(p.ceinture) : null].filter(Boolean).join(', ')}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <RondLogo src={logo} sport={p.sport} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Ink size={15.5} weight="extraBold" numberOfLines={2}>{nomSport(p.sport)}</Ink>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {p.principale && !seule ? (
              <View style={{ paddingHorizontal: 7, height: 20, borderRadius: 10, backgroundColor: BOUTON, justifyContent: 'center', flexShrink: 0 }}>
                <Ink size={10.5} weight="extraBold" color={BOUTON_TEXTE}>{traduire('Principal')}</Ink>
              </View>
            ) : null}
            <Ink size={12.5} weight="bold" color={nomClub ? c.textSecondary : c.textMuted} numberOfLines={2} style={{ flexShrink: 1 }}>
              {nomClub ?? (g ? traduire('Ton club et ta ceinture') : traduire('Ajoute ton club'))}
            </Ink>
          </View>
        </View>
        {p.ceinture && !ouverte ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <CeintureNouee ceinture={p.ceinture} degres={regle?.type === 'degres' ? p.degres ?? 0 : 0} barrette={!!g?.barrette} width={50} ombre={false} />
            {regle?.type === 'dan' ? <Ink size={10.5} weight="extraBold" color={c.textSecondary}>{texteGrade(p.sport, p.ceinture, p.degres ?? 0)}</Ink> : null}
          </View>
        ) : null}
        <Icon name={ouverte ? 'up' : 'down'} size={15} color={c.textMuted} stroke={2.4} />
      </Pressable>

      {ouverte ? (
        <View>
          {g ? (
            <EditeurCeinture p={p} onCeinture={onCeinture} onGrade={onGrade} />
          ) : (
            <View style={{ marginTop: 10, borderRadius: 16, backgroundColor: '#EEF7F2', paddingHorizontal: 12, paddingVertical: 10 }}>
              <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduire('Pas de ceinture dans ce sport : ton club suffit.')}</Ink>
            </View>
          )}
          <View style={{ marginTop: 4 }}>
            <LigneRubrique
              sticker="tapis"
              icon="home"
              label={traduire('Ton club')}
              value={nomClub ?? traduire('À choisir')}
              muted={!nomClub}
              lignesValeur={2}
              onPress={onClub}
              ligne={t.ligne}
              first
              extra={logo ? <RondLogo src={logo} sport={p.sport} size={26} /> : undefined}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: p.principale || seule ? 'flex-end' : 'space-between', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderColor: t.ligne }}>
            {!p.principale && !seule ? <PetitBouton icon="star" label={traduire('Mon sport principal')} onPress={onPrincipale} /> : null}
            <PetitBouton icon="trash" danger label={traduire('Retirer')} a11y={traduire('Retirer ce sport')} onPress={onRetirer} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ============ feuilles ============

async function garderLogo(tempUri: string): Promise<string> {
  try {
    const ext = tempUri.split('.').pop()?.split('?')[0] ?? 'jpg';
    const dest = `${FileSystem.documentDirectory}club_logo_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    return dest;
  } catch (e) {
    logger.warn('Copie du logo de club impossible', e);
    return tempUri;
  }
}

function LigneChoix({ label, sub, onPress, sport, ceintures }: { label: string; sub?: string; onPress: () => void; sport: string; ceintures?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => { selectionAsync().catch(() => {}); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 56, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSoft : 'transparent' })}
    >
      <RondLogo src={null} sport={sport} size={36} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Ink size={15} weight="bold" numberOfLines={1}>{label}</Ink>
        {sub ? <Ink size={12} color={c.textMuted} numberOfLines={1}>{sub}</Ink> : null}
      </View>
      {ceintures ? <CeintureNouee ceinture="noire" width={40} ombre={false} /> : null}
      <Icon name="plus" size={16} color={BOUTON_TEXTE} stroke={2.6} />
    </Pressable>
  );
}

function Liste({ children }: { children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  return <View style={{ borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' }}>{children}</View>;
}

export function FeuilleAjoutSport({ visible, onClose, favoris, deja, onChoisir }: { visible: boolean; onClose: () => void; favoris: string[]; deja: string[]; onChoisir: (sport: string) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [q, setQ] = useState('');
  const avecCeintures = Object.keys(GAMMES);
  const tes = favoris.filter((s) => !deja.includes(s));
  const resultats = useMemo(() => {
    const k = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!k) return [];
    return SPORTS.filter((s) => s.id !== 'autre' && (nomSport(s.id).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(k) || s.id.includes(k))).slice(0, 14);
  }, [q]);
  const choisir = (s: string) => { setQ(''); onChoisir(s); };
  const ligne = (s: string) => <LigneChoix key={s} sport={s} label={nomSport(s)} sub={gammeDe(s) ? traduire('Ceinture et degrés') : undefined} ceintures={!!gammeDe(s)} onPress={() => choisir(s)} />;
  return (
    <Sheet visible={visible} onClose={() => { setQ(''); onClose(); }} title={traduire('Ajouter un sport')} subtitle={traduire('Chaque sport garde son club et sa ceinture.')}>
      <View style={{ height: 48, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }}>
        <Icon name="search" size={17} color={c.textMuted} />
        <TextInput value={q} onChangeText={setQ} placeholder={traduire('Cherche un sport')} placeholderTextColor={c.textMuted} style={{ flex: 1, fontSize: 16, color: c.ink }} accessibilityLabel={traduire('Cherche un sport')} autoCorrect={false} />
      </View>
      {q.trim() ? (
        <Liste>{resultats.length ? resultats.map((s) => ligne(s.id)) : <View style={{ padding: 16 }}><Ink size={14} color={c.textMuted}>{traduire('Aucun sport trouvé')}</Ink></View>}</Liste>
      ) : (
        <>
          {tes.length ? (
            <>
              <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('Tes sports')}</Ink>
              <Liste>{tes.map(ligne)}</Liste>
            </>
          ) : null}
          <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('Sports à ceintures')}</Ink>
          <Liste>{avecCeintures.map(ligne)}</Liste>
        </>
      )}
    </Sheet>
  );
}

export function FeuilleClub({ visible, onClose, p, club, clubs, onEnregistrer }: {
  visible: boolean;
  onClose: () => void;
  p: Pratique | null;
  club: Club | undefined;
  clubs: Club[];
  onEnregistrer: (o: { nom: string; logo: string | null; clubExistant?: number | null }) => Promise<void>;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const demo = useModeDemo();
  const [nom, setNom] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  React.useEffect(() => {
    if (!visible) return;
    setNom(club?.name ?? p?.clubNom ?? '');
    setLogo(club?.logo_uri ?? null);
  }, [visible, club, p]);
  if (!p) return null;
  const autres = clubs.filter((x) => x.id != null && x.id !== club?.id);
  const apercu = logo ? logoAffiche({ clubLogo: logo, clubNom: nom, demo, parNom: demo }) : null;

  const importer = async () => {
    try {
      const perm = await requestMediaLibraryPermissionsAsync();
      if (!perm.granted && (perm.status as string) !== 'limited') {
        appAlert(traduire('Autorisation nécessaire'), traduire('Autorise l’accès à tes photos dans les réglages.'));
        return;
      }
      const r = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!r.canceled && r.assets?.[0]) setLogo(await garderLogo(r.assets[0].uri));
    } catch (e) {
      logger.error('[Profil] logo du club', e);
    }
  };
  const valider = async (o: { nom: string; logo: string | null; clubExistant?: number | null }) => {
    if (occupe) return;
    setOccupe(true);
    try {
      await onEnregistrer(o);
      onClose();
    } catch (e) {
      logger.error('[Profil] club', e);
      appAlert(traduire('Oups'), traduire('Le club n’a pas pu être enregistré. Réessaie.'));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={traduire('Ton club')} subtitle={nomSport(p.sport)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable onPress={importer} accessibilityRole="button" accessibilityLabel={traduire('Importer le logo du club')} style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {apercu ? <Image source={apercu as never} style={{ width: 84, height: 84 }} resizeMode="cover" /> : <RondLogo src={null} sport={p.sport} size={50} />}
        </Pressable>
        <View style={{ flex: 1, gap: 8, alignItems: 'flex-start' }}>
          <PetitBouton icon="plus" label={logo ? traduire('Changer le logo') : traduire('Importer un logo')} onPress={importer} />
          {logo ? <PetitBouton danger icon="trash" label={traduire('Retirer le logo')} onPress={() => setLogo(null)} /> : null}
        </View>
      </View>
      <View style={{ height: 52, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, justifyContent: 'center', paddingHorizontal: 14 }}>
        <TextInput value={nom} onChangeText={setNom} placeholder={traduire('Nom du club')} placeholderTextColor={c.textMuted} maxLength={40} style={{ fontSize: 17, fontWeight: '700', color: c.ink }} accessibilityLabel={traduire('Nom du club')} />
      </View>
      <BoutonPrincipal label={traduire('Enregistrer')} onPress={() => valider({ nom, logo })} disabled={!nom.trim()} loading={occupe} lignes={1} />
      {autres.length ? (
        <>
          <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('Ou un de tes clubs')}</Ink>
          <Liste>
            {autres.map((x, i) => (
              <Pressable
                key={x.id}
                onPress={() => valider({ nom: x.name, logo: x.logo_uri ?? null, clubExistant: x.id })}
                accessibilityRole="button"
                accessibilityLabel={x.name}
                style={({ pressed }) => ({ minHeight: 54, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: i ? 1 : 0, borderColor: c.divider, backgroundColor: pressed ? c.fillSoft : 'transparent' })}
              >
                <RondLogo src={logoDuClub(x, demo)} sport={x.sport} size={34} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Ink size={15} weight="bold" numberOfLines={1}>{x.name}</Ink>
                  <Ink size={12} color={c.textMuted} numberOfLines={1}>{nomSport(String(x.sport ?? '').split(',')[0])}</Ink>
                </View>
              </Pressable>
            ))}
          </Liste>
        </>
      ) : null}
      {club || p.clubNom ? <PetitBouton danger label={traduire('Sans club')} onPress={() => valider({ nom: '', logo: null })} /> : null}
    </Sheet>
  );
}

// ============ la rubrique ============

export function TapisPratiques({ etat, clubs, ouverte, onOuvrir, changer, enregistrerClub, favoris }: {
  etat: EtatPratiques;
  clubs: Club[];
  ouverte: string | null;
  onOuvrir: (id: string | null) => void;
  changer: (fn: (e: EtatPratiques) => EtatPratiques) => Promise<void>;
  enregistrerClub: (id: string, o: { nom: string; logo: string | null; clubExistant?: number | null }) => Promise<void>;
  favoris: string[];
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [ajout, setAjout] = useState(false);
  const [clubDe, setClubDe] = useState<string | null>(null);
  const list = etat.pratiques;
  const clubDeP = (p: Pratique | undefined | null) => (p?.clubId != null ? clubs.find((x) => x.id === p.clubId) : undefined);
  const pClub = list.find((x) => x.id === clubDe) ?? null;
  const sous = list.length === 0
    ? traduire('Tes sports, tes clubs et tes ceintures')
    : list.length === 1
      ? nomSport(list[0].sport)
      : traduirePluriel(list.length, list.length > 1, '{0} sport pratiqué', '{0} sports pratiqués', list.length);

  const retirer = (p: Pratique) => {
    appAlert(
      traduire('Retirer {0} ?', nomSport(p.sport)),
      p.clubId != null ? traduire('Ton club et tes séances restent dans l’app.') : null,
      [
        { text: traduire('Annuler'), style: 'cancel' },
        { text: traduire('Retirer'), style: 'destructive', onPress: () => { changer((e) => retirerPratique(e, p.id)); if (ouverte === p.id) onOuvrir(null); } },
      ],
    );
  };

  return (
    <Rubrique teinte="menthe" titre={traduire('Sur le tapis')} sous={sous} padBas={14}>
      <View style={{ marginTop: 12, gap: 10 }}>
        {list.map((p) => (
          <CartePratique
            key={p.id}
            p={p}
            club={clubDeP(p)}
            seule={list.length === 1}
            ouverte={ouverte === p.id}
            onOuvrir={() => onOuvrir(ouverte === p.id ? null : p.id)}
            onCeinture={(ce) => changer((e) => ({ ...e, pratiques: choisirCeinture(e.pratiques, p.id, ce) }))}
            onGrade={(n) => changer((e) => ({ ...e, pratiques: choisirGrade(e.pratiques, p.id, n) }))}
            onClub={() => setClubDe(p.id)}
            onPrincipale={() => changer((e) => ({ ...e, pratiques: rendrePrincipale(e.pratiques, p.id) }))}
            onRetirer={() => retirer(p)}
          />
        ))}
        {list.length === 0 ? (
          <Ink size={13} weight="bold" color={c.textSecondary} style={{ marginHorizontal: 2 }}>{traduire('Ajoute chaque sport que tu pratiques, avec son club. JJB, judo, karaté et taekwondo gardent aussi ta ceinture.')}</Ink>
        ) : null}
        <Pressable
          onPress={() => { selectionAsync().catch(() => {}); setAjout(true); }}
          accessibilityRole="button"
          accessibilityLabel={traduire('Ajouter un sport')}
          style={({ pressed }) => ({ height: 50, borderRadius: 25, backgroundColor: BOUTON, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.8 : 1 })}
        >
          <Icon name="plus" size={17} color={BOUTON_TEXTE} stroke={2.6} />
          <Ink size={15} weight="extraBold" color={BOUTON_TEXTE}>{traduire('Ajouter un sport')}</Ink>
        </Pressable>
      </View>

      <FeuilleAjoutSport
        visible={ajout}
        onClose={() => setAjout(false)}
        favoris={favoris}
        deja={list.map((p) => p.sport)}
        onChoisir={(s) => {
          setAjout(false);
          let nid = '';
          changer((e) => {
            const r = ajouterPratique(e.pratiques, s);
            nid = r.id;
            return { ...e, pratiques: r.list };
          }).then(() => nid && onOuvrir(nid));
        }}
      />
      <FeuilleClub visible={!!pClub} onClose={() => setClubDe(null)} p={pClub} club={clubDeP(pClub)} clubs={clubs} onEnregistrer={(o) => enregistrerClub(pClub!.id, o)} />
    </Rubrique>
  );
}
