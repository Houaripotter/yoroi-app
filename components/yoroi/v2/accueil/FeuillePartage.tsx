/**
 * Feuille « Partager » de l'Accueil (15 octobre 2026), ouverte par le raccourci Partager de la rangee des outils.
 * Tes cartes du moment deja pretes, en vignettes (derniere seance, record ou palier, compteur de l'annee, semaine...),
 * un toucher = l'apercu en grand avec Enregistrer et Partager, Personnaliser, et le lien vers « Mes cartes ».
 * Les cartes sont lues par le raccourci (lib/v2/cartes/duMoment.ts) : la feuille s'ouvre sans attendre.
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { CarteApercu, CARTE_W, HAUTEURS } from '@/components/yoroi/v2/cartes/CarteRendu';
import { lienEditeur, nomCourt } from '@/components/yoroi/v2/cartes/FeuilleCarte';
import { useCarte } from '@/components/yoroi/v2/cartes/useCarte';
import { chiffresParDefaut } from '@/lib/v2/cartes/chiffres';
import type { CarteData } from '@/lib/v2/cartes/types';
import { traduire } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

const VIGNETTE = 118;

/** Lien vers l'atelier d'une carte, ou sa version de demonstration (copie web) */
function lien(d: CarteData, demo: boolean): string {
  if (!demo) return lienEditeur(d);
  const sport = d.famille === 'combat' ? 'combat' : d.famille === 'course' ? 'course' : '';
  return `/carte?demo=1&moment=${d.moment}${sport ? `&sport=${sport}` : ''}${d.exploit ? `&type=${d.exploit.type}` : ''}`;
}

