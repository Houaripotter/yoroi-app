import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { Training } from './database';
import logger from '@/lib/security/logger';

export async function requestCalendarPermissions() {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission refusée',
      'Yoroi a besoin de la permission pour accéder à votre calendrier.'
    );
    return false;
  }
  return true;
}

export async function getOrCreateYoroiCalendar() {
  const hasPermission = await requestCalendarPermissions();
  if (!hasPermission) return null;

  try {
    // Chercher si le calendrier Yoroi existe déjà
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    logger.info('📅 Calendriers trouvés:', calendars.length);

    const yoroiCalendar = calendars.find(cal => cal.title === 'Yoroi Training');

    if (yoroiCalendar) {
      logger.info('✅ Calendrier Yoroi trouvé:', yoroiCalendar.id);
      return yoroiCalendar.id;
    }

    // Créer un nouveau calendrier Yoroi
    const defaultCalendar = calendars.find(
      cal => cal.allowsModifications && (cal.source.name === 'iCloud' || cal.source.type === 'caldav')
    );

    if (!defaultCalendar) {
      // Essayer avec le premier calendrier modifiable
      const modifiableCalendar = calendars.find(cal => cal.allowsModifications);

      if (!modifiableCalendar) {
        Alert.alert('Erreur', 'Impossible de trouver un calendrier modifiable.');
        return null;
      }

      const newCalendarId = await Calendar.createCalendarAsync({
        title: 'Yoroi Training',
        color: '#8B5CF6',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: modifiableCalendar.source.id,
        source: modifiableCalendar.source,
        name: 'yoroi-training',
        ownerAccount: modifiableCalendar.source.name,
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });

      logger.info('✅ Nouveau calendrier Yoroi créé:', newCalendarId);
      return newCalendarId;
    }

    const newCalendarId = await Calendar.createCalendarAsync({
      title: 'Yoroi Training',
      color: '#8B5CF6',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendar.source.id,
      source: defaultCalendar.source,
      name: 'yoroi-training',
      ownerAccount: defaultCalendar.source.name,
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    logger.info('✅ Nouveau calendrier Yoroi créé:', newCalendarId);
    return newCalendarId;
  } catch (error) {
    logger.error('❌ Erreur création calendrier:', error);
    Alert.alert('Erreur', 'Impossible de créer le calendrier Yoroi.');
    return null;
  }
}

export async function exportTrainingToCalendar(
  training: Training,
  clubName: string,
  sessionTypes?: string[],
  muscles?: string[],
  technicalTheme?: string
) {
  const calendarId = await getOrCreateYoroiCalendar();
  if (!calendarId) return null;

  try {
    // Créer la date/heure de début
    const startTime = training.start_time ?? '09:00';
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date(training.date);
    startDate.setHours(hours, minutes, 0, 0);

    // Calculer la date de fin
    const durationMinutes = training.duration_minutes ?? 60;
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + durationMinutes);

    // Construire la description
    let description = `🏋️ Séance de ${training.sport}\n`;
    description += `🏢 Club: ${clubName}\n`;
    description += `⏱️ Durée: ${durationMinutes} minutes\n`;

    if (sessionTypes && sessionTypes.length > 0) {
      description += `📝 Type: ${sessionTypes.join(', ')}\n`;
    }

    if (muscles && muscles.length > 0) {
      description += `💪 Muscles: ${muscles.join(', ')}\n`;
    }

    if (technicalTheme) {
      description += `🥋 Thème: ${technicalTheme}\n`;
    }

    if (training.notes) {
      description += `\n📋 Notes: ${training.notes}`;
    }

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `🔥 ${clubName} - ${training.sport}`,
      startDate,
      endDate,
      location: clubName,
      notes: description,
      alarms: [{ relativeOffset: -30 }], // Rappel 30 min avant
    });

    logger.info('✅ Événement créé:', eventId);
    return eventId;
  } catch (error) {
    logger.error('❌ Erreur export calendrier:', error);
    throw error;
  }
}

export async function exportMultipleTrainingsToCalendar(sessions: any[]) {
  const calendarId = await getOrCreateYoroiCalendar();
  if (!calendarId) return;

  let successCount = 0;
  let errorCount = 0;

  for (const session of sessions) {
    try {
      // Construire un objet Training à partir de SessionDetail
      const training: Training = {
        id: session.id || 0,
        date: '', // Sera défini dans exportTrainingToCalendar
        club_id: session.clubId,
        sport: session.sport,
        session_types: JSON.stringify(session.sessionTypes),
        start_time: session.startTime,
        duration_minutes: session.duration,
        muscles: undefined,
        technical_theme: session.details,
        notes: session.note,
        created_at: new Date().toISOString(),
      };

      await exportTrainingToCalendar(
        training,
        session.clubName,
        session.sessionTypes,
        [],
        session.details
      );
      successCount++;
    } catch (error) {
      logger.error('Erreur export séance:', error);
      errorCount++;
    }
  }

  if (errorCount === 0) {
    Alert.alert(
      '✅ Export terminé',
      `${successCount} séance(s) exportée(s) vers iCloud Calendar.`
    );
  } else {
    Alert.alert(
      '⚠️ Export terminé avec erreurs',
      `${successCount} séance(s) exportée(s).\n${errorCount} erreur(s).`
    );
  }
}
