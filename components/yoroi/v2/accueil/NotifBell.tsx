/**
 * Cloche de l'accueil : ouvre le centre de notifications (tout ce que YOROI t'a envoye).
 * Une pastille de couleur compte les messages pas encore lus ; elle se met a jour a chaque retour sur l'accueil.
 * Remise depuis l'ancien accueil (NotificationBellPopup).
 * Vague 35 : une toute petite cloche (rond de 24 tres translucide) a cote de la lanterne, en haut a gauche,
 * jamais sur le personnage ; un simple point de couleur remplace la pastille avec le chiffre.
 * 16 octobre nuit (Houari) : le point est rouge (alerte, usage autorise du rouge), plus bleu ni dore,
 * avec un fin liseré clair pour rester visible sur une scene sombre.
 */
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getUnreadCount } from '@/lib/notificationHistoryService';
import { useYoroiTheme } from '@/components/yoroi';
import { Icon, Press } from './kit';
import { traduirePluriel } from '@/lib/i18n/tr';

export function NotifBell({ sceneSombre = false }: { sceneSombre?: boolean }) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const { theme } = useYoroiTheme();

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getUnreadCount()
        .then((n) => {
          if (alive) setUnread(n > 0 ? n : 0);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  // vague 35 (21 h 11) : toute petite, presque cachee. Un rond de 24 tres translucide, un point de couleur s'il y a du nouveau
  const S = 24;
  const label = unread > 0 ? traduirePluriel(unread, unread > 1, "Notifications, {0} non lue", "Notifications, {0} non lues", unread) : 'Notifications';
  return (
    <Press onPress={() => router.push('/notification-center' as any)} accessibilityRole="button" accessibilityLabel={label} hitSlop={(44 - S) / 2}>
      <View style={{ width: S, height: S, borderRadius: S / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: sceneSombre ? 'rgba(14,17,26,0.22)' : 'rgba(255,255,255,0.32)' }}>
        <Icon name="bell" size={13} color={sceneSombre ? 'rgba(255,255,255,0.85)' : 'rgba(29,32,41,0.7)'} width={2.2} />
      </View>
      {unread > 0 ? <View style={{ position: 'absolute', right: 0, top: 0, width: 9, height: 9, borderRadius: 5, backgroundColor: theme.colors.record, borderWidth: 1.5, borderColor: '#FFFFFF' }} /> : null}
    </Press>
  );
}
