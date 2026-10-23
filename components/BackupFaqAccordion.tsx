// ============================================
// BACKUP FAQ ACCORDION
// FAQ in-app pour expliquer le système de sauvegarde aux users.
// Accordéon pour ne pas encombrer visuellement.
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { traduire } from '@/lib/i18n/tr';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FaqItem {
  q: string;
  a: string;
}

const FAQ: FaqItem[] = [
  {
    q: traduire("À quoi sert une sauvegarde ?"),
    a: traduire("Elle protège toutes tes données (pesées, séances, photos, partenaires, records…) en cas de casse/perte/changement de téléphone. Tu peux tout retrouver à l'identique sur un nouveau device."),
  },
  {
    q: traduire("Comment ça marche automatiquement ?"),
    a: traduire("Yoroi crée un backup silencieux chaque jour à l'ouverture de l'app (si ça fait plus de 24h depuis le dernier). Si tu as configuré iCloud/Google Drive, il est auto-poussé vers le cloud. Zéro action de ta part."),
  },
  {
    q: traduire("Où sont stockés mes backups ?"),
    a: traduire("• Localement sur ton téléphone (10 derniers gardés)\n• Dans ton iCloud Drive ou Google Drive si configuré\n• Jamais sur des serveurs externes, tes données restent à toi."),
  },
  {
    q: traduire("Mes photos sont-elles vraiment dans le backup ?"),
    a: traduire("Oui, toutes les photos (profil, clubs, transformation, sparring partners, avatars custom…) sont converties en base64 et incluses dans le fichier JSON. Tu retrouves tout à l'identique à la restauration."),
  },
  {
    q: traduire("Puis-je utiliser Yoroi sur iPhone ET iPad ?"),
    a: traduire("Oui. Quand les 2 devices sont proches (même WiFi ou Bluetooth), la sync est instantanée (peerSync). Sinon, via iCloud : le prochain device qui ouvre l'app voit le nouveau backup et propose de synchroniser."),
  },
  {
    q: traduire("Et pour passer d'iPhone à Android (ou inverse) ?"),
    a: traduire("Va dans « Mes sauvegardes » → « Migrer vers un autre appareil ». Crée un backup léger (sans photos, ~300 KB), envoie-le par email/WhatsApp, ouvre-le sur l'autre téléphone → import automatique."),
  },
  {
    q: traduire("Qu'est-ce que le chiffrement AES-256 ?"),
    a: traduire("Option pour protéger tes backups avec un mot de passe. Personne ne peut lire le fichier sans ce mot de passe, même s'il fuite. Utile si tu stockes tes backups sur un cloud public. Attention : si tu oublies le mot de passe, les backups chiffrés sont irrécupérables."),
  },
  {
    q: traduire("Que se passe-t-il si j'importe un backup par erreur ?"),
    a: traduire("Une sauvegarde de sécurité est automatiquement créée JUSTE AVANT. Tu peux revenir en arrière en 1 tap via « Annuler la dernière restauration »."),
  },
  {
    q: traduire("Mes Apple Watch / Wear OS reçoivent-elles les infos ?"),
    a: traduire("Oui, automatiquement. Dès qu'une donnée change (pesée, séance, objectif), la montre reçoit la mise à jour en quelques secondes. Streak, stats du mois, dernière séance, etc."),
  },
  {
    q: traduire("Comment tester que mon backup marche ?"),
    a: traduire("Utilise « Tester un backup (dry-run) ». L'app vérifie qu'un fichier est valide SANS modifier tes données actuelles. Tu peux le faire à tout moment pour être rassuré."),
  },
];

const BackupFaqAccordionInner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => (prev === i ? null : i));
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1E1E22' : '#fff', borderColor: colors.border ?? '#E5E7EB' }]}>
      <View style={styles.header}>
        <HelpCircle size={18} color="#8B5CF6" />
        <Text style={[styles.title, { color: colors.text }]}>{traduire("Questions fréquentes")}</Text>
      </View>

      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <View key={i} style={[styles.item, i < FAQ.length - 1 && { borderBottomColor: colors.border ?? '#E5E7EB', borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <TouchableOpacity
              onPress={() => toggle(i)}
              activeOpacity={0.7}
              style={styles.itemHeader}
              accessibilityLabel={`Question : ${item.q}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
            >
              <Text style={[styles.question, { color: colors.text }]}>{item.q}</Text>
              {isOpen ? <ChevronUp size={16} color={colors.textMuted ?? '#888'} /> : <ChevronDown size={16} color={colors.textMuted ?? '#888'} />}
            </TouchableOpacity>
            {isOpen && (
              <Text style={[styles.answer, { color: colors.textMuted ?? '#666' }]}>
                {item.a}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
};

export const BackupFaqAccordion = React.memo(BackupFaqAccordionInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16, marginTop: 10, marginBottom: 16,
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10,
  },
  title: { fontSize: 14, fontWeight: '800' },
  item: {},
  itemHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12,
  },
  question: { flex: 1, fontSize: 13, fontWeight: '600' },
  answer: {
    fontSize: 12, lineHeight: 18,
    paddingBottom: 12, paddingRight: 24,
  },
});
