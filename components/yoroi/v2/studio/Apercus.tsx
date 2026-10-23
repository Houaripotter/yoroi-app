/**
 * Studio, rubrique Apercus : l'onboarding ecran par ecran, les deux paywalls en apercu (aucun achat
 * possible, variantes forcees en memoire : lib/v2/creator/paywallVariant), la presentation 3.0 depuis
 * l'etape choisie, la bienvenue Premium et la demande de notification de l'essai, l'ecran de chargement,
 * les fenetres vues une seule fois a rearmer, la vue gratuite et le Premium createur.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, Row, ToggleRow } from '@/components/yoroi/v2/espace/ui';
import { usePremium } from '@/context/PremiumContext';
import { ONCE_WINDOWS, resetAllOnceWindows } from '@/lib/v2/creator/onceWindows';
import { PAYWALL_VARIANTS, setPaywallVariant, type PaywallVariant } from '@/lib/v2/creator/paywallVariant';
import { FREE_LIMITS } from '@/lib/v2/premium/limits';
import { VISITE_TITRES } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { ONBOARDING_SCREEN_LABELS } from './PreviewBar';
import { Chip, ChipWrap, KV, Note, SmallAction, StudioSection, SubTitle, useStudio } from './parts';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';

type Router = ReturnType<typeof useRouter>;

/** Page 0 a 16 de l'onboarding, en apercu (rien n'est enregistre) */
export function openOnboardingPreview(router: Router, page: number) {
  setPaywallVariant('reel');
  router.push({ pathname: '/onboarding', params: { preview: 'true', page: String(page) } } as never);
}

/** Paywall de l'app en apercu, avec la variante choisie */
export function openPaywallPreview(router: Router, variant: PaywallVariant = 'reel') {
  setPaywallVariant(variant);
  router.push('/paywall?preview=1' as never);
}

/** Visite guidee sur les vrais ecrans, depuis l'etape choisie, sans rien marquer comme vu */
export function openPresentation(router: Router, step = 0) {
  router.push(`/onboarding-tour?preview=1&step=${step}` as never);
}

const PAYWALL_PAGE = ONBOARDING_SCREEN_LABELS.length - 1;

