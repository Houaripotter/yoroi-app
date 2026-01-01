// ============================================
// 🧪 MINIMAL TEST - Copy this to test quickly
// ============================================

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking } from 'react-native';
import eventsData from '@/src/data/events.json';

export default function EventsTestScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Events Test ({eventsData.length} events)
      </Text>

      <FlatList
        data={eventsData.slice(0, 20)} // Show first 20 events only
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => Linking.openURL(item.registration_link)}
            style={{
              padding: 16,
              marginBottom: 12,
              backgroundColor: '#F3F4F6',
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>
              📅 {item.date_start} • 📍 {item.location.city}, {item.location.country}
            </Text>
            <Text style={{ fontSize: 12, color: '#8B5CF6', marginTop: 4 }}>
              🏷️ {item.sport_tag.toUpperCase()} • {item.category.toUpperCase()}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
