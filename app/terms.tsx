/**
 * Conditions d'utilisation (refonte v2) : integrees a l'app, meme design que la politique de confidentialite.
 * Texte simple et honnete, coherent avec l'app : donnees sur le telephone, abonnement via les stores.
 *
 * Editeur rempli le 18 octobre 2026 avec les mentions de KABUTO reprises du site INRO.
 */
import React from 'react';
import { Platform, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, EspaceScreen, Icon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { safeOpenURL } from '@/lib/security/validators';
import { FREE_LIMITS } from '@/lib/v2/premium/limits';
import APP_CONFIG from '@/lib/appConfig';
import { traduire } from '@/lib/i18n/tr';

const LAST_UPDATE = traduire('10 octobre 2026');
const CONTACT = 'yoroiapp@hotmail.com';

/**
 * EDITEUR : KABUTO, le nom du vendeur affiche sur l'App Store (verifie le 10 octobre 2026).
 * A COMPLETER PAR HOUARI (ne rien inventer) : le statut (forme juridique, SIRET) et l'adresse, par exemple
 * { nom: 'KABUTO', statut: 'SAS, SIRET ...', adresse: '...' }
 */
const EDITEUR: { nom: string; statut?: string; adresse?: string } | null = {
  nom: 'KABUTO',
  statut: 'SASU au capital de 1 000 euros, SIREN 109 094 649, RCS Marseille.',
  adresse: traduire('Siège social : 55 rue Grignan, 13006 Marseille, France.'),
};
const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const STORE = Platform.OS === 'android' ? 'Google Play' : 'App Store';

type Section = { title: string; icon: IconName; content: string[]; link?: { label: string; url: string } };

function sections(): Section[] {
  const editeur = EDITEUR
    ? [`YOROI est édité par ${EDITEUR.nom}.`, EDITEUR.statut, EDITEUR.adresse, `Contact : ${CONTACT}`].filter((l): l is string => Boolean(l))
    : [traduire("YOROI est édité par son créateur. Pour toute question : {0}", CONTACT)];
  return [
    {
      title: traduire('Éditeur'),
      icon: 'user',
      content: editeur,
    },
    {
      title: traduire('Ce que fait YOROI'),
      icon: 'dumbbell',
      content: [
        traduire('YOROI t’aide à suivre ton poids, tes mesures et tes séances de sport, avec un monde samouraï pour te motiver.'),
        traduire('En utilisant l’app, tu acceptes ces conditions. Si tu n’es pas d’accord, n’utilise pas l’app.'),
      ],
    },
    {
      title: traduire('Pas un avis médical'),
      icon: 'heart',
      content: [
        traduire('YOROI n’est pas un dispositif médical et ne remplace pas un médecin, un diététicien ou un coach.'),
        traduire('Les courbes, prédictions, plans de coupe et calculs de calories sont des estimations. Avant un régime, une coupe de poids ou un effort intense, demande l’avis d’un professionnel de santé.'),
        traduire('Tu restes seul responsable de ta pratique sportive et de ton alimentation.'),
      ],
    },
    {
      title: traduire('Tes données'),
      icon: 'save',
      content: [
        traduire('Tes données restent sur ton téléphone. YOROI n’a pas de serveur qui les reçoit.'),
        traduire('Si tu supprimes l’app sans sauvegarde, tes données sont perdues. Pense à exporter une sauvegarde depuis les réglages.'),
        traduire('Le détail est dans la politique de confidentialité.'),
      ],
    },
    {
      title: traduire('Version gratuite et Premium'),
      icon: 'crown',
      content: [
        traduire('Les pesées, les séances et les mesures restent gratuites, sans limite.'),
        traduire("La version gratuite a quelques limites, toujours annoncées à l’endroit concerné : tes courbes sur {0} mois au plus, un nombre limité de compétitions à venir et de photos de progression. Rien de ce que tu as déjà enregistré n’est caché ni supprimé.", Math.round(FREE_LIMITS.chartDays / 30)),
        traduire('YOROI Premium est un abonnement facultatif qui ajoute des fonctions. Le prix, la durée et un éventuel essai gratuit sont affichés dans l’app avant l’achat, tels que le store les fournit.'),
        traduire("Le paiement passe par ton compte {0}. YOROI n’a jamais accès à tes données bancaires.", STORE),
      ],
    },
    {
      title: traduire('Renouvellement et résiliation'),
      icon: 'calendar',
      content: [
        traduire('L’abonnement se renouvelle automatiquement à la fin de chaque période, sauf si tu le résilies au moins 24 heures avant.'),
        traduire('Si un essai gratuit est proposé, rien n’est débité pendant l’essai. Le premier paiement a lieu à la fin de l’essai, sauf si tu annules avant.'),
        traduire("Tu résilies à tout moment dans les réglages de ton compte {0}, rubrique abonnements. Supprimer l’app ne résilie pas l’abonnement.", STORE),
        traduire('Les remboursements sont gérés par le store, selon ses propres règles.'),
        traduire('Tu peux récupérer ton abonnement sur un nouveau téléphone avec le bouton Restaurer mes achats.'),
      ],
    },
    {
      title: traduire('Bon usage'),
      icon: 'shield',
      content: [
        traduire('L’app est pour ton usage personnel. Tu ne dois pas la copier, la revendre ni chercher à contourner l’abonnement.'),
        traduire('Les illustrations, textes et le design de YOROI restent la propriété de leur éditeur.'),
      ],
    },
    {
      title: traduire('Responsabilité'),
      icon: 'info',
      content: [
        traduire('YOROI est fourni tel quel. On fait de notre mieux pour qu’il marche bien, mais des erreurs ou des interruptions restent possibles.'),
        traduire('Les données venant d’Apple Santé, de Google Health Connect ou d’une balance connectée dépendent de ces services.'),
      ],
    },
    {
      title: traduire('Modifications'),
      icon: 'doc',
      content: [
        traduire('Ces conditions peuvent évoluer avec l’app. La date de mise à jour est indiquée en haut de cette page.'),
        traduire('Ces conditions sont régies par le droit français.'),
      ],
    },
    ...(Platform.OS === 'ios'
      ? [
          {
            title: traduire('Contrat de licence Apple'),
            icon: 'doc' as IconName,
            content: [traduire('Sur iPhone et iPad, le contrat de licence standard d’Apple pour les apps (EULA) s’applique aussi. Tu le trouves sur le site d’Apple, avec le lien ci-dessous.')],
            link: { label: traduire('Lire le contrat de licence Apple (EULA)'), url: APPLE_EULA_URL },
          },
        ]
      : []),
  ];
}

export default function TermsScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;

  return (
    <EspaceScreen title={traduire("Conditions")}>
      <View style={{ borderRadius: 22, backgroundColor: c.darkCard, padding: 20, gap: 8, overflow: 'hidden' }}>
        <Glyph kind="sakura" size={150} color="#242833" style={{ position: 'absolute', right: -24, top: -34 }} />
        <Ink size={26} weight="black" tight color={c.onDark}>{traduire("Conditions d’utilisation (EULA)")}</Ink>
        <Ink size={13} color={c.onDarkSecondary}>{traduire("Dernière mise à jour : {0}", LAST_UPDATE)}</Ink>
        <View style={{ alignSelf: 'flex-start', marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.goldLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Icon name="check" size={14} color={c.ink} stroke={3} />
          <Ink size={13} weight="extraBold">{traduire("Simples et sans piège")}</Ink>
        </View>
      </View>

      {sections().map((section, i) => (
        <Card key={section.title} style={{ padding: 16, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={section.icon} size={18} color={c.accent} />
            </View>
            <Ink size={17} weight="black" tight style={{ flex: 1 }}>{`${i + 1}. ${section.title}`}</Ink>
          </View>
          {section.content.map((line, idx) => (
            <Ink key={idx} size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{line}</Ink>
          ))}
          {section.link ? (
            <Ink size={14} weight="extraBold" color={c.indigo} style={{ textDecorationLine: 'underline' }} onPress={() => safeOpenURL(section.link!.url)} accessibilityRole="link">{traduire(section.link.label)}</Ink>
          ) : null}
        </Card>
      ))}

      <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name="mail" size={20} color={c.indigo} />
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={13} color={c.textMuted}>{traduire("Pour toute question")}</Ink>
          <Ink size={15} weight="extraBold" color={c.indigo} onPress={() => safeOpenURL(`mailto:${CONTACT}`)} accessibilityRole="link">{CONTACT}</Ink>
        </View>
      </Card>
      {/* 18 octobre 2026 : la version en ligne, sur yoroiapp.com */}
      <Ink size={14} weight="extraBold" color={c.indigo} style={{ textAlign: 'center', textDecorationLine: 'underline' }} onPress={() => void safeOpenURL(APP_CONFIG.site.conditions)} accessibilityRole="link">{traduire("Lire les conditions sur yoroiapp.com")}</Ink>
    </EspaceScreen>
  );
}