export function Apercus() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { show } = useStudio();
  const { simulateFreeUser, setSimulateFreeUser, isPremium, hasActiveSubscription } = usePremium();
  const [variant, setVariant] = useState<PaywallVariant>('reel');
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const rearm = async (id: string) => {
    const w = ONCE_WINDOWS.find((x) => x.id === id);
    if (!w) return;
    try {
      await w.reset();
      setDone((prev) => new Set(prev).add(id));
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    } catch {
      appAlert('Oups', 'Cette fenêtre n’a pas pu être réarmée.');
    }
  };

  const rearmAll = async () => {
    setBusy(true);
    await resetAllOnceWindows();
    setDone(new Set(ONCE_WINDOWS.map((w) => w.id)));
    setBusy(false);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
  };

  const v = PAYWALL_VARIANTS.find((x) => x.id === variant) ?? PAYWALL_VARIANTS[0];
  const fmt = (n: number) => (Number.isFinite(n) ? String(n) : 'sans limite');

  return (
    <StudioSection
      id="apercus"
      icon="eye"
      title="Aperçus"
      sub="Onboarding, paywalls, présentation, chargement, fenêtres une fois"
      keywords="onboarding paywall abonnement premium nouveautes visite guidee tour presentation bienvenue notification essai chargement splash fenetre rearmer gratuit limites"
    >
      <Card style={{ padding: 14, gap: 10 }}>
        <Ink size={15} weight="extraBold">Onboarding, écran par écran</Ink>
        <ChipWrap>
          {ONBOARDING_SCREEN_LABELS.map((label, i) => (
            <Chip key={label} label={`${i + 1}. ${label}`} accessibilityLabel={`Ouvrir l’écran ${i + 1}, ${label}`} onPress={() => openOnboardingPreview(router, i)} />
          ))}
        </ChipWrap>
        <Note>Une barre en bas te fait passer d’un écran à l’autre, la croix ferme. Aucune réponse, pesée ou achat n’est enregistré.</Note>
      </Card>

      <Card style={{ padding: 14, gap: 10 }}>
        <Ink size={15} weight="extraBold">Paywall, en aperçu sans achat</Ink>
        <ChipWrap>
          {PAYWALL_VARIANTS.map((x) => (
            <Chip key={x.id} label={x.label} on={variant === x.id} onPress={() => setVariant(x.id)} />
          ))}
        </ChipWrap>
        <Ink size={13} color={c.textSecondary}>{v.sub}</Ink>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button tone="accent" small label="De l’app" onPress={() => openPaywallPreview(router, variant)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              tone="ghost"
              small
              label="De l’onboarding"
              onPress={() => {
                setPaywallVariant(variant);
                router.push({ pathname: '/onboarding', params: { preview: 'true', page: String(PAYWALL_PAGE) } } as never);
              }}
            />
          </View>
        </View>
        <Note>La variante vit en mémoire et ne s’applique qu’en aperçu : achat et restauration sont bloqués, le store n’est jamais appelé pour acheter. Sans offres du store (Expo Go, web), des prix d’exemple s’affichent avec un bandeau.</Note>
      </Card>

      <Card>
        <Row first icon="crown" label="Bienvenue Premium" sub="L’écran après l’achat, avec la fin de l’essai" onPress={() => openPaywallPreview(router, 'bienvenue')} />
        <Row icon="bell" label="Notification de l’essai" sub="« C’est parti » montre la demande du téléphone, sans rien programmer" onPress={() => openPaywallPreview(router, 'bienvenue')} />
        <Row icon="restore" label="Premium restauré" sub="L’écran après une restauration d’achat" onPress={() => openPaywallPreview(router, 'restaure')} />
      </Card>

      <Card style={{ padding: 14, gap: 10 }}>
        <Ink size={15} weight="extraBold">Visite guidée</Ink>
        <Ink size={13} color={c.textSecondary}>Elle remplace les nouveautés de la 3.0 : les vrais écrans, le doigt et la voix. Choisis l’étape de départ.</Ink>
        <ChipWrap>
          {VISITE_TITRES.map((t, i) => (
            <Chip key={t} label={`${i + 1}. ${t}`} accessibilityLabel={`Ouvrir la visite à l’étape ${i + 1}, ${t}`} onPress={() => openPresentation(router, i)} />
          ))}
        </ChipWrap>
        <Note>Rien n’est marqué comme vu : la vraie fenêtre reste armée si elle l’était.</Note>
      </Card>

      <Card>
        <Row first icon="spark" label="Écran de chargement" sub="EcranChargement en plein écran, touche pour rejouer" onPress={() => show({ kind: 'chargement' })} />
        <Row icon="grid" label="Petits indicateurs et états" sub="ChargementPetit, ChargementBloc, états vides, erreur simulée" onPress={() => router.push('/studio/etats' as never)} />
      </Card>

      <SubTitle>Fenêtres vues une seule fois</SubTitle>
      <Card>
        {ONCE_WINDOWS.map((w, i) => (
          <Row
            key={w.id}
            first={i === 0}
            label={w.label}
            sub={done.has(w.id) ? 'Réarmée, elle se remontrera' : w.sub}
            chevron={false}
            right={<SmallAction label={done.has(w.id) ? 'Fait' : 'Réarmer'} onPress={() => void rearm(w.id)} />}
          />
        ))}
      </Card>
      <View style={{ gap: 6 }}>
        <Button tone="ghost" icon="restore" label="Tout réarmer" onPress={() => void rearmAll()} loading={busy} />
        <Note>Aucune XP n’est touchée. L’accueil et le Dojo remontrent leurs fenêtres à la prochaine visite.</Note>
      </View>

      <SubTitle>Gratuit et Premium</SubTitle>
      <Card>
        <ToggleRow
          first
          icon="eye"
          label="Vue gratuite"
          sub={simulateFreeUser ? 'Tu vois les cadenas Premium comme un nouveau venu' : 'Voir l’app sans Premium, le temps du test'}
          value={simulateFreeUser}
          onChange={(on) => setSimulateFreeUser(on)}
        />
        <KV label="Courbes en gratuit" value={`${FREE_LIMITS.chartDays} jours`} />
        <KV label="Compétitions à venir" value={fmt(FREE_LIMITS.upcomingCompetitions)} />
        <KV label="Photos de progression" value={fmt(FREE_LIMITS.progressPhotos)} />
        <KV label="Records du carnet" value={fmt(FREE_LIMITS.carnetBenchmarks)} />
        <KV label="Techniques du carnet" value={fmt(FREE_LIMITS.carnetSkills)} />
      </Card>
      <Card>
        <KV
          first
          label="Premium créateur offert"
          value={simulateFreeUser ? 'Masqué par la vue gratuite' : isPremium ? (hasActiveSubscription ? 'Abonnement réel actif' : 'Actif, sans achat') : 'Inactif'}
        />
      </Card>
      <Note>Le mode créateur ouvre Premium sans aucun achat, tant que ton jeton est valide. Les limites viennent de lib/v2/premium/limits.ts, la seule source de l’app.</Note>
    </StudioSection>
  );
}

export default Apercus;
