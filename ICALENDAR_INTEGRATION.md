# Intégration du Calendrier iCloud dans Yoroi

## 📅 Export vers iCloud Calendar

Oui, c'est **totalement possible** d'exporter les séances vers le calendrier iCloud ! Voici comment faire :

## 🛠️ Étapes d'implémentation

### 1. Installer la librairie expo-calendar

```bash
npx expo install expo-calendar
```

### 2. Demander les permissions dans Info.plist (déjà ajouté normalement)

```xml
<key>NSCalendarsUsageDescription</key>
<string>Yoroi a besoin d'accéder à votre calendrier pour exporter vos séances d'entraînement.</string>
```

### 3. Créer un service pour gérer le calendrier

Créer `lib/calendarService.ts` :

```typescript
import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { Training } from './database';

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

  // Chercher si le calendrier Yoroi existe déjà
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const yoroiCalendar = calendars.find(cal => cal.title === 'Yoroi Training');

  if (yoroiCalendar) {
    return yoroiCalendar.id;
  }

  // Créer un nouveau calendrier Yoroi
  const defaultCalendar = calendars.find(
    cal => cal.allowsModifications && cal.source.name === 'iCloud'
  );

  if (!defaultCalendar) {
    Alert.alert('Erreur', 'Impossible de trouver un calendrier iCloud.');
    return null;
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

  return newCalendarId;
}

export async function exportTrainingToCalendar(training: Training, clubName: string) {
  const calendarId = await getOrCreateYoroiCalendar();
  if (!calendarId) return;

  // Créer la date/heure de début
  const [hours, minutes] = training.start_time.split(':').map(Number);
  const startDate = new Date(training.date);
  startDate.setHours(hours, minutes, 0, 0);

  // Calculer la date de fin
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + training.duration_minutes);

  // Construire la description
  let description = `🏋️ Séance de ${training.sport}\\n`;
  description += `🏢 Club: ${clubName}\\n`;

  if (training.session_types) {
    try {
      const types = JSON.parse(training.session_types);
      description += `📝 Type: ${types.join(', ')}\\n`;
    } catch {}
  }

  if (training.muscles) {
    try {
      const muscles = JSON.parse(training.muscles);
      description += `💪 Muscles: ${muscles.join(', ')}\\n`;
    } catch {}
  }

  if (training.technical_theme) {
    description += `🥋 Thème: ${training.technical_theme}\\n`;
  }

  if (training.notes) {
    description += `\\n📋 Notes: ${training.notes}`;
  }

  try {
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `🔥 ${clubName} - ${training.sport}`,
      startDate,
      endDate,
      location: clubName,
      notes: description,
      alarms: [{ relativeOffset: -30 }], // Rappel 30 min avant
    });

    Alert.alert(
      '✅ Exporté !',
      'La séance a été ajoutée à votre calendrier iCloud.'
    );

    return eventId;
  } catch (error) {
    console.error('Erreur export calendrier:', error);
    Alert.alert('Erreur', "Impossible d'exporter la séance.");
  }
}

export async function exportAllTrainingsToCalendar(trainings: Training[], clubs: any[]) {
  const calendarId = await getOrCreateYoroiCalendar();
  if (!calendarId) return;

  let successCount = 0;

  for (const training of trainings) {
    const club = clubs.find(c => c.id === training.club_id);
    const clubName = club?.name || 'Activité libre';

    try {
      await exportTrainingToCalendar(training, clubName);
      successCount++;
    } catch (error) {
      console.error('Erreur export:', error);
    }
  }

  Alert.alert(
    '✅ Export terminé',
    `${successCount} séance(s) exportée(s) vers iCloud Calendar.`
  );
}
```

### 4. Ajouter le bouton d'export dans le modal de liste des séances

Dans `TimetableView.tsx`, ajouter un bouton "Exporter vers iCloud" dans le modal `showAllSessions` :

```typescript
import { exportTrainingToCalendar } from '@/lib/calendarService';

// Dans le modal, après la liste des séances et avant le bouton "Ajouter"
<TouchableOpacity
  style={[styles.exportButton, { backgroundColor: '#34C759' }]}
  onPress={async () => {
    for (const session of showAllSessions.sessions) {
      await exportTrainingToCalendar(session, session.clubName);
    }
  }}
>
  <Calendar size={20} color="#FFFFFF" />
  <Text style={styles.exportButtonText}>Exporter vers iCloud</Text>
</TouchableOpacity>
```

## 📱 Résultat

Après implémentation :
- ✅ Les séances s'exportent vers un calendrier "Yoroi Training" dans iCloud
- ✅ Tu vois tes entraînements dans l'app Calendrier iOS
- ✅ Synchronisation automatique sur tous tes appareils Apple
- ✅ Rappels 30 minutes avant chaque séance
- ✅ Toutes les informations (sport, type, muscles, thème, notes)

## 🎯 Complexité

- **Difficulté** : Facile à moyenne
- **Temps estimé** : 1-2 heures
- **Avantages** : Native iOS, synchronisation automatique
- **Inconvénients** : Nécessite les permissions calendrier

Tu veux que j'implémente ça maintenant ? 🚀