export function FeuillePartage({ visible, onClose, cartes, nouvelles, demo = false }: { visible: boolean; onClose: () => void; cartes: CarteData[] | null; nouvelles: string[]; demo?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sel, setSel] = useState<CarteData | null>(null);

  const fermer = () => {
    onClose();
    setTimeout(() => setSel(null), 300);
  };
  // navigation directe (15 octobre 2026) : l'ecran s'ouvre tout de suite SOUS la feuille, qui glisse
  // et le devoile. Avant : la feuille se fermait, l'Accueil revenait, puis l'ecran arrivait 250 ms apres.
  const aller = (href: string) => {
    router.push(href as never);
    onClose();
    setTimeout(() => setSel(null), 300);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={sel ? () => setSel(null) : fermer} statusBarTranslucent>
      <Pressable onPress={fermer} accessibilityLabel={traduire("Fermer")} style={{ flex: 1, backgroundColor: 'rgba(15,16,20,0.45)' }} />
      <View style={{ backgroundColor: c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingBottom: insets.bottom + 14, gap: 12 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.fillSubtle }} />
        {sel ? (
          <Apercu key={sel.cle} data={sel} retour={() => setSel(null)} personnaliser={() => aller(lien(sel, demo))} />
        ) : (
          <Animated.View entering={FadeIn.duration(160)} style={{ gap: 12 }}>
            <View style={{ paddingHorizontal: 20, gap: 2 }}>
              <Ink size={22} weight="black" tight accessibilityRole="header">{traduire("Partager une carte")}</Ink>
              <Ink size={14} color={c.textSecondary}>{traduire("Tes cartes du moment, prêtes à poster.")}</Ink>
            </View>
            {cartes === null ? (
              <View style={{ height: VIGNETTE * 1.78 + 30, alignItems: 'center', justifyContent: 'center' }}>
                <ChargementPetit />
              </View>
            ) : cartes.length === 0 ? (
              <View style={{ marginHorizontal: 20, padding: 16, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
                <Ink size={14} color={c.textSecondary}>{traduire("Enregistre une séance ou une pesée : ta première carte arrive ici.")}</Ink>
              </View>
            ) : (
              <Vignettes cartes={cartes} nouvelles={nouvelles} onPress={setSel} />
            )}
            <Pressable
              onPress={() => aller(demo ? '/mes-cartes?demo=1' : '/mes-cartes')}
              accessibilityRole="button"
              accessibilityLabel={traduire("Mes cartes, toutes tes cartes")}
              style={({ pressed }) => ({ marginHorizontal: 20, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: pressed ? c.fillSoft : c.surface, borderWidth: 1, borderColor: c.border })}
            >
              <Icon name="grid" size={19} color={c.accent} />
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="extraBold">{traduire("Mes cartes")}</Ink>
                <Ink size={12} color={c.textSecondary} numberOfLines={1}>{traduire("Toutes tes cartes, tes réglages de partage")}</Ink>
              </View>
              <Icon name="chevron" size={16} color={c.textMuted} />
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

/** Les vignettes : une rangee qui defile, nom court dessous, un losange rouge sur les records, « Nouveau » sur ce qui vient d'arriver */
function Vignettes({ cartes, nouvelles, onPress }: { cartes: CarteData[]; nouvelles: string[]; onPress: (d: CarteData) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const k = useCarte(null);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingTop: 6, paddingBottom: 2 }}>
      {cartes.map((d) => {
        const neuve = nouvelles.includes(d.cle);
        return (
          <Pressable key={d.cle} onPress={() => onPress(d)} accessibilityRole="button" accessibilityLabel={neuve ? traduire("Carte {0}, nouvelle. Voir en grand", nomCourt(d)) : traduire("Carte {0}. Voir en grand", nomCourt(d))} style={({ pressed }) => ({ width: VIGNETTE, gap: 6, opacity: pressed ? 0.85 : 1 })}>
            <View>
              <CarteApercu largeur={VIGNETTE} data={d} options={{ ...k.options, format: 'story', chiffres: d.moment === 'exploit' ? [] : chiffresParDefaut(d, k.options.masque) }} visuels={k.visuelsPour(d)} />
              {neuve ? (
                <View style={{ position: 'absolute', top: -6, right: -4, height: 20, paddingHorizontal: 7, borderRadius: 10, justifyContent: 'center', backgroundColor: c.goldLight, borderWidth: 1.5, borderColor: c.background }}>
                  <Ink size={10.5} weight="extraBold" color="#1D2029" maxFontSizeMultiplier={1.2}>{traduire("Nouveau")}</Ink>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {d.exploit?.record ? <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: c.record, transform: [{ rotate: '45deg' }] }} /> : null}
              <Ink size={13} weight="extraBold" numberOfLines={2} style={{ flexShrink: 1, lineHeight: 16 }}>{nomCourt(d)}</Ink>
            </View>
            <Ink size={11.5} color={c.textSecondary} numberOfLines={1} style={{ marginTop: -4 }}>{d.sousTitre}</Ink>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** L'apercu en grand d'une carte : Enregistrer, Partager, Personnaliser */
function Apercu({ data, retour, personnaliser }: { data: CarteData; retour: () => void; personnaliser: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const k = useCarte(data);
  const [erreur, setErreur] = useState<string | null>(null);
  const onErreur = (titre: string, texte: string) => setErreur(`${titre}. ${texte}`);
  const H = HAUTEURS[k.options.format];
  // 17 octobre : l'apercu prend toute la hauteur laissee par l'en-tete et les boutons (environ 300 points)
  const carteH = Math.max(280, height - insets.top - insets.bottom - 300);
  const largeur = Math.min(width - 56, Math.round((carteH * CARTE_W) / H));
  return (
    <Animated.View entering={FadeIn.duration(160)} style={{ paddingHorizontal: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={retour} accessibilityRole="button" accessibilityLabel={traduire("Revenir à tes cartes")} hitSlop={8} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.surface, borderWidth: 1, borderColor: c.border })}>
          <Icon name="back" size={18} color={c.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Ink size={19} weight="black" tight numberOfLines={1} accessibilityRole="header">{nomCourt(data)}</Ink>
          <Ink size={12.5} color={c.textSecondary} numberOfLines={1}>{data.sousTitre}</Ink>
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <View style={{ borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
          <CarteApercu ref={k.ref} largeur={largeur} data={data} options={k.options} visuels={k.visuels} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={() => { setErreur(null); void k.enregistrer(onErreur); }}
          disabled={!!k.busy}
          accessibilityRole="button"
          accessibilityLabel={traduire("Enregistrer dans la pellicule")}
          style={({ pressed }) => ({ flex: 1, height: 54, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}
        >
          <Icon name={k.saved ? 'check' : 'download'} size={19} color={k.saved ? c.successText : c.ink} />
          <Ink size={16} weight="extraBold" color={k.saved ? c.successText : c.ink}>{k.busy === 'save' ? traduire('Un instant') : k.saved ? traduire('Enregistrée') : traduire('Enregistrer')}</Ink>
        </Pressable>
        <BoutonPrincipal
          onPress={() => { setErreur(null); void k.partager(onErreur); }}
          haptique="light"
          disabled={!!k.busy}
          accessibilityLabel={traduire("Partager la carte")}
          label={k.busy === 'share' ? traduire('Un instant') : traduire('Partager')}
          hauteur={54}
          tailleTexte={16}
          lignes={1}
          style={{ flex: 1.2 }}
          icone={(col) => <Icon name="share" size={19} color={col} />}
        />
      </View>
      {erreur ? <Ink size={13} weight="bold" color={c.danger}>{erreur}</Ink> : null}
      <Pressable onPress={personnaliser} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Ink size={15} weight="extraBold" color={c.accent}>{traduire("Personnaliser cette carte")}</Ink>
      </Pressable>
    </Animated.View>
  );
}
