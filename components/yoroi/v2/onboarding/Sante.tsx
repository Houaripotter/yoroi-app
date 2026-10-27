/**
 * Ecran « Relie Apple Sante » (ou Health Connect), 14 octobre 2026 : l'explication AVANT la fenetre du systeme.
 * Ce que YOROI lit, ce qu'il ecrit, et que rien ne quitte le telephone. Utilise par l'onboarding complet
 * et par le mini onboarding de la 3.0 (app/nouveautes.tsx). Refus ou « Plus tard » : la carte de l'Accueil
 * reviendra doucement (lib/v2/sante/demande.ts).
 */
import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { sticker, useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { MainButton, Shell, useColors } from './ui';
import type { Nav } from './types';
import { ecouterEtatSante, lireEtatSante } from '@/lib/v2/sante/importEtat';
import type { EtatSante } from '@/lib/v2/sante/importEtat';
import { texteImport } from '@/lib/v2/sante/connexion';
import { CATEGORIES_SANTE, resumeDemande } from '@/lib/v2/sante/typesSante';
import { traduire } from '@/lib/i18n/tr';

/** 27 octobre 2026 (refonte Pastel) : chaque bloc sur son pastel, avec son sticker (l'icone reste en Encre japonaise sans illustration) */
function Bloc({ icon, nom, titre, texte, ink, fond }: { icon: IconName; nom: NomSticker; titre: string; texte: string; ink: string; fond: string }) {
  const c = useColors();
  const illus = useIllustrations();
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: fond, borderRadius: 20, padding: 14 }}>
      {illus.stickers ? (
        <Image source={sticker(nom)} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={22} color={ink} />
        </View>
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Ink size={15} weight="black" color={ink}>{titre}</Ink>
        <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{texte}</Ink>
      </View>
    </View>
  );
}

/** Ce que dit l'ecran pendant la demande (14 octobre 2026, SANTE CONNEXION) */
export function texteEtape(e: EtatSante, nom: string): string | null {
  switch (e.connexion) {
    case 'fenetre':
      return `Fenêtre d’${nom === 'Apple Santé' ? 'Apple Santé' : 'Health Connect'} ouverte. Choisis, puis touche Autoriser.`;
    case 'verification':
      return 'Vérification de l’accès…';
    case 'import':
      return `C’est relié. ${texteImport(true, e.compte)}`;
    default:
      return null;
  }
}

export function Sante({ nav, busy, onConnect, onLater, platform = Platform.OS }: { nav: Nav; busy?: boolean; onConnect: () => void; onLater: () => void; platform?: string }) {
  const c = useColors();
  const [etape, setEtape] = useState<EtatSante>(lireEtatSante());
  useEffect(() => ecouterEtatSante(setEtape), []);
  const android = platform === 'android';
  const nom = android ? 'Health Connect' : 'Apple Santé';
  // Les memes categories que la fenetre du systeme (lib/v2/sante/typesSante.ts), sans chiffre trompeur
  const resume = resumeDemande(platform);
  const lit = android
    ? traduire('Ton poids et ta composition, tes pas, ton sommeil, ton cœur, l’eau et les repas, et les séances de ta montre.')
    : traduire("{0}. Les séances de ton Apple Watch ou de ta montre, avec leurs tracés.", resume.categories.map((x) => CATEGORIES_SANTE[x.cat].label).join(', '));
  return (
    <Shell
      {...nav}
      title={traduire('Dernière étape : relie **{0}**', nom)}
      sub={traduire("Ton suivi se remplit tout seul : tes pesées, tes pas, ton sommeil, ton cœur et les séances de ta montre arrivent sans rien saisir.")}
      gap={12}
      footer={
        <>
          <MainButton label={traduire("Autoriser l’accès")} onPress={onConnect} loading={busy} />
          <Pressable onPress={onLater} disabled={busy} accessibilityRole="button" accessibilityLabel={traduire("Plus tard")} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={15} weight="bold" color={c.textSecondary}>{traduire("Plus tard")}</Ink>
          </Pressable>
        </>
      }
    >
      {/* ce qui arrive tout seul, en stickers */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, paddingVertical: 2 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {(['activite', 'coeur', 'sommeil', 'balance', 'sante_appareils'] as NomSticker[]).map((n, i) => (
          <Image key={n} source={sticker(n)} style={{ width: 58, height: 58, transform: [{ rotate: `${[-8, 5, -4, 7, -5][i]}deg` }] }} resizeMode="contain" accessibilityIgnoresInvertColors />
        ))}
      </View>
      <Bloc icon="download" nom="sante_appareils" titre={traduire("Ce que YOROI lit")} texte={lit} ink="#23358F" fond="#E8ECFF" />
      <Bloc icon="upload" nom="coeur" titre={traduire("Ce que YOROI écrit")} texte={traduire("Tes pesées et ta masse grasse, ton eau, ton sommeil noté à la main et les séances que tu notes dans YOROI.")} ink="#1C6B45" fond="#E3F2EA" />
      <Bloc icon="shield" nom="cle" titre={traduire("Rien ne quitte ton téléphone")} texte={traduire("Pas de compte, pas de serveur : tout reste entre YOROI et Santé, sur ce téléphone.")} ink="#8A3F78" fond="#EFE6F3" />
      <Ink size={13} color={c.textSecondary} style={{ lineHeight: 19, paddingHorizontal: 2 }}>
        {android
          ? traduire('Dans la fenêtre qui suit, active ce que tu veux partager. Tu pourras changer d’avis dans Health Connect.')
          : traduire("Dans la fenêtre qui suit, touche « Tout activer », ou choisis une par une ({0} en lecture, {1} en écriture). Tu pourras changer d’avis dans l’app Santé.", resume.lecture, resume.ecriture)}
      </Ink>
      {busy && texteEtape(etape, nom) ? (
        <Ink size={14} weight="bold" color={c.accent} style={{ lineHeight: 20, paddingHorizontal: 2 }} accessibilityLiveRegion="polite">
          {texteEtape(etape, nom)}
        </Ink>
      ) : null}
    </Shell>
  );
}

export default Sante;
